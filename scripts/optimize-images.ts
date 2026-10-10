// Builds the web-ready images from the originals in assets/source/.
// Run by hand with `bun run assets` and commit the outputs; the build never needs sharp.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp, { type Sharp } from "sharp";

const root = join(import.meta.dir, "..");
const source = join(root, "assets", "source");
const images = join(root, "public", "images");
const icons = join(root, "public", "icons");

/** Solid brand blue behind the maskable icon. */
const BRAND_BLUE = { r: 0x30, g: 0x48, b: 0x8a, alpha: 1 };

const written: string[] = [];

async function save(pipeline: Sharp, path: string): Promise<void> {
  await pipeline.toFile(path);
  written.push(path);
}

/** Reads the largest frame of an ICO file as an image buffer sharp can decode. */
async function largestIcoFrame(path: string): Promise<{ data: Buffer; size: number }> {
  const ico = await readFile(path);
  const count = ico.readUInt16LE(4);
  let best = { size: 0, offset: 0, length: 0 };
  for (let i = 0; i < count; i++) {
    const entry = 6 + i * 16;
    const size = ico[entry] || 256;
    if (size > best.size) {
      best = { size, length: ico.readUInt32LE(entry + 8), offset: ico.readUInt32LE(entry + 12) };
    }
  }
  const data = ico.subarray(best.offset, best.offset + best.length);
  // Only PNG-encoded frames are supported; the large frame of a modern ICO always is.
  if (data.readUInt32BE(0) !== 0x89504e47) throw new Error(`${path}: largest frame isn't a PNG`);
  return { data, size: best.size };
}

/** Packs PNG frames into an ICO file (PNG-in-ICO, supported by every current browser). */
function encodeIco(frames: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach(({ size, png }, i) => {
    const entry = 6 + i * 16;
    header[entry] = size >= 256 ? 0 : size;
    header[entry + 1] = size >= 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4); // color planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...frames.map((f) => f.png)]);
}

const resize = (size: number) => ({ width: size, height: size, kernel: sharp.kernel.lanczos3 });

await mkdir(images, { recursive: true });
await mkdir(icons, { recursive: true });

// Icons, from the largest frame of the original favicon.
const logo = await largestIcoFrame(join(source, "favicon.ico"));
const icon = (size: number) => sharp(logo.data).resize(resize(size)).png({ compressionLevel: 9 });

const frames = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, png: await icon(size).toBuffer() })),
);
await writeFile(join(root, "public", "favicon.ico"), encodeIco(frames));
written.push(join(root, "public", "favicon.ico"));

for (const size of [32, 64, 128, 256]) await save(icon(size), join(icons, `logo-${size}.png`));
await save(icon(180), join(icons, "apple-touch-icon.png"));
await save(icon(192), join(icons, "icon-192.png"));
await save(icon(512), join(icons, "icon-512.png"));

// Maskable: the logo inside the 80% safe zone, on brand blue.
const inner = Math.round(512 * 0.72);
await save(
  sharp({ create: { width: 512, height: 512, channels: 4, background: BRAND_BLUE } })
    .composite([
      { input: await sharp(logo.data).resize(resize(inner)).png().toBuffer(), gravity: "center" },
    ])
    .png({ compressionLevel: 9 }),
  join(icons, "icon-maskable-512.png"),
);

// Mica wallpapers: small, with the blur baked in so the page never runs a CSS filter.
for (const theme of ["dark", "light"] as const) {
  const name = theme === "dark" ? "bgDark.avif" : "bgLight.avif";
  const blurred = await sharp(join(source, name))
    .resize({ width: 960, kernel: sharp.kernel.lanczos3 })
    .blur(18)
    .toBuffer();
  await save(sharp(blurred).avif({ quality: 50, effort: 9 }), join(images, `mica-${theme}.avif`));
  await save(sharp(blurred).webp({ quality: 70, effort: 6 }), join(images, `mica-${theme}.webp`));
}

if (logo.size < 512) {
  console.warn(`assets: the source logo is ${logo.size}px, so 512px icons are upscaled`);
}
for (const path of written) {
  const { size } = await Bun.file(path).stat();
  console.info(`${(size / 1024).toFixed(1).padStart(7)} KB  ${path.slice(root.length + 1)}`);
}

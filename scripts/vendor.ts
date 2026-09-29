// Copies the pinned proxy runtime bundles from node_modules into public/vendor/
// so they are served unmodified from our own origin.
import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

const root = join(import.meta.dir, "..");
const modules = join(root, "node_modules", "@mercuryworkshop");
const out = join(root, "public", "vendor");

const files: [from: string, to: string][] = [
  ["scramjet/dist/scramjet.js", "scramjet/scramjet.js"],
  ["scramjet/dist/scramjet.wasm", "scramjet/scramjet.wasm"],
  ["scramjet-controller/dist/controller.api.js", "controller/controller.api.js"],
  ["scramjet-controller/dist/controller.inject.js", "controller/controller.inject.js"],
  ["scramjet-controller/dist/controller.sw.js", "controller/controller.sw.js"],
  ["libcurl-transport/dist/index.js", "transports/libcurl.js"],
  ["epoxy-transport/dist/index.js", "transports/epoxy.js"],
];

await rm(out, { recursive: true, force: true });

for (const [from, to] of files) {
  const target = join(out, to);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(modules, from), target);
}

console.info(`vendor: copied ${files.length} files to public/vendor/`);

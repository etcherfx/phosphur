/** A letter and hue for placeholder avatars, derived from a URL's host (or the title as a fallback). */
export function monogram(url: string, title = ""): { letter: string; hue: number } {
  let source = title;
  try {
    source = new URL(url).hostname.replace(/^www\./, "") || title;
  } catch {
    // Not a URL; use the title.
  }
  const letter = (source.match(/[\p{L}\p{N}]/u)?.[0] ?? "?").toUpperCase();
  let hash = 0;
  for (const char of source) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return { letter, hue: hash % 360 };
}

/** The host shown under bookmark tiles and history rows. */
export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

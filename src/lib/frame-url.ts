/**
 * Recovers the real URL from a proxied frame location (`<prefix><encoded url>?<sj params>#<encoded hash>`).
 * Mirrors Scramjet's `unrewriteUrl`: the encoded URL never contains a raw `?` or `#`,
 * so both delimit Scramjet's own additions. Returns null when the location isn't under the prefix.
 */
export function decodeFrameUrl(
  location: string,
  prefix: string,
  decode: (encoded: string) => string,
): string | null {
  if (!location.startsWith(prefix)) return null;
  const rest = location.slice(prefix.length);
  const hashAt = rest.indexOf("#");
  const beforeHash = hashAt === -1 ? rest : rest.slice(0, hashAt);
  const encodedUrl = beforeHash.split("?")[0];
  if (!encodedUrl) return null;
  try {
    const url = decode(encodedUrl);
    const hash = hashAt === -1 ? "" : decode(rest.slice(hashAt + 1));
    return hash ? `${url}#${hash}` : url;
  } catch {
    return null;
  }
}

/** Builds the proxied location for a real http(s) URL, the inverse of `decodeFrameUrl`. */
export function encodeFrameUrl(
  url: string,
  prefix: string,
  encode: (url: string) => string,
): string {
  const hashAt = url.indexOf("#");
  if (hashAt === -1) return prefix + encode(url);
  const hash = url.slice(hashAt + 1);
  return prefix + encode(url.slice(0, hashAt)) + (hash ? `#${encode(hash)}` : "");
}

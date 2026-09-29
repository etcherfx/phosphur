import { describe, expect, test } from "bun:test";
import { decodeFrameUrl, encodeFrameUrl } from "../../src/lib/frame-url.ts";

const prefix = "http://localhost:8080/~/sj/ctrl1234/frame567/";
const decode = decodeURIComponent;

describe("frame URLs", () => {
  test("decodes the real URL from a frame location", () => {
    expect(decodeFrameUrl(`${prefix}https%3A%2F%2Fexample.com%2Fa%3Fb%3Dc`, prefix, decode)).toBe(
      "https://example.com/a?b=c",
    );
  });

  test("drops Scramjet's query params and decodes the hash", () => {
    const location = `${prefix}https%3A%2F%2Fexample.com%2F?sj-referrer=x#section%201`;
    expect(decodeFrameUrl(location, prefix, decode)).toBe("https://example.com/#section 1");
  });

  test("returns null outside the prefix or for garbage", () => {
    expect(decodeFrameUrl("http://localhost:8080/", prefix, decode)).toBeNull();
    expect(decodeFrameUrl(prefix, prefix, decode)).toBeNull();
    expect(decodeFrameUrl(`${prefix}%E0%A4%A`, prefix, decode)).toBeNull();
  });

  test("round-trips through encodeFrameUrl", () => {
    const urls = ["https://example.com/", "https://example.com/p?q=1#frag", "http://127.0.0.1:3000/x"];
    for (const url of urls) {
      const encoded = encodeFrameUrl(url, prefix, encodeURIComponent);
      expect(decodeFrameUrl(encoded, prefix, decode)).toBe(url);
    }
  });
});

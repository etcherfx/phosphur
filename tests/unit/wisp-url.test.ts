import { describe, expect, test } from "bun:test";
import { activeWispUrl, defaultWispUrl, validateWispUrl } from "../../src/lib/wisp-url.ts";

describe("wisp URLs", () => {
  test("accepts ws and wss", () => {
    expect(validateWispUrl("wss://wisp.example/wisp/")).toEqual({ ok: true, url: "wss://wisp.example/wisp/" });
    expect(validateWispUrl(" ws://localhost:8080/wisp/ ")).toEqual({
      ok: true,
      url: "ws://localhost:8080/wisp/",
    });
  });

  test("rejects other schemes, junk and credentials", () => {
    expect(validateWispUrl("https://wisp.example/").ok).toBe(false);
    expect(validateWispUrl("wisp.example").ok).toBe(false);
    expect(validateWispUrl("").ok).toBe(false);
    expect(validateWispUrl("wss://user:pw@wisp.example/").ok).toBe(false);
  });

  test("derives the instance endpoint from the page location", () => {
    expect(defaultWispUrl({ protocol: "https:", host: "phosphur.example" })).toBe("wss://phosphur.example/wisp/");
    expect(defaultWispUrl({ protocol: "http:", host: "localhost:8080" })).toBe("ws://localhost:8080/wisp/");
  });

  test("prefers a valid custom URL", () => {
    const location = { protocol: "http:", host: "localhost:8080" };
    expect(activeWispUrl("", location)).toBe("ws://localhost:8080/wisp/");
    expect(activeWispUrl("wss://other.example/wisp/", location)).toBe("wss://other.example/wisp/");
    expect(activeWispUrl("nonsense", location)).toBe("ws://localhost:8080/wisp/");
  });
});

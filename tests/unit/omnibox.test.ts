import { describe, expect, test } from "bun:test";
import { resolveInput } from "../../src/lib/omnibox.ts";

const DDG = "https://duckduckgo.com/?q=%s";

describe("resolveInput", () => {
  test("ignores blank input", () => {
    expect(resolveInput("   ", DDG)).toBeNull();
  });

  test("keeps full http(s) URLs", () => {
    expect(resolveInput("https://example.com/a?b=c#d", DDG)).toEqual({
      kind: "url",
      url: "https://example.com/a?b=c#d",
    });
    expect(resolveInput("  http://example.com  ", DDG)).toEqual({
      kind: "url",
      url: "http://example.com/",
    });
  });

  test("adds https:// to bare hosts with a dot", () => {
    expect(resolveInput("example.com", DDG)).toEqual({ kind: "url", url: "https://example.com/" });
    expect(resolveInput("en.wikipedia.org/wiki/Phosphor", DDG)).toEqual({
      kind: "url",
      url: "https://en.wikipedia.org/wiki/Phosphor",
    });
    expect(resolveInput("example.com:8443/x", DDG)).toEqual({
      kind: "url",
      url: "https://example.com:8443/x",
    });
  });

  test("uses http:// for localhost and IPs", () => {
    expect(resolveInput("localhost:3000", DDG)).toEqual({
      kind: "url",
      url: "http://localhost:3000/",
    });
    expect(resolveInput("localhost", DDG)).toEqual({ kind: "url", url: "http://localhost/" });
    expect(resolveInput("192.168.1.10", DDG)).toEqual({ kind: "url", url: "http://192.168.1.10/" });
    expect(resolveInput("127.0.0.1:8080/path", DDG)).toEqual({
      kind: "url",
      url: "http://127.0.0.1:8080/path",
    });
    expect(resolveInput("[::1]:8080", DDG)).toEqual({ kind: "url", url: "http://[::1]:8080/" });
  });

  test("opens internal pages", () => {
    expect(resolveInput("phosphur://settings", DDG)).toEqual({
      kind: "internal",
      url: "phosphur://settings",
    });
    expect(resolveInput("PHOSPHUR://History/", DDG)).toEqual({
      kind: "internal",
      url: "phosphur://history",
    });
    expect(resolveInput("phosphur://nope", DDG)).toEqual({
      kind: "internal",
      url: "phosphur://newtab",
    });
  });

  test("searches anything else", () => {
    expect(resolveInput("how do phosphors glow", DDG)).toEqual({
      kind: "search",
      url: "https://duckduckgo.com/?q=how%20do%20phosphors%20glow",
    });
    expect(resolveInput("phosphur", DDG)?.kind).toBe("search");
    expect(resolveInput("3.14", DDG)?.kind).toBe("search");
    expect(resolveInput("example.com is down?", DDG)?.kind).toBe("search");
    expect(resolveInput("ftp://example.com", DDG)?.kind).toBe("search");
  });

  test("uses a custom search template", () => {
    expect(resolveInput("a&b", "https://search.example/find?term=%s&lang=en")).toEqual({
      kind: "search",
      url: "https://search.example/find?term=a%26b&lang=en",
    });
  });
});

import { describe, expect, test } from "bun:test";
import { parseSession } from "../../src/lib/session.ts";

describe("session", () => {
  test("parses saved tabs and clamps the active index", () => {
    const stored = JSON.stringify({ urls: ["https://a.example/", "phosphur://settings"], active: 7 });
    expect(parseSession(stored)).toEqual({
      urls: ["https://a.example/", "phosphur://settings"],
      active: 1,
    });
  });

  test("drops unusable entries", () => {
    const stored = JSON.stringify({ urls: ["javascript:alert(1)", 4, "https://a.example/"] });
    expect(parseSession(stored)).toEqual({ urls: ["https://a.example/"], active: 0 });
    expect(parseSession(JSON.stringify({ urls: [] }))).toBeNull();
    expect(parseSession("oops")).toBeNull();
    expect(parseSession(null)).toBeNull();
  });
});

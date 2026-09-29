import { describe, expect, test } from "bun:test";
import { HISTORY_CAP, overflow, planVisit } from "../../src/lib/history.ts";

const visit = (url: string, title = "") => ({ url, title, visitedAt: 1 });

describe("history", () => {
  test("adds the first visit and new URLs", () => {
    expect(planVisit(undefined, visit("https://a.example/"))).toBe("add");
    expect(planVisit(visit("https://a.example/"), visit("https://b.example/"))).toBe("add");
  });

  test("skips consecutive duplicates", () => {
    expect(planVisit(visit("https://a.example/", "A"), visit("https://a.example/", "A"))).toBe(
      "skip",
    );
    expect(planVisit(visit("https://a.example/", "A"), visit("https://a.example/"))).toBe("skip");
  });

  test("updates the title of a consecutive duplicate", () => {
    expect(planVisit(visit("https://a.example/"), visit("https://a.example/", "A"))).toBe(
      "update-title",
    );
  });

  test("caps the number of entries", () => {
    expect(HISTORY_CAP).toBe(5000);
    expect(overflow(4999)).toBe(0);
    expect(overflow(5000)).toBe(0);
    expect(overflow(5003)).toBe(3);
    expect(overflow(12, 10)).toBe(2);
  });
});

import { describe, expect, test } from "bun:test";
import { tabWidth } from "../../src/lib/tab-layout.ts";

const options = { min: 100, max: 240, gap: 2 };

describe("tabWidth", () => {
  test("gives every tab the maximum width while they fit", () => {
    expect(tabWidth(1200, 2, options)).toEqual({ width: 240, overflow: false });
    // 4 × 240 + 3 × 2 = 966 fits exactly.
    expect(tabWidth(966, 4, options)).toEqual({ width: 240, overflow: false });
  });

  test("shrinks all tabs evenly once they don't fit", () => {
    // (965 − 3 × 2) / 4 = 239.75, rounded down.
    expect(tabWidth(965, 4, options)).toEqual({ width: 239, overflow: false });
    expect(tabWidth(1000, 8, options)).toEqual({ width: 123, overflow: false });
  });

  test("clamps at the minimum and reports overflow", () => {
    // 10 × 100 + 9 × 2 = 1018 fits exactly; one pixel less doesn't.
    expect(tabWidth(1018, 10, options)).toEqual({ width: 100, overflow: false });
    expect(tabWidth(1017, 10, options)).toEqual({ width: 100, overflow: true });
    expect(tabWidth(300, 40, options)).toEqual({ width: 100, overflow: true });
  });

  test("handles no tabs and a single tab", () => {
    expect(tabWidth(800, 0, options)).toEqual({ width: 240, overflow: false });
    expect(tabWidth(800, 1, options)).toEqual({ width: 240, overflow: false });
    expect(tabWidth(150, 1, options)).toEqual({ width: 150, overflow: false });
    expect(tabWidth(60, 1, options)).toEqual({ width: 100, overflow: true });
  });

  test("counts one gap fewer than tabs", () => {
    const wide = { ...options, gap: 20 };
    // (500 − 2 × 20) / 3 = 153.33
    expect(tabWidth(500, 3, wide)).toEqual({ width: 153, overflow: false });
    expect(tabWidth(500, 3, { ...wide, gap: 0 })).toEqual({ width: 166, overflow: false });
    expect(tabWidth(0, 3, options)).toEqual({ width: 100, overflow: true });
  });
});

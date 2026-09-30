export interface TabLayoutOptions {
  /** Narrowest a tab gets before the strip scrolls instead. */
  min: number;
  /** Widest a tab gets, used whenever every tab fits at this width. */
  max: number;
  /** Space between neighbouring tabs. */
  gap: number;
}

export const TAB_LAYOUT: Readonly<TabLayoutOptions> = Object.freeze({ min: 100, max: 240, gap: 2 });

/**
 * Width for every tab in a strip `available` pixels wide: the maximum while they all fit,
 * then an even share, then the minimum with `overflow` set so the strip scrolls.
 */
export function tabWidth(
  available: number,
  count: number,
  { min, max, gap }: TabLayoutOptions = TAB_LAYOUT,
): { width: number; overflow: boolean } {
  if (count <= 0) return { width: max, overflow: false };
  // Whole pixels, so rounding can never push the last tab past the edge.
  const share = Math.floor((available - gap * (count - 1)) / count);
  if (share >= max) return { width: max, overflow: false };
  if (share >= min) return { width: share, overflow: false };
  return { width: min, overflow: true };
}

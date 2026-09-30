// Phosphur's shared Svelte transitions. Components use these instead of their own, so
// everything that enters or leaves moves the same way. Durations come from the
// --duration-* tokens in tokens.css, and every helper is instant under reduced motion.
import { flip as svelteFlip, type AnimationConfig } from "svelte/animate";
import { cubicIn, cubicInOut, cubicOut } from "svelte/easing";
import type { TransitionConfig } from "svelte/transition";

export type Speed = "fast" | "med" | "slow" | "intro";

/** Used when the tokens can't be read (e.g. before styles load); keep in step with tokens.css. */
const FALLBACK_MS: Record<Speed, number> = { fast: 120, med: 200, slow: 300, intro: 600 };

type Direction = "in" | "out" | "both";

export function prefersReducedMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A --duration-* token in milliseconds, or 0 under reduced motion. */
export function duration(speed: Speed): number {
  if (prefersReducedMotion()) return 0;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--duration-${speed}`)
    .trim();
  // The CSS minifier may rewrite 200ms as .2s.
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return FALLBACK_MS[speed];
  return raw.endsWith("ms") ? value : raw.endsWith("s") ? value * 1000 : value;
}

/** --ease-out when entering, --ease-in when leaving; movement uses cubicInOut (--ease-standard). */
function easingFor(direction: Direction | undefined): (t: number) => number {
  return direction === "out" ? cubicIn : cubicOut;
}

/**
 * A tab growing from nothing to its width as it opens, and shrinking away as it closes.
 * Uses the same curve and duration as the CSS width transition on the other tabs
 * (--ease-standard, slow), so the row's total width holds steady while they trade space.
 */
function tabWidth(node: HTMLElement): TransitionConfig {
  const style = getComputedStyle(node);
  const width = node.getBoundingClientRect().width;
  const left = parseFloat(style.paddingLeft);
  const right = parseFloat(style.paddingRight);
  return {
    duration: duration("slow"),
    easing: cubicInOut,
    css: (t) =>
      `width:${t * width}px;padding-left:${t * left}px;padding-right:${t * right}px;` +
      `opacity:${t};overflow:hidden`,
  };
}

export function tabOpen(node: HTMLElement): TransitionConfig {
  return tabWidth(node);
}

export function tabClose(node: HTMLElement): TransitionConfig {
  return tabWidth(node);
}

/** Menus, the Select popover and other small floating panels: a slight scale and fade. */
export function pop(
  _node: Element,
  _params?: unknown,
  options?: { direction?: Direction },
): TransitionConfig {
  return {
    duration: duration("med"),
    easing: easingFor(options?.direction),
    css: (t) => `opacity:${t};transform:scale(${0.96 + 0.04 * t})`,
  };
}

/** Content appearing in place, such as an internal page. */
export function fade(
  _node: Element,
  _params?: unknown,
  options?: { direction?: Direction },
): TransitionConfig {
  return {
    duration: duration("med"),
    easing: easingFor(options?.direction),
    css: (t) => `opacity:${t}`,
  };
}

/** Sheets and dialogs rising from below. */
export function rise(
  _node: Element,
  _params?: unknown,
  options?: { direction?: Direction },
): TransitionConfig {
  return {
    duration: duration("slow"),
    easing: easingFor(options?.direction),
    css: (t, u) => `opacity:${t};transform:translateY(${u * 24}px)`,
  };
}

/**
 * Toasts: up into the stack, and off to the side when dismissed. Moves with the
 * `translate` property, not `transform`: animate:flip holds a leaving toast in place with an
 * inline transform, which transform keyframes would replace, jumping the toast mid-exit.
 */
export function slide(
  _node: Element,
  _params?: unknown,
  options?: { direction?: Direction },
): TransitionConfig {
  const out = options?.direction === "out";
  return {
    duration: duration("med"),
    easing: easingFor(options?.direction),
    css: (t, u) => `opacity:${t};translate:${out ? `${u * 24}px 0` : `0 ${u * 12}px`}`,
  };
}

/** Reordering and removal in lists, at the slow duration. Use as `animate:flip`. */
export function flip(
  node: Element,
  animation: { from: DOMRect; to: DOMRect },
  _params?: unknown,
): AnimationConfig {
  return svelteFlip(node, animation, { duration: duration("slow"), easing: cubicInOut });
}

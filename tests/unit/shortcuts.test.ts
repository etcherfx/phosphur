import { describe, expect, test } from "bun:test";
import {
  comboFromEvent,
  formatCombo,
  isValidCombo,
  matchShortcut,
  type KeyInput,
} from "../../src/lib/shortcuts.ts";

function key(code: string, key: string, mods: Partial<KeyInput> = {}): KeyInput {
  return { code, key, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...mods };
}

const alt = { altKey: true };

describe("shortcuts", () => {
  test("serializes combos from physical keys", () => {
    expect(comboFromEvent(key("KeyT", "†", alt))).toBe("Alt+T");
    expect(comboFromEvent(key("KeyK", "K", { ctrlKey: true, shiftKey: true }))).toBe(
      "Ctrl+Shift+K",
    );
    expect(comboFromEvent(key("BracketLeft", "“", alt))).toBe("Alt+[");
    expect(comboFromEvent(key("F5", "F5"))).toBe("F5");
    expect(comboFromEvent(key("ShiftLeft", "Shift", { shiftKey: true }))).toBeNull();
  });

  test("matches browser-shell shortcuts", () => {
    expect(matchShortcut(key("KeyT", "t", alt))).toEqual({ type: "newTab" });
    expect(matchShortcut(key("KeyW", "w", alt))).toEqual({ type: "closeTab" });
    expect(matchShortcut(key("Digit3", "3", alt))).toEqual({ type: "jumpToTab", index: 2 });
    expect(matchShortcut(key("Digit9", "9", alt))).toEqual({ type: "lastTab" });
    expect(matchShortcut(key("BracketLeft", "[", alt))).toEqual({ type: "prevTab" });
    expect(matchShortcut(key("BracketRight", "]", alt))).toEqual({ type: "nextTab" });
    expect(matchShortcut(key("KeyL", "l", { ctrlKey: true }))).toEqual({ type: "focusOmnibox" });
    expect(matchShortcut(key("KeyD", "d", alt))).toEqual({ type: "focusOmnibox" });
    expect(matchShortcut(key("KeyR", "r", { ctrlKey: true }))).toEqual({ type: "reload" });
    expect(matchShortcut(key("F5", "F5"))).toEqual({ type: "reload" });
  });

  test("ignores unbound and browser-reserved combos", () => {
    expect(matchShortcut(key("KeyT", "t", { ctrlKey: true }))).toBeNull();
    expect(matchShortcut(key("KeyT", "t"))).toBeNull();
    expect(matchShortcut(key("KeyT", "T", { altKey: true, shiftKey: true }))).toBeNull();
  });

  test("validates stored combos", () => {
    expect(isValidCombo("Ctrl+Shift+Q")).toBe(true);
    expect(isValidCombo("F9")).toBe(true);
    expect(isValidCombo("Shift+Ctrl+Q")).toBe(false);
    expect(isValidCombo("Ctrl+")).toBe(false);
    expect(isValidCombo("Ctrl+Alt")).toBe(false);
    expect(isValidCombo(42)).toBe(false);
  });

  test("formats combos", () => {
    expect(formatCombo("Ctrl+Shift+Q")).toBe("Ctrl + Shift + Q");
    expect(formatCombo("Alt+Meta+Q", true)).toBe("⌥⌘Q");
  });
});

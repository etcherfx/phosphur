export type KeyInput = Pick<
  KeyboardEvent,
  "key" | "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey"
>;

export type ShortcutAction =
  | { type: "newTab" }
  | { type: "closeTab" }
  | { type: "jumpToTab"; index: number }
  | { type: "lastTab" }
  | { type: "prevTab" }
  | { type: "nextTab" }
  | { type: "focusOmnibox" }
  | { type: "reload" };

const MODIFIER_KEYS = new Set(["Control", "Alt", "Shift", "Meta", "AltGraph", "OS"]);
const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift", "Meta"] as const;

const CODE_KEYS: Record<string, string> = {
  BracketLeft: "[",
  BracketRight: "]",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Space: "Space",
};

/**
 * Normalizes the physical key. `code` is preferred so Alt combos resolve to the
 * printed key rather than the character the OS layers on top (e.g. Option+T → †).
 */
function keyName(event: KeyInput): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null;
  const { code } = event;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return code.slice(6);
  if (/^F\d{1,2}$/.test(code)) return code;
  if (code in CODE_KEYS) return CODE_KEYS[code];
  if (event.key.length === 1) return event.key.toUpperCase();
  return event.key || null;
}

/** Serializes a key event as a combo string like `Ctrl+Shift+K`, or null for a lone modifier. */
export function comboFromEvent(event: KeyInput): string | null {
  const key = keyName(event);
  if (!key) return null;
  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Meta");
  parts.push(key);
  return parts.join("+");
}

/** Checks a stored combo string is well-formed (modifiers in canonical order, then one key). */
export function isValidCombo(combo: unknown): combo is string {
  if (typeof combo !== "string" || !combo) return false;
  const parts = combo.split("+");
  // "+" itself is not a key we record, so an empty segment means a malformed combo.
  if (parts.some((part) => !part)) return false;
  const key = parts.pop()!;
  if ((MODIFIER_ORDER as readonly string[]).includes(key)) return false;
  let last = -1;
  for (const mod of parts) {
    const index = (MODIFIER_ORDER as readonly string[]).indexOf(mod);
    if (index <= last) return false;
    last = index;
  }
  return true;
}

const SHORTCUTS: Record<string, ShortcutAction> = {
  "Alt+T": { type: "newTab" },
  "Alt+W": { type: "closeTab" },
  "Alt+[": { type: "prevTab" },
  "Alt+]": { type: "nextTab" },
  "Alt+9": { type: "lastTab" },
  "Ctrl+L": { type: "focusOmnibox" },
  "Meta+L": { type: "focusOmnibox" },
  "Alt+D": { type: "focusOmnibox" },
  "Ctrl+R": { type: "reload" },
  "Meta+R": { type: "reload" },
  F5: { type: "reload" },
};

for (let n = 1; n <= 8; n++) SHORTCUTS[`Alt+${n}`] = { type: "jumpToTab", index: n - 1 };

/** Maps a key event to a browser-shell action. */
export function matchShortcut(event: KeyInput): ShortcutAction | null {
  const combo = comboFromEvent(event);
  return (combo && SHORTCUTS[combo]) || null;
}

/** Human-readable label for a combo; macOS users see ⌥/⌘ glyphs. */
export function formatCombo(combo: string, mac = false): string {
  if (!mac) return combo.replaceAll("+", " + ");
  return combo
    .split("+")
    .map((part) => ({ Ctrl: "⌃", Alt: "⌥", Shift: "⇧", Meta: "⌘" })[part] ?? part)
    .join("");
}

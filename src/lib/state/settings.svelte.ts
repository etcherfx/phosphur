import {
  LEGACY_THEME_KEY,
  parseSettings,
  SETTINGS_KEY,
  validateSettings,
  type Settings,
} from "../settings.ts";

function read(): Settings {
  try {
    return parseSettings(
      localStorage.getItem(SETTINGS_KEY),
      localStorage.getItem(LEGACY_THEME_KEY),
    );
  } catch {
    return parseSettings(null);
  }
}

class SettingsStore {
  current = $state.raw<Settings>(read());

  update(patch: Partial<Settings>): void {
    this.current = validateSettings({ ...this.current, ...patch });
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.current));
    } catch {
      // Storage full or disabled; settings still apply for this session.
    }
  }
}

export const settings = new SettingsStore();

/** Applies theme and accent to <html>, following the OS when the theme is "system". */
export function applyTheme(theme: Settings["theme"], accent: Settings["accent"]): () => void {
  const root = document.documentElement;
  const media = matchMedia("(prefers-color-scheme: light)");
  const apply = () => {
    root.dataset.theme = theme === "system" ? (media.matches ? "light" : "dark") : theme;
    root.dataset.accent = accent;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", getComputedStyle(root).getPropertyValue("--surface-1").trim());
  };
  apply();
  if (theme !== "system") return () => {};
  media.addEventListener("change", apply);
  return () => media.removeEventListener("change", apply);
}

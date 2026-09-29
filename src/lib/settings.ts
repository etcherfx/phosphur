import { isValidCombo } from "./shortcuts.ts";
import { validateWispUrl } from "./wisp-url.ts";

export const SETTINGS_KEY = "phosphur:settings";
/** Key used by Phosphur 0.x for its light/dark toggle. */
export const LEGACY_THEME_KEY = "theme";
export const SETTINGS_VERSION = 1;

export const THEMES = ["system", "dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export const ACCENTS = {
  phosphor: "Phosphor green",
  cyan: "Cyan",
  amber: "Amber",
  violet: "Violet",
} as const;
export type Accent = keyof typeof ACCENTS;

export const SEARCH_ENGINES = {
  duckduckgo: { name: "DuckDuckGo", template: "https://duckduckgo.com/?q=%s" },
  google: { name: "Google", template: "https://www.google.com/search?q=%s" },
  bing: { name: "Bing", template: "https://www.bing.com/search?q=%s" },
  brave: { name: "Brave Search", template: "https://search.brave.com/search?q=%s" },
  startpage: { name: "Startpage", template: "https://www.startpage.com/sp/search?query=%s" },
} as const;
export type SearchEngineId = keyof typeof SEARCH_ENGINES | "custom";

export const TRANSPORTS = { libcurl: "libcurl", epoxy: "Epoxy" } as const;
export type TransportKind = keyof typeof TRANSPORTS;

export const DISGUISES = {
  none: { name: "None", title: "", icon: "" },
  drive: {
    name: "Google Drive",
    title: "My Drive - Google Drive",
    icon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png",
  },
  classroom: {
    name: "Google Classroom",
    title: "Home",
    icon: "https://ssl.gstatic.com/classroom/favicon.png",
  },
  canvas: {
    name: "Canvas",
    title: "Dashboard",
    icon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico",
  },
  wikipedia: {
    name: "Wikipedia",
    title: "Wikipedia, the free encyclopedia",
    icon: "https://en.wikipedia.org/static/favicon/wikipedia.ico",
  },
  custom: { name: "Custom", title: "", icon: "" },
} as const;
export type DisguiseId = keyof typeof DISGUISES;

export interface Settings {
  version: typeof SETTINGS_VERSION;
  theme: Theme;
  accent: Accent;
  searchEngine: SearchEngineId;
  customSearchTemplate: string;
  transport: TransportKind;
  /** Custom wisp server; empty means this instance's `/wisp/`. */
  wispUrl: string;
  restoreTabs: boolean;
  aboutBlankAutoLaunch: boolean;
  disguise: DisguiseId;
  disguiseTitle: string;
  disguiseIcon: string;
  panicKey: string | null;
  panicUrl: string;
}

export const DEFAULT_PANIC_URL = "https://www.google.com";

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  version: SETTINGS_VERSION,
  theme: "dark",
  accent: "phosphor",
  searchEngine: "duckduckgo",
  customSearchTemplate: "",
  transport: "libcurl",
  wispUrl: "",
  restoreTabs: true,
  aboutBlankAutoLaunch: false,
  disguise: "none",
  disguiseTitle: "",
  disguiseIcon: "",
  panicKey: null,
  panicUrl: DEFAULT_PANIC_URL,
});

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** A custom search template must be an http(s) URL containing `%s`. */
export function isValidSearchTemplate(value: unknown): value is string {
  return typeof value === "string" && value.includes("%s") && isHttpUrl(value.replace("%s", "q"));
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function text(value: unknown, maxLength = 200): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

/** Settings as read from storage, before validation. */
export type StoredSettings = Record<string, unknown>;

function asRecord(raw: unknown): StoredSettings {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? { ...(raw as StoredSettings) } : {};
}

/** Coerces anything into valid settings, replacing each invalid field with its default. */
export function validateSettings(raw: unknown): Settings {
  const input = asRecord(raw);
  const d = DEFAULT_SETTINGS;

  const customSearchTemplate = isValidSearchTemplate(input.customSearchTemplate)
    ? input.customSearchTemplate
    : "";
  let searchEngine = oneOf<SearchEngineId>(
    input.searchEngine,
    [...(Object.keys(SEARCH_ENGINES) as SearchEngineId[]), "custom"],
    d.searchEngine,
  );
  if (searchEngine === "custom" && !customSearchTemplate) searchEngine = d.searchEngine;

  const wisp = typeof input.wispUrl === "string" && input.wispUrl ? validateWispUrl(input.wispUrl) : null;
  const disguiseIcon = text(input.disguiseIcon, 2048);

  return {
    version: SETTINGS_VERSION,
    theme: oneOf(input.theme, THEMES, d.theme),
    accent: oneOf(input.accent, Object.keys(ACCENTS) as Accent[], d.accent),
    searchEngine,
    customSearchTemplate,
    transport: oneOf(input.transport, Object.keys(TRANSPORTS) as TransportKind[], d.transport),
    wispUrl: wisp?.ok ? wisp.url : "",
    restoreTabs: bool(input.restoreTabs, d.restoreTabs),
    aboutBlankAutoLaunch: bool(input.aboutBlankAutoLaunch, d.aboutBlankAutoLaunch),
    disguise: oneOf(input.disguise, Object.keys(DISGUISES) as DisguiseId[], d.disguise),
    disguiseTitle: text(input.disguiseTitle),
    disguiseIcon: disguiseIcon && isHttpUrl(disguiseIcon) ? disguiseIcon : "",
    panicKey: isValidCombo(input.panicKey) ? input.panicKey : null,
    panicUrl:
      typeof input.panicUrl === "string" && isHttpUrl(input.panicUrl) ? input.panicUrl : d.panicUrl,
  };
}

/**
 * Upgrades stored data from older schema versions before validation.
 * Unversioned data predates the schema and is treated as version 1 fields.
 */
export function migrateSettings(raw: unknown): StoredSettings {
  const data = asRecord(raw);
  const version = typeof data.version === "number" ? data.version : 0;
  if (version > SETTINGS_VERSION) {
    // Written by a newer Phosphur: keep whatever still validates.
    return data;
  }
  // Future migrations go here, e.g. `if (version < 2) { ... }`.
  data.version = SETTINGS_VERSION;
  return data;
}

/** Parses stored settings JSON, importing the 0.x theme toggle when nothing is stored yet. */
export function parseSettings(stored: string | null, legacyTheme: string | null = null): Settings {
  if (stored === null) {
    const theme = legacyTheme === "light" || legacyTheme === "dark" ? legacyTheme : undefined;
    return validateSettings({ theme });
  }
  try {
    return validateSettings(migrateSettings(JSON.parse(stored)));
  } catch {
    return validateSettings({});
  }
}

export function searchTemplate(settings: Pick<Settings, "searchEngine" | "customSearchTemplate">): string {
  if (settings.searchEngine === "custom") {
    return settings.customSearchTemplate || SEARCH_ENGINES.duckduckgo.template;
  }
  return SEARCH_ENGINES[settings.searchEngine].template;
}

export function disguiseOf(
  settings: Pick<Settings, "disguise" | "disguiseTitle" | "disguiseIcon">,
): { title: string; icon: string } | null {
  if (settings.disguise === "none") return null;
  if (settings.disguise === "custom") {
    if (!settings.disguiseTitle && !settings.disguiseIcon) return null;
    return { title: settings.disguiseTitle, icon: settings.disguiseIcon };
  }
  const preset = DISGUISES[settings.disguise];
  return { title: preset.title, icon: preset.icon };
}

import { describe, expect, test } from "bun:test";
import {
  DEFAULT_SETTINGS,
  disguiseOf,
  migrateSettings,
  parseSettings,
  searchTemplate,
  SETTINGS_VERSION,
  validateSettings,
} from "../../src/lib/settings.ts";

describe("settings", () => {
  test("defaults when nothing is stored", () => {
    expect(parseSettings(null)).toEqual({ ...DEFAULT_SETTINGS });
  });

  test("falls back to defaults on corrupt JSON", () => {
    expect(parseSettings("{not json")).toEqual({ ...DEFAULT_SETTINGS });
    expect(parseSettings("null")).toEqual({ ...DEFAULT_SETTINGS });
    expect(parseSettings("[1,2]")).toEqual({ ...DEFAULT_SETTINGS });
  });

  test("keeps valid fields and replaces invalid ones", () => {
    const settings = validateSettings({
      theme: "light",
      accent: "neon",
      searchEngine: "yahoo",
      restoreTabs: "yes",
      wispUrl: "https://not-a-websocket.example/",
      panicKey: "Alt+Ctrl+X",
      panicUrl: "javascript:alert(1)",
    });
    expect(settings.theme).toBe("light");
    expect(settings.accent).toBe(DEFAULT_SETTINGS.accent);
    expect(settings.searchEngine).toBe(DEFAULT_SETTINGS.searchEngine);
    expect(settings.restoreTabs).toBe(true);
    expect(settings.wispUrl).toBe("");
    expect(settings.panicKey).toBeNull();
    expect(settings.panicUrl).toBe(DEFAULT_SETTINGS.panicUrl);
  });

  test("accepts a custom wisp URL, panic key and search template", () => {
    const settings = validateSettings({
      wispUrl: "wss://wisp.example/wisp/",
      panicKey: "Ctrl+Shift+Q",
      searchEngine: "custom",
      customSearchTemplate: "https://search.example/?q=%s",
    });
    expect(settings.wispUrl).toBe("wss://wisp.example/wisp/");
    expect(settings.panicKey).toBe("Ctrl+Shift+Q");
    expect(searchTemplate(settings)).toBe("https://search.example/?q=%s");
  });

  test("drops the custom engine when its template is invalid", () => {
    const settings = validateSettings({
      searchEngine: "custom",
      customSearchTemplate: "https://x.example/",
    });
    expect(settings.searchEngine).toBe("duckduckgo");
    expect(settings.customSearchTemplate).toBe("");
  });

  test("migrates unversioned data to the current version", () => {
    expect(migrateSettings({ theme: "light" })).toEqual({
      theme: "light",
      version: SETTINGS_VERSION,
    });
    expect(parseSettings(JSON.stringify({ theme: "light" })).theme).toBe("light");
  });

  test("keeps valid fields written by a newer version", () => {
    const settings = parseSettings(
      JSON.stringify({ version: 99, accent: "amber", futureField: 1 }),
    );
    expect(settings.version).toBe(SETTINGS_VERSION);
    expect(settings.accent).toBe("amber");
    expect(settings).not.toHaveProperty("futureField");
  });

  test("imports the 0.x theme toggle", () => {
    expect(parseSettings(null, "light").theme).toBe("light");
    expect(parseSettings(null, "sepia").theme).toBe("dark");
    expect(parseSettings(JSON.stringify({ theme: "system" }), "light").theme).toBe("system");
  });

  test("resolves disguises", () => {
    expect(disguiseOf(DEFAULT_SETTINGS)).toBeNull();
    expect(disguiseOf({ disguise: "wikipedia", disguiseTitle: "", disguiseIcon: "" })?.title).toBe(
      "Wikipedia, the free encyclopedia",
    );
    expect(disguiseOf({ disguise: "custom", disguiseTitle: "", disguiseIcon: "" })).toBeNull();
    expect(disguiseOf({ disguise: "custom", disguiseTitle: "Notes", disguiseIcon: "" })).toEqual({
      title: "Notes",
      icon: "",
    });
  });
});

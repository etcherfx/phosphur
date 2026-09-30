import { disguiseOf, type Settings } from "./settings.ts";

export const APP_NAME = "Phosphur";
export const APP_ICON = "/favicon.ico";

type IdentitySettings = Pick<Settings, "disguise" | "disguiseTitle" | "disguiseIcon">;

/** Title and icon for the browser tab: the disguise when set, else the active page. */
export function tabIdentity(
  settings: IdentitySettings,
  pageTitle: string,
): { title: string; icon: string } {
  const disguise = disguiseOf(settings);
  if (disguise) {
    return { title: disguise.title || APP_NAME, icon: disguise.icon || APP_ICON };
  }
  return { title: pageTitle ? `${pageTitle} · ${APP_NAME}` : APP_NAME, icon: APP_ICON };
}

/** Initial identity for a fresh about:blank host, before the app inside takes over. */
export function cloakIdentity(settings: IdentitySettings): { title: string; icon: string } {
  return tabIdentity(settings, "");
}

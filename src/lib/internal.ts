export const INTERNAL_SCHEME = "phosphur://";

export const INTERNAL_PAGES = ["newtab", "settings", "history", "bookmarks"] as const;
export type InternalPage = (typeof INTERNAL_PAGES)[number];

export const NEW_TAB_URL = `${INTERNAL_SCHEME}newtab`;

export const INTERNAL_TITLES: Record<InternalPage, string> = {
  newtab: "New Tab",
  settings: "Settings",
  history: "History",
  bookmarks: "Bookmarks",
};

export function isInternalUrl(url: string): boolean {
  return url.toLowerCase().startsWith(INTERNAL_SCHEME);
}

/** Returns the internal page for a `phosphur://` URL; unknown pages fall back to the New Tab. */
export function internalPage(url: string): InternalPage | null {
  if (!isInternalUrl(url)) return null;
  const name = url
    .slice(INTERNAL_SCHEME.length)
    .split(/[/?#]/)[0]
    .toLowerCase();
  return (INTERNAL_PAGES as readonly string[]).includes(name) ? (name as InternalPage) : "newtab";
}

export function internalUrl(page: InternalPage): string {
  return `${INTERNAL_SCHEME}${page}`;
}

export function isWebUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

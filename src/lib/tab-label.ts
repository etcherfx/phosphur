import { INTERNAL_TITLES, internalPage } from "./internal.ts";
import { displayHost } from "./monogram.ts";
import { currentUrl, type Tab } from "./tabs.ts";

/** What a tab shows as its title: the page title, else the host, else a loading hint. */
export function tabLabel(tab: Tab): string {
  const url = currentUrl(tab);
  const page = internalPage(url);
  if (page) return INTERNAL_TITLES[page];
  if (tab.title) return tab.title;
  return tab.loading ? "Loading…" : displayHost(url);
}

/** Splits a URL so the omnibox can emphasise the host. */
export function urlParts(url: string): { before: string; host: string; after: string } {
  try {
    const parsed = new URL(url);
    const start = url.indexOf(parsed.host);
    if (!parsed.host || start === -1) return { before: "", host: url, after: "" };
    return {
      before: url.slice(0, start),
      host: parsed.host,
      after: url.slice(start + parsed.host.length),
    };
  } catch {
    return { before: "", host: url, after: "" };
  }
}

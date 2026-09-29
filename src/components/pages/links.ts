import { browser } from "../../lib/state/browser.svelte.ts";

/**
 * Follows a link from an internal page inside Phosphur: a plain click navigates
 * the tab, while Ctrl/Cmd-click and middle-click open a background tab.
 * The native navigation is always cancelled so nothing loads unproxied.
 */
export function follow(event: MouseEvent, tabId: string, url: string): void {
  if (event.button > 1) return;
  event.preventDefault();
  if (event.button === 1 || event.ctrlKey || event.metaKey) browser.open(url, false);
  else browser.navigate(tabId, url);
}

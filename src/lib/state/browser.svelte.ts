import { tick } from "svelte";
import { recordVisit } from "../db.ts";
import { isWebUrl, NEW_TAB_URL } from "../internal.ts";
import { resolveInput } from "../omnibox.ts";
import type { Frame, ProxyRuntime } from "../proxy/controller.ts";
import {
  activeTab,
  currentUrl,
  initialTabs,
  tabsReducer,
  type Tab,
  type TabsAction,
  type TabsState,
} from "../tabs.ts";

interface TabHandle {
  iframe: HTMLIFrameElement;
  frame: Frame | null;
  observer: MutationObserver | null;
  onLoad: () => void;
}

let counter = 0;
export function newTabId(): string {
  return `t${Date.now().toString(36)}${(counter++).toString(36)}`;
}

class BrowserStore {
  state = $state.raw<TabsState>(initialTabs(newTabId()));
  runtime = $state.raw<ProxyRuntime | null>(null);
  /** Bumped to ask the omnibox to take focus. */
  omniboxFocusRequest = $state(0);
  /** Installed by the shell; attached to every tab's window so shortcuts work inside pages. */
  keyHandler: ((event: KeyboardEvent) => void) | null = null;
  /** True while Settings records a key combo, so shortcuts and the panic key stand down. */
  capturingKeys = false;

  #handles = new Map<string, TabHandle>();

  get tabs(): Tab[] {
    return this.state.tabs;
  }

  get active(): Tab {
    return activeTab(this.state);
  }

  tab(id: string): Tab | undefined {
    return this.state.tabs.find((t) => t.id === id);
  }

  #dispatch(action: TabsAction): void {
    this.state = tabsReducer(this.state, action);
  }

  restore(urls: string[], active: number): void {
    this.state = initialTabs(newTabId(), urls, active);
  }

  setRuntime(runtime: ProxyRuntime): void {
    this.runtime = runtime;
    for (const id of this.#handles.keys()) this.#ensureFrame(id);
  }

  // Tab lifecycle ---------------------------------------------------------

  open(url: string = NEW_TAB_URL, activate = true): string {
    const id = newTabId();
    // The panel mounts, attaches its iframe and loads web URLs from there.
    this.#dispatch({ type: "open", id, url, activate });
    if (activate && url === NEW_TAB_URL) this.focusOmnibox();
    return id;
  }

  close(id: string): void {
    this.#dispatch({ type: "close", id, newTabId: newTabId() });
  }

  activate(id: string): void {
    this.#dispatch({ type: "activate", id });
  }

  activateIndex(index: number): void {
    const tab = this.tabs[index];
    if (tab) this.activate(tab.id);
  }

  cycle(delta: number): void {
    const index = this.tabs.findIndex((t) => t.id === this.state.activeId);
    const count = this.tabs.length;
    this.activateIndex((index + delta + count) % count);
  }

  reorder(from: number, to: number): void {
    this.#dispatch({ type: "reorder", from, to });
  }

  focusOmnibox(): void {
    this.omniboxFocusRequest++;
  }

  /** Called by a tab panel once its iframe is in the DOM. */
  attach(id: string, iframe: HTMLIFrameElement): void {
    const handle: TabHandle = {
      iframe,
      frame: null,
      observer: null,
      onLoad: () => this.#onLoad(id),
    };
    iframe.addEventListener("load", handle.onLoad);
    this.#handles.set(id, handle);
    this.#ensureFrame(id);
  }

  detach(id: string): void {
    const handle = this.#handles.get(id);
    if (!handle) return;
    handle.iframe.removeEventListener("load", handle.onLoad);
    handle.observer?.disconnect();
    if (handle.frame) this.runtime?.releaseTab(handle.frame);
    this.#handles.delete(id);
  }

  focusFrame(id: string): void {
    // Wait for the DOM update that swaps an internal page for the (now visible) iframe.
    void tick().then(() => this.#handles.get(id)?.iframe.focus());
  }

  // Navigation ------------------------------------------------------------

  /** Resolves omnibox input and navigates; returns false for blank input. */
  submit(id: string, input: string, searchTemplate: string): boolean {
    const resolution = resolveInput(input, searchTemplate);
    if (!resolution) return false;
    this.navigate(id, resolution.url);
    return true;
  }

  navigate(id: string, url: string): void {
    this.#dispatch({ type: "navigate", id, url });
    if (isWebUrl(url)) this.#load(id, url, false);
    else this.#dispatch({ type: "update", id, patch: { loading: false } });
  }

  back(id: string): void {
    this.#traverse(id, -1);
  }

  forward(id: string): void {
    this.#traverse(id, 1);
  }

  reload(id: string): void {
    const tab = this.tab(id);
    const handle = this.#handles.get(id);
    if (!tab || !handle?.frame) return;
    const url = currentUrl(tab);
    if (!isWebUrl(url)) return;
    if (this.#frameUrl(id) === url) {
      this.#dispatch({ type: "update", id, patch: { loading: true } });
      handle.frame.reload();
    } else {
      this.#load(id, url, true);
    }
  }

  stop(id: string): void {
    try {
      this.#handles.get(id)?.iframe.contentWindow?.stop();
    } catch {
      // Cross-origin error page; nothing to stop.
    }
    this.#dispatch({ type: "update", id, patch: { loading: false } });
  }

  /** Picks up in-page URL changes (pushState, hash) that don't fire a load. */
  syncUrl(id: string): void {
    const tab = this.tab(id);
    if (!tab || tab.pending || !isWebUrl(currentUrl(tab))) return;
    const url = this.#frameUrl(id);
    if (url && url !== currentUrl(tab)) {
      this.#dispatch({ type: "commit", id, url });
      this.#syncMeta(id, true);
    }
  }

  #traverse(id: string, delta: number): void {
    const tab = this.tab(id);
    const target = tab?.entries[tab.index + delta];
    if (!tab || !target) return;
    const expectLoad = isWebUrl(target) && this.#frameUrl(id) !== target;
    this.#dispatch({ type: "traverse", id, delta, expectLoad });
    if (expectLoad) this.#load(id, target, true);
    else this.#syncMeta(id, false);
  }

  #ensureFrame(id: string): void {
    const handle = this.#handles.get(id);
    if (!handle || handle.frame || !this.runtime) return;
    handle.frame = this.runtime.createTab(handle.iframe);
    const tab = this.tab(id);
    if (tab && isWebUrl(currentUrl(tab))) this.#load(id, currentUrl(tab), false);
  }

  #load(id: string, url: string, replace: boolean): void {
    const handle = this.#handles.get(id);
    // Without a frame yet, #ensureFrame loads the current entry once the runtime is up.
    if (!handle?.frame || !this.runtime) return;
    this.#dispatch({ type: "update", id, patch: { loading: true } });
    if (replace) {
      try {
        // Replace so our own back/forward doesn't pile entries onto the session history.
        handle.iframe.contentWindow?.location.replace(this.runtime.proxiedUrl(handle.frame, url));
        return;
      } catch {
        // Fall back to a normal navigation below.
      }
    }
    handle.frame.go(url);
  }

  #frameUrl(id: string): string | null {
    const handle = this.#handles.get(id);
    if (!handle?.frame || !this.runtime) return null;
    try {
      const location = handle.iframe.contentWindow?.location.href;
      return location ? this.runtime.realUrl(handle.frame, location) : null;
    } catch {
      return null;
    }
  }

  #onLoad(id: string): void {
    const handle = this.#handles.get(id);
    if (!handle?.frame) return;
    this.#dispatch({ type: "update", id, patch: { loading: false } });
    const url = this.#frameUrl(id);
    if (!url) return;
    this.#dispatch({ type: "commit", id, url });
    this.#wireDocument(id, handle);
    this.#syncMeta(id, true);
  }

  #wireDocument(id: string, handle: TabHandle): void {
    const win = handle.iframe.contentWindow;
    const doc = handle.iframe.contentDocument;
    if (!win || !doc) return;

    win.addEventListener("beforeunload", () => {
      this.#dispatch({ type: "update", id, patch: { loading: true } });
    });
    win.addEventListener("hashchange", () => this.syncUrl(id));
    win.addEventListener("popstate", () => this.syncUrl(id));
    if (this.keyHandler) win.addEventListener("keydown", this.keyHandler, true);

    handle.observer?.disconnect();
    handle.observer = new MutationObserver(() => this.#syncMeta(id, false));
    handle.observer.observe(doc.head ?? doc.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributeFilter: ["href", "rel"],
    });
  }

  /** Reads title and favicon from the page; records history when the title settles. */
  #syncMeta(id: string, visited: boolean): void {
    const tab = this.tab(id);
    const handle = this.#handles.get(id);
    if (!tab || !handle?.frame || tab.pending) return;
    const url = currentUrl(tab);
    if (!isWebUrl(url) || this.#frameUrl(id) !== url) return;

    const doc = handle.iframe.contentDocument;
    if (!doc) return;
    const title = doc.title.trim();
    const favicon = this.#favicon(handle.frame, doc, url);
    const titleChanged = title !== tab.title;
    this.#dispatch({ type: "update", id, patch: { title, favicon } });

    if (visited || (titleChanged && title)) {
      recordVisit({ url, title, visitedAt: Date.now() }).catch(() => {
        // History is best-effort; private windows may block IndexedDB.
      });
    }
  }

  #favicon(frame: Frame, doc: Document, pageUrl: string): string | null {
    if (!this.runtime) return null;
    const raw = doc.querySelector('link[rel~="icon" i]')?.getAttribute("href")?.trim();
    try {
      if (raw?.startsWith("data:")) return raw;
      if (raw) {
        const resolved = new URL(raw, location.origin);
        if (resolved.origin === location.origin && resolved.pathname.startsWith(frame.prefix)) {
          return resolved.href;
        }
      }
      const real = new URL(raw || "/favicon.ico", pageUrl);
      return isWebUrl(real.href) ? this.runtime.proxiedUrl(frame, real.href) : null;
    } catch {
      return null;
    }
  }
}

export const browser = new BrowserStore();

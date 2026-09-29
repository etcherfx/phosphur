import { isWebUrl, NEW_TAB_URL } from "./internal.ts";

export interface Tab {
  id: string;
  /** Per-tab navigation stack of real URLs (web or `phosphur://`). */
  entries: string[];
  index: number;
  /**
   * Set when the shell starts a navigation; the next committed URL replaces the
   * current entry instead of pushing, so redirects don't leave bounce entries.
   */
  pending: boolean;
  title: string;
  favicon: string | null;
  loading: boolean;
}

export interface TabsState {
  tabs: Tab[];
  activeId: string;
}

export type TabsAction =
  | { type: "open"; id: string; url?: string; activate?: boolean }
  | { type: "close"; id: string; newTabId: string }
  | { type: "activate"; id: string }
  | { type: "reorder"; from: number; to: number }
  | { type: "navigate"; id: string; url: string }
  /** `expectLoad` is false when the frame already shows the target and won't reload. */
  | { type: "traverse"; id: string; delta: number; expectLoad: boolean }
  | { type: "commit"; id: string; url: string }
  | { type: "update"; id: string; patch: Partial<Pick<Tab, "title" | "favicon" | "loading">> };

export function createTab(id: string, url: string = NEW_TAB_URL): Tab {
  return {
    id,
    entries: [url],
    index: 0,
    pending: isWebUrl(url),
    title: "",
    favicon: null,
    loading: false,
  };
}

export function initialTabs(id: string, urls: string[] = [], active = 0): TabsState {
  const list = urls.length > 0 ? urls : [NEW_TAB_URL];
  const tabs = list.map((url, i) => createTab(i === 0 ? id : `${id}-${i}`, url));
  return { tabs, activeId: tabs[Math.min(Math.max(active, 0), tabs.length - 1)].id };
}

export function currentUrl(tab: Tab): string {
  return tab.entries[tab.index];
}

export function canGoBack(tab: Tab): boolean {
  return tab.index > 0;
}

export function canGoForward(tab: Tab): boolean {
  return tab.index < tab.entries.length - 1;
}

export function activeTab(state: TabsState): Tab {
  return state.tabs.find((t) => t.id === state.activeId) ?? state.tabs[0];
}

function mapTab(state: TabsState, id: string, fn: (tab: Tab) => Tab): TabsState {
  let changed = false;
  const tabs = state.tabs.map((tab) => {
    if (tab.id !== id) return tab;
    const next = fn(tab);
    if (next !== tab) changed = true;
    return next;
  });
  return changed ? { ...state, tabs } : state;
}

function commit(tab: Tab, url: string): Tab {
  if (tab.pending) {
    const entries = tab.entries.slice();
    entries[tab.index] = url;
    return { ...tab, entries, pending: false };
  }
  if (url === tab.entries[tab.index]) return tab;
  // Navigations the shell didn't start (link clicks, native back/forward).
  if (url === tab.entries[tab.index - 1]) return { ...tab, index: tab.index - 1 };
  if (url === tab.entries[tab.index + 1]) return { ...tab, index: tab.index + 1 };
  return { ...tab, entries: [...tab.entries.slice(0, tab.index + 1), url], index: tab.index + 1 };
}

export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  switch (action.type) {
    case "open": {
      const tab = createTab(action.id, action.url);
      const activeIndex = state.tabs.findIndex((t) => t.id === state.activeId);
      const tabs = state.tabs.slice();
      tabs.splice(activeIndex + 1, 0, tab);
      return { tabs, activeId: action.activate === false ? state.activeId : tab.id };
    }

    case "close": {
      const index = state.tabs.findIndex((t) => t.id === action.id);
      if (index === -1) return state;
      const tabs = state.tabs.filter((t) => t.id !== action.id);
      if (tabs.length === 0) {
        const tab = createTab(action.newTabId);
        return { tabs: [tab], activeId: tab.id };
      }
      if (state.activeId !== action.id) return { ...state, tabs };
      // Like desktop browsers: prefer the tab to the right, then the left.
      return { tabs, activeId: tabs[Math.min(index, tabs.length - 1)].id };
    }

    case "activate":
      return state.tabs.some((t) => t.id === action.id) && state.activeId !== action.id
        ? { ...state, activeId: action.id }
        : state;

    case "reorder": {
      const { from, to } = action;
      const last = state.tabs.length - 1;
      if (from === to || from < 0 || from > last || to < 0 || to > last) return state;
      const tabs = state.tabs.slice();
      const [moved] = tabs.splice(from, 1);
      tabs.splice(to, 0, moved);
      return { ...state, tabs };
    }

    case "navigate":
      return mapTab(state, action.id, (tab) => ({
        ...tab,
        entries: [...tab.entries.slice(0, tab.index + 1), action.url],
        index: tab.index + 1,
        pending: isWebUrl(action.url),
        title: "",
        favicon: null,
      }));

    case "traverse":
      return mapTab(state, action.id, (tab) => {
        const index = tab.index + action.delta;
        if (index < 0 || index >= tab.entries.length || index === tab.index) return tab;
        return { ...tab, index, pending: action.expectLoad, title: "", favicon: null };
      });

    case "commit":
      return mapTab(state, action.id, (tab) => commit(tab, action.url));

    case "update":
      return mapTab(state, action.id, (tab) => {
        const patch = action.patch;
        const same = (Object.keys(patch) as (keyof typeof patch)[]).every(
          (key) => tab[key] === patch[key],
        );
        return same ? tab : { ...tab, ...patch };
      });
  }
}

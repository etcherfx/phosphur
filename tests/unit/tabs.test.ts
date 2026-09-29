import { describe, expect, test } from "bun:test";
import { NEW_TAB_URL } from "../../src/lib/internal.ts";
import {
  activeTab,
  canGoBack,
  canGoForward,
  currentUrl,
  initialTabs,
  tabsReducer,
  type TabsState,
} from "../../src/lib/tabs.ts";

function ids(state: TabsState) {
  return state.tabs.map((t) => t.id);
}

describe("tabs reducer", () => {
  test("starts with a New Tab", () => {
    const state = initialTabs("a");
    expect(ids(state)).toEqual(["a"]);
    expect(currentUrl(activeTab(state))).toBe(NEW_TAB_URL);
  });

  test("opens tabs after the active one and activates them", () => {
    let state = initialTabs("a", [NEW_TAB_URL, NEW_TAB_URL]);
    state = tabsReducer(state, { type: "open", id: "c" });
    expect(ids(state)).toEqual(["a", "c", "a-1"]);
    expect(state.activeId).toBe("c");
    state = tabsReducer(state, { type: "open", id: "d", activate: false });
    expect(state.activeId).toBe("c");
  });

  test("closing the active tab falls back to the right, then the left", () => {
    let state = initialTabs(
      "a",
      ["https://1.example/", "https://2.example/", "https://3.example/"],
      1,
    );
    state = tabsReducer(state, { type: "close", id: "a-1", newTabId: "n" });
    expect(ids(state)).toEqual(["a", "a-2"]);
    expect(state.activeId).toBe("a-2");
    state = tabsReducer(state, { type: "close", id: "a-2", newTabId: "n" });
    expect(state.activeId).toBe("a");
  });

  test("closing an inactive tab keeps the active one", () => {
    let state = initialTabs("a", ["https://1.example/", "https://2.example/"], 0);
    state = tabsReducer(state, { type: "close", id: "a-1", newTabId: "n" });
    expect(state.activeId).toBe("a");
  });

  test("closing the last tab opens a New Tab", () => {
    const state = tabsReducer(initialTabs("a", ["https://1.example/"]), {
      type: "close",
      id: "a",
      newTabId: "n",
    });
    expect(ids(state)).toEqual(["n"]);
    expect(state.activeId).toBe("n");
    expect(currentUrl(state.tabs[0])).toBe(NEW_TAB_URL);
  });

  test("activates and reorders", () => {
    let state = initialTabs("a", [NEW_TAB_URL, NEW_TAB_URL, NEW_TAB_URL]);
    state = tabsReducer(state, { type: "activate", id: "a-2" });
    expect(state.activeId).toBe("a-2");
    expect(tabsReducer(state, { type: "activate", id: "missing" })).toBe(state);
    state = tabsReducer(state, { type: "reorder", from: 2, to: 0 });
    expect(ids(state)).toEqual(["a-2", "a", "a-1"]);
    expect(tabsReducer(state, { type: "reorder", from: 0, to: 5 })).toBe(state);
  });

  test("navigates, commits redirects in place, and traverses", () => {
    let state = initialTabs("a");
    state = tabsReducer(state, { type: "navigate", id: "a", url: "https://example.com/" });
    // The first load after a shell navigation replaces the entry (redirect to www).
    state = tabsReducer(state, { type: "commit", id: "a", url: "https://www.example.com/" });
    let tab = activeTab(state);
    expect(tab.entries).toEqual([NEW_TAB_URL, "https://www.example.com/"]);
    expect(canGoBack(tab)).toBe(true);

    // A link click inside the page pushes.
    state = tabsReducer(state, { type: "commit", id: "a", url: "https://www.example.com/about" });
    expect(activeTab(state).index).toBe(2);

    state = tabsReducer(state, { type: "traverse", id: "a", delta: -2, expectLoad: false });
    tab = activeTab(state);
    expect(currentUrl(tab)).toBe(NEW_TAB_URL);
    expect(canGoForward(tab)).toBe(true);
    expect(tab.pending).toBe(false);

    state = tabsReducer(state, { type: "traverse", id: "a", delta: 1, expectLoad: true });
    expect(activeTab(state).pending).toBe(true);
    expect(tabsReducer(state, { type: "traverse", id: "a", delta: 5, expectLoad: true })).toBe(
      state,
    );
  });

  test("recognises native back/forward and reloads", () => {
    let state = initialTabs("a", ["https://a.example/"]);
    state = tabsReducer(state, { type: "commit", id: "a", url: "https://a.example/" });
    state = tabsReducer(state, { type: "commit", id: "a", url: "https://a.example/2" });
    expect(tabsReducer(state, { type: "commit", id: "a", url: "https://a.example/2" })).toBe(state);
    state = tabsReducer(state, { type: "commit", id: "a", url: "https://a.example/" });
    expect(activeTab(state).index).toBe(0);
    state = tabsReducer(state, { type: "commit", id: "a", url: "https://a.example/2" });
    expect(activeTab(state).index).toBe(1);
    expect(activeTab(state).entries).toHaveLength(2);
  });

  test("navigating drops forward entries", () => {
    let state = initialTabs("a", ["https://a.example/"]);
    state = tabsReducer(state, { type: "commit", id: "a", url: "https://a.example/" });
    state = tabsReducer(state, { type: "navigate", id: "a", url: "https://b.example/" });
    state = tabsReducer(state, { type: "traverse", id: "a", delta: -1, expectLoad: true });
    state = tabsReducer(state, { type: "commit", id: "a", url: "https://a.example/" });
    state = tabsReducer(state, { type: "navigate", id: "a", url: "https://c.example/" });
    expect(activeTab(state).entries).toEqual(["https://a.example/", "https://c.example/"]);
  });

  test("updates are no-ops when nothing changes", () => {
    const state = initialTabs("a");
    expect(tabsReducer(state, { type: "update", id: "a", patch: { loading: false } })).toBe(state);
    const titled = tabsReducer(state, { type: "update", id: "a", patch: { title: "Hi" } });
    expect(activeTab(titled).title).toBe("Hi");
  });
});

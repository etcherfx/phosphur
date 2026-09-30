<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { applyTabIdentity, isCloaked, openInAboutBlank, panic } from "../lib/cloak.ts";
  import { cloakIdentity, tabIdentity } from "../lib/identity.ts";
  import { internalPage, internalUrl, NEW_TAB_URL, type InternalPage } from "../lib/internal.ts";
  import { initProxy, ProxyInitError, type ProxyErrorKind } from "../lib/proxy/controller.ts";
  import { parseSession, SESSION_KEY } from "../lib/session.ts";
  import { comboFromEvent, matchShortcut, type ShortcutAction } from "../lib/shortcuts.ts";
  import { browser } from "../lib/state/browser.svelte.ts";
  import { applyTheme, settings } from "../lib/state/settings.svelte.ts";
  import { toasts } from "../lib/state/toasts.svelte.ts";
  import { tabLabel } from "../lib/tab-label.ts";
  import { currentUrl, stableOrder, type Tab } from "../lib/tabs.ts";
  import { activeWispUrl } from "../lib/wisp-url.ts";
  import { probeWisp, type WispStatus } from "../lib/wisp-status.ts";
  import ErrorCard from "./ErrorCard.svelte";
  import type { MenuItem } from "./Menu.svelte";
  import ProgressBar from "./ProgressBar.svelte";
  import TabPanel from "./TabPanel.svelte";
  import TabSheet from "./TabSheet.svelte";
  import TabStrip from "./TabStrip.svelte";
  import Toasts from "./Toasts.svelte";
  import Toolbar from "./Toolbar.svelte";

  const STATUS_INTERVAL = 30_000;

  const s = $derived(settings.current);
  const wispUrl = $derived(activeWispUrl(s.wispUrl, location));

  let fatal = $state<{ kind: ProxyErrorKind; message: string; detail?: string } | null>(null);
  let status = $state.raw<WispStatus>({ state: "connecting" });
  let sheet: TabSheet;

  // Restore the previous session before the first render.
  if (settings.current.restoreTabs) {
    const session = parseSession(localStorage.getItem(SESSION_KEY));
    if (session) browser.restore(session.urls, session.active);
  }

  // Panels stay in creation order so reordering tabs never moves (and reloads) an iframe.
  let panelOrder: string[] = [];
  const panels = $derived.by(() => {
    panelOrder = stableOrder(
      panelOrder,
      browser.tabs.map((t) => t.id),
    );
    const byId = new Map(browser.tabs.map((t) => [t.id, t]));
    return panelOrder.map((id) => byId.get(id)).filter((t): t is Tab => t !== undefined);
  });

  // Proxy boot ---------------------------------------------------------------

  async function boot() {
    try {
      const runtime = await initProxy(untrack(() => wispUrl));
      browser.setRuntime(runtime);
    } catch (error) {
      const detail = error instanceof Error && error.cause ? String(error.cause) : undefined;
      if (error instanceof ProxyInitError && error.kind === "transport") {
        status = { state: "offline" };
        toasts.show(
          {
            title: "Couldn't connect",
            message: error.message,
            tone: "error",
            action: { label: "Retry", run: boot },
          },
          0,
        );
      } else if (error instanceof ProxyInitError) {
        fatal = { kind: error.kind, message: error.message, detail };
      } else {
        fatal = {
          kind: "runtime",
          message: "Something went wrong starting Phosphur.",
          detail: String(error),
        };
      }
    }
  }

  // Live wisp server switching when settings change.
  $effect(() => {
    const url = wispUrl;
    const runtime = browser.runtime;
    if (!runtime || runtime.wispUrl === url) return;
    runtime.setWispUrl(url).then(
      () => toasts.show({ message: `Now using ${new URL(url).host}`, tone: "success" }, 2500),
      (error: unknown) =>
        toasts.show({
          title: "Couldn't switch wisp server",
          message: error instanceof Error ? error.message : "Check the address and try again.",
          tone: "error",
        }),
    );
  });

  // Wisp status ---------------------------------------------------------------

  let lastProbeState: WispStatus["state"] = "connecting";

  async function checkStatus() {
    const url = wispUrl;
    if (status.state !== "online") status = { state: "connecting" };
    const result = await probeWisp(url);
    if (url !== wispUrl) return;
    if (result.state === "offline" && lastProbeState !== "offline") {
      toasts.show({
        title: "Can't reach the wisp server",
        message: "Pages won't load until it's back.",
        tone: "error",
        action: { label: "Retry", run: checkStatus },
      });
    }
    lastProbeState = result.state;
    status = result;
  }

  $effect(() => {
    void wispUrl;
    lastProbeState = "connecting";
    status = { state: "connecting" };
    untrack(checkStatus);
  });

  // Keyboard ------------------------------------------------------------------

  function openInternal(page: InternalPage) {
    const url = internalUrl(page);
    const existing = browser.tabs.find((t) => internalPage(currentUrl(t)) === page);
    if (existing) browser.activate(existing.id);
    else if (currentUrl(browser.active) === NEW_TAB_URL) browser.navigate(browser.active.id, url);
    else browser.open(url);
  }

  function run(action: ShortcutAction) {
    const active = browser.active;
    switch (action.type) {
      case "newTab":
        browser.open();
        break;
      case "closeTab":
        browser.close(active.id);
        break;
      case "jumpToTab":
        browser.activateIndex(action.index);
        break;
      case "lastTab":
        browser.activateIndex(browser.tabs.length - 1);
        break;
      case "prevTab":
        browser.cycle(-1);
        break;
      case "nextTab":
        browser.cycle(1);
        break;
      case "focusOmnibox":
        window.focus();
        browser.focusOmnibox();
        break;
      case "reload":
        browser.reload(active.id);
        break;
    }
  }

  function handleKey(event: KeyboardEvent) {
    if (browser.capturingKeys) return;
    const { panicKey, panicUrl } = settings.current;
    if (panicKey && comboFromEvent(event) === panicKey) {
      event.preventDefault();
      panic(panicUrl);
      return;
    }
    const action = matchShortcut(event);
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    run(action);
  }
  browser.keyHandler = handleKey;

  // Cloaking --------------------------------------------------------------------

  function launchAboutBlank() {
    const identity = cloakIdentity(settings.current);
    return openInAboutBlank(settings.current.panicUrl, identity.title, identity.icon);
  }

  /** Opens in about:blank, offering a retry (a fresh click, so a fresh popup allowance) if blocked. */
  function openCloaked() {
    if (launchAboutBlank()) return;
    toasts.show({
      title: "Popup blocked",
      message: "Allow popups for this site, then try again.",
      tone: "error",
      action: { label: "Try again", run: openCloaked },
    });
  }

  $effect(() => {
    const identity = tabIdentity(s, tabLabel(browser.active));
    applyTabIdentity(identity.title, identity.icon);
  });

  // Session and theme -------------------------------------------------------------

  $effect(() => {
    const urls = browser.tabs.map(currentUrl);
    const active = browser.tabs.findIndex((t) => t.id === browser.state.activeId);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ urls, active }));
    } catch {
      // Storage unavailable; restore just won't work.
    }
  });

  $effect(() => applyTheme(s.theme));

  const menuItems = $derived<MenuItem[]>([
    { label: "New tab", hint: "Alt+T", run: () => browser.open() },
    { label: "History", run: () => openInternal("history") },
    { label: "Bookmarks", run: () => openInternal("bookmarks") },
    { label: "Settings", run: () => openInternal("settings") },
    {
      label: "Open in about:blank",
      separatorBefore: true,
      run: openCloaked,
    },
  ]);

  onMount(() => {
    document.documentElement.dataset.ready = "";

    if (settings.current.aboutBlankAutoLaunch && !isCloaked() && !launchAboutBlank()) {
      toasts.show(
        {
          title: "Popup blocked",
          message: "Phosphur couldn't open itself in about:blank. Allow popups for this site.",
          tone: "error",
          action: { label: "Open", run: openCloaked },
        },
        0,
      );
    }

    boot();

    const statusTimer = setInterval(() => {
      if (document.visibilityState === "visible") checkStatus();
    }, STATUS_INTERVAL);
    const onVisible = () => document.visibilityState === "visible" && checkStatus();
    document.addEventListener("visibilitychange", onVisible);

    // SPA navigations don't fire load events; poll the active tab's URL.
    const urlTimer = setInterval(() => browser.syncUrl(browser.state.activeId), 1000);

    return () => {
      clearInterval(statusTimer);
      clearInterval(urlTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  });
</script>

<svelte:window onkeydowncapture={handleKey} />

<div class="shell">
  <header class="chrome">
    <div class="strip">
      <TabStrip />
    </div>
    <Toolbar {status} {menuItems} onCheckStatus={checkStatus} onShowTabs={() => sheet.show()} />
    <ProgressBar loading={browser.active.loading} />
  </header>
  <main class="viewport">
    {#each panels as tab (tab.id)}
      <TabPanel {tab} active={tab.id === browser.state.activeId} />
    {/each}
  </main>
</div>

<TabSheet bind:this={sheet} />
<Toasts />

{#if fatal}
  <ErrorCard kind={fatal.kind} message={fatal.message} detail={fatal.detail} />
{/if}

<style>
  .shell {
    display: grid;
    /* minmax(0, …) so a long tab strip scrolls instead of widening the window. */
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    height: 100dvh;
  }

  .chrome {
    position: relative;
    z-index: 10;
  }

  .viewport {
    position: relative;
    min-height: 0;
    overflow: hidden;
  }

  @media (max-width: 640px) {
    .strip {
      display: none;
    }
  }
</style>

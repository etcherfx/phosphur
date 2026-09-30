<script lang="ts">
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import RotateCw from "@lucide/svelte/icons/rotate-cw";
  import X from "@lucide/svelte/icons/x";
  import { isWebUrl } from "../lib/internal.ts";
  import { browser } from "../lib/state/browser.svelte.ts";
  import { canGoBack, canGoForward, currentUrl } from "../lib/tabs.ts";
  import type { WispStatus } from "../lib/wisp-status.ts";
  import Menu, { type MenuItem } from "./Menu.svelte";
  import Omnibox from "./Omnibox.svelte";
  import StatusDot from "./StatusDot.svelte";

  let {
    status,
    menuItems,
    onCheckStatus,
    onShowTabs,
  }: {
    status: WispStatus;
    menuItems: MenuItem[];
    onCheckStatus: () => void;
    onShowTabs: () => void;
  } = $props();

  const tab = $derived(browser.active);
</script>

<div class="toolbar">
  <div class="nav">
    <button
      class="icon"
      type="button"
      aria-label="Back"
      title="Back"
      disabled={!canGoBack(tab)}
      onclick={() => browser.back(tab.id)}
    >
      <ArrowLeft size={18} />
    </button>
    <button
      class="icon"
      type="button"
      aria-label="Forward"
      title="Forward"
      disabled={!canGoForward(tab)}
      onclick={() => browser.forward(tab.id)}
    >
      <ArrowRight size={18} />
    </button>
    {#if tab.loading}
      <button
        class="icon"
        type="button"
        aria-label="Stop"
        title="Stop"
        onclick={() => browser.stop(tab.id)}
      >
        <X size={18} />
      </button>
    {:else}
      <button
        class="icon"
        type="button"
        aria-label="Reload"
        title="Reload (Ctrl+R)"
        disabled={!isWebUrl(currentUrl(tab))}
        onclick={() => browser.reload(tab.id)}
      >
        <RotateCw size={17} />
      </button>
    {/if}
  </div>

  <Omnibox />

  <button
    class="tab-count"
    type="button"
    aria-label="Show tabs ({browser.tabs.length} open)"
    onclick={onShowTabs}
  >
    {browser.tabs.length > 99 ? "99+" : browser.tabs.length}
  </button>
  <StatusDot {status} onclick={onCheckStatus} />
  <Menu items={menuItems} />
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: 48px;
    padding: 0 var(--space-2);
    background: var(--layer);
    border-bottom: 1px solid var(--border);
  }

  .nav {
    display: flex;
    gap: 2px;
  }

  .icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: none;
    color: var(--text-muted);
  }

  .icon:hover:not(:disabled) {
    background: var(--hover);
    color: var(--text);
  }

  .icon:disabled {
    color: var(--text-faint);
    opacity: 0.45;
    cursor: default;
  }

  .tab-count {
    display: none;
    place-items: center;
    flex: none;
    min-width: 26px;
    height: 26px;
    padding: 0 4px;
    border: 2px solid var(--text-muted);
    border-radius: var(--radius-sm);
    background: none;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 700;
    line-height: 1;
  }

  @media (max-width: 640px) {
    .toolbar {
      gap: var(--space-1);
      padding: 0 var(--space-1);
    }

    .tab-count {
      display: grid;
    }

    .nav .icon:nth-child(2) {
      display: none;
    }
  }
</style>

<script lang="ts">
  import { onMount } from "svelte";
  import { internalPage } from "../lib/internal.ts";
  import { browser } from "../lib/state/browser.svelte.ts";
  import { tabLabel } from "../lib/tab-label.ts";
  import { currentUrl, type Tab } from "../lib/tabs.ts";
  import InternalPage from "./pages/InternalPage.svelte";

  let { tab, active }: { tab: Tab; active: boolean } = $props();

  let iframe: HTMLIFrameElement;
  const page = $derived(internalPage(currentUrl(tab)));

  onMount(() => {
    const id = tab.id;
    browser.attach(id, iframe);
    return () => browser.detach(id);
  });
</script>

<div
  class="panel"
  class:active
  id="panel-{tab.id}"
  role="tabpanel"
  aria-labelledby="tab-{tab.id}"
  inert={!active}
>
  <iframe
    bind:this={iframe}
    class:hidden={page !== null}
    title={tabLabel(tab)}
    allow="fullscreen; autoplay; clipboard-read; clipboard-write; encrypted-media; picture-in-picture"
    allowfullscreen
  ></iframe>
  {#if page}
    <div class="internal">
      <InternalPage {page} tabId={tab.id} />
    </div>
  {/if}
</div>

<style>
  .panel {
    position: absolute;
    inset: 0;
    visibility: hidden;
  }

  .panel.active {
    visibility: visible;
  }

  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: #fff;
  }

  iframe.hidden {
    visibility: hidden;
  }

  .internal {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    background: var(--surface-0);
  }
</style>

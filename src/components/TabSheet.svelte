<script lang="ts">
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import { fade, flip, rise } from "../lib/motion.ts";
  import { browser } from "../lib/state/browser.svelte.ts";
  import { tabLabel } from "../lib/tab-label.ts";
  import { currentUrl } from "../lib/tabs.ts";
  import Favicon from "./Favicon.svelte";

  let open = $state(false);

  export function show() {
    open = true;
  }

  // The dialog leaves the DOM (and the top layer) only once its exit transition ends.
  function hide() {
    open = false;
  }

  function modal(node: HTMLDialogElement) {
    node.showModal();
  }

  function pick(id: string) {
    browser.activate(id);
    hide();
  }

  function newTab() {
    hide();
    browser.open();
  }
</script>

{#if open}
  <dialog
    use:modal
    class="sheet"
    aria-label="Open tabs"
    transition:rise
    onoutrostart={(e) => e.currentTarget.classList.add("closing")}
    oncancel={(e) => {
      e.preventDefault();
      hide();
    }}
    onclick={(e) => e.target === e.currentTarget && hide()}
  >
    <header>
      <h2>Tabs <span class="count">{browser.tabs.length}</span></h2>
      <button class="icon" type="button" aria-label="Close" onclick={hide}>
        <X size={18} />
      </button>
    </header>
    <ul>
      {#each browser.tabs as tab (tab.id)}
        {@const label = tabLabel(tab)}
        {@const active = tab.id === browser.state.activeId}
        <li class:active out:fade animate:flip>
          <button class="pick" type="button" aria-current={active} onclick={() => pick(tab.id)}>
            <Favicon src={tab.favicon} url={currentUrl(tab)} title={label} size={20} />
            <span class="title">{label}</span>
          </button>
          <button
            class="icon"
            type="button"
            aria-label="Close {label}"
            onclick={() => browser.close(tab.id)}
          >
            <X size={16} />
          </button>
        </li>
      {/each}
    </ul>
    <button class="new" type="button" onclick={newTab}>
      <Plus size={18} /> New tab
    </button>
  </dialog>
{/if}

<style>
  .sheet {
    width: 100%;
    max-width: 520px;
    max-height: 80dvh;
    margin: auto auto 0;
    padding: var(--space-3) var(--space-3) calc(var(--space-4) + env(safe-area-inset-bottom));
    border: 1px solid var(--border);
    border-bottom: 0;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    background: var(--raised);
    color: var(--text);
    box-shadow: var(--shadow-lg);
  }

  .sheet[open] {
    display: flex;
    flex-direction: column;
  }

  /* ::backdrop isn't an element, so it can't take a Svelte transition; it eases with CSS. */
  .sheet::backdrop {
    background: var(--scrim);
    animation: backdrop-in var(--duration-slow) var(--ease-out);
    transition: opacity var(--duration-slow) var(--ease-in);
  }

  .sheet.closing::backdrop {
    opacity: 0;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-1) var(--space-2);
  }

  h2 {
    margin: 0;
    font-size: var(--text-md);
    font-weight: 600;
  }

  .count {
    margin-left: var(--space-1);
    color: var(--text-faint);
    font-family: var(--font-mono);
  }

  ul {
    flex: 1;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    border-radius: var(--radius-md);
  }

  li.active {
    background: var(--accent-soft);
  }

  .pick {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex: 1;
    min-width: 0;
    min-height: 48px;
    padding: 0 var(--space-3);
    border: 0;
    background: none;
    text-align: left;
  }

  .title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: none;
    color: var(--text-muted);
  }

  .new {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: 44px;
    margin-top: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--raised-hover);
  }

  @keyframes backdrop-in {
    from {
      opacity: 0;
    }
  }
</style>

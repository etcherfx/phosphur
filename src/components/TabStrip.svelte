<script lang="ts">
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import { browser } from "../lib/state/browser.svelte.ts";
  import { tabLabel } from "../lib/tab-label.ts";
  import { currentUrl } from "../lib/tabs.ts";
  import Favicon from "./Favicon.svelte";

  let dragIndex = $state<number | null>(null);
  let dropIndex = $state<number | null>(null);
  let strip: HTMLDivElement;

  function focusTab(index: number) {
    const tab = browser.tabs[index];
    if (!tab) return;
    browser.activate(tab.id);
    strip.querySelector<HTMLElement>(`#tab-${tab.id}`)?.focus();
  }

  function onKeydown(event: KeyboardEvent, index: number, id: string) {
    const last = browser.tabs.length - 1;
    switch (event.key) {
      case "ArrowRight":
        focusTab(index === last ? 0 : index + 1);
        break;
      case "ArrowLeft":
        focusTab(index === 0 ? last : index - 1);
        break;
      case "Home":
        focusTab(0);
        break;
      case "End":
        focusTab(last);
        break;
      case "Delete":
        browser.close(id);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  function onDragStart(event: DragEvent, index: number) {
    dragIndex = index;
    event.dataTransfer?.setData("text/plain", String(index));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(event: DragEvent, index: number) {
    if (dragIndex === null) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    const { left, width } = target.getBoundingClientRect();
    const after = event.clientX > left + width / 2;
    dropIndex = index + (after ? 1 : 0);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    if (dragIndex !== null && dropIndex !== null) {
      const to = dropIndex > dragIndex ? dropIndex - 1 : dropIndex;
      browser.reorder(dragIndex, to);
    }
    onDragEnd();
  }

  function onDragEnd() {
    dragIndex = null;
    dropIndex = null;
  }
</script>

<div class="strip">
  <div class="tabs" role="tablist" aria-label="Tabs" bind:this={strip}>
    {#each browser.tabs as tab, index (tab.id)}
      {@const active = tab.id === browser.state.activeId}
      {@const label = tabLabel(tab)}
      <div
        id="tab-{tab.id}"
        class="tab"
        class:active
        class:dragging={dragIndex === index}
        class:drop-before={dropIndex === index && dragIndex !== null}
        class:drop-after={dropIndex === index + 1 && index === browser.tabs.length - 1}
        role="tab"
        tabindex={active ? 0 : -1}
        aria-selected={active}
        aria-controls="panel-{tab.id}"
        aria-label={label}
        title={label}
        draggable="true"
        onclick={() => browser.activate(tab.id)}
        onauxclick={(e) => e.button === 1 && browser.close(tab.id)}
        onkeydown={(e) => onKeydown(e, index, tab.id)}
        ondragstart={(e) => onDragStart(e, index)}
        ondragover={(e) => onDragOver(e, index)}
        ondrop={onDrop}
        ondragend={onDragEnd}
      >
        {#if tab.loading}
          <span class="spinner" aria-hidden="true"></span>
        {:else}
          <Favicon src={tab.favicon} url={currentUrl(tab)} title={label} size={16} />
        {/if}
        <span class="title">{label}</span>
        <button
          class="close"
          type="button"
          tabindex="-1"
          aria-label="Close {label}"
          onclick={(e) => {
            e.stopPropagation();
            browser.close(tab.id);
          }}
        >
          <X size={14} strokeWidth={2.25} />
        </button>
      </div>
    {/each}
  </div>
  <button
    class="new-tab"
    type="button"
    aria-label="New tab"
    title="New tab (Alt+T)"
    onclick={() => browser.open()}
  >
    <Plus size={18} />
  </button>
</div>

<style>
  .strip {
    display: flex;
    align-items: flex-end;
    gap: var(--space-1);
    min-width: 0;
    padding: var(--space-2) var(--space-2) 0;
  }

  .tabs {
    display: flex;
    gap: 2px;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 0 1 220px;
    min-width: 72px;
    height: 36px;
    padding: 0 var(--space-2) 0 var(--space-3);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    color: var(--text-muted);
    font-size: var(--text-sm);
    cursor: default;
    user-select: none;
    transition:
      background var(--duration-fast) ease,
      color var(--duration-fast) ease;
  }

  .tab:hover {
    background: var(--hover);
    color: var(--text);
  }

  /* The active tab shares the toolbar's layer, so the two read as one surface. */
  .tab.active {
    background: var(--layer);
    color: var(--text);
  }

  /* Concave "ears" where the active tab meets the toolbar. */
  .tab.active::before {
    --ear: var(--radius-md);
    content: "";
    position: absolute;
    right: calc(-1 * var(--ear));
    bottom: 0;
    left: calc(-1 * var(--ear));
    height: var(--ear);
    background:
      radial-gradient(circle at 0 0, transparent var(--ear), var(--layer) calc(var(--ear) + 0.5px))
        left bottom / var(--ear) var(--ear) no-repeat,
      radial-gradient(
          circle at 100% 0,
          transparent var(--ear),
          var(--layer) calc(var(--ear) + 0.5px)
        )
        right bottom / var(--ear) var(--ear) no-repeat;
    pointer-events: none;
  }

  .tab:focus-visible {
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }

  .tab.dragging {
    opacity: 0.5;
  }

  .tab.drop-before::after,
  .tab.drop-after::after {
    content: "";
    position: absolute;
    top: 6px;
    bottom: 6px;
    width: 2px;
    background: var(--accent);
  }

  .tab.drop-before::after {
    left: -2px;
  }

  .tab.drop-after::after {
    right: -2px;
  }

  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    mask-image: linear-gradient(to right, #000 calc(100% - 16px), transparent);
  }

  .close {
    display: grid;
    place-items: center;
    flex: none;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--text-muted);
    opacity: 0;
  }

  .tab:hover .close,
  .tab.active .close,
  .tab:focus-within .close {
    opacity: 1;
  }

  .close:hover {
    background: var(--pressed);
    color: var(--text);
  }

  .spinner {
    flex: none;
    width: 14px;
    height: 14px;
    margin: 1px;
    border: 2px solid var(--accent-soft);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .new-tab {
    display: grid;
    place-items: center;
    flex: none;
    width: 30px;
    height: 30px;
    margin-bottom: 3px;
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--text-muted);
  }

  .new-tab:hover {
    background: var(--hover);
    color: var(--text);
  }
</style>

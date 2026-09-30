<script lang="ts">
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import { tick } from "svelte";
  import { flip, tabClose, tabOpen } from "../lib/motion.ts";
  import { browser } from "../lib/state/browser.svelte.ts";
  import { tabLabel } from "../lib/tab-label.ts";
  import { TAB_LAYOUT, tabWidth } from "../lib/tab-layout.ts";
  import { currentUrl } from "../lib/tabs.ts";
  import Favicon from "./Favicon.svelte";

  /** Room kept on each side of the tabs for the active tab's corner ears. */
  const EDGE = 10;
  /** How far the edge fades reach into the strip. */
  const FADE = 24;

  let dragIndex = $state<number | null>(null);
  let dropIndex = $state<number | null>(null);
  let strip: HTMLDivElement;
  let scroller: HTMLDivElement;
  let list: HTMLDivElement;
  let newTab: HTMLDivElement;

  let available = $state(0);
  let scrolledFromStart = $state(false);
  let scrolledFromEnd = $state(false);
  /** Width held while the pointer closes tabs, so the next close button lands under it. */
  let frozenWidth = $state<number | null>(null);

  const count = $derived(browser.tabs.length);
  const layout = $derived(tabWidth(available, count));
  const width = $derived(frozenWidth ?? layout.width);

  // Measure the room the tabs could fill, whether or not they fill it now.
  $effect(() => {
    const measure = () => {
      const style = getComputedStyle(strip);
      const inner =
        strip.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const gap = parseFloat(style.columnGap) || 0;
      available = Math.max(0, inner - newTab.offsetWidth - gap - 2 * EDGE);
      updateFades();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    return () => observer.disconnect();
  });

  // A new tab always gets a fresh layout, even mid-close.
  let lastCount = browser.tabs.length;
  $effect(() => {
    if (count > lastCount) frozenWidth = null;
    lastCount = count;
  });

  // Keep the active tab in view when it changes or opens.
  $effect(() => {
    const id = browser.state.activeId;
    void count;
    tick().then(() => {
      updateFades();
      revealTab(id);
    });
  });

  // Vertical wheels scroll the strip sideways. Needs a non-passive listener.
  $effect(() => {
    const onWheel = (event: WheelEvent) => {
      if (scroller.scrollWidth <= scroller.clientWidth) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      scroller.scrollLeft += event.deltaY;
    };
    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", onWheel);
  });

  function updateFades() {
    const max = scroller.scrollWidth - scroller.clientWidth;
    scrolledFromStart = scroller.scrollLeft > 1;
    scrolledFromEnd = scroller.scrollLeft < max - 1;
  }

  function revealTab(id: string) {
    const el = list?.querySelector<HTMLElement>(`#tab-${CSS.escape(id)}`);
    if (!el) return;
    const start = el.offsetLeft - FADE;
    const end = el.offsetLeft + el.offsetWidth + FADE;
    const view = scroller.scrollLeft;
    let left: number | null = null;
    if (start < view) left = start;
    else if (end > view + scroller.clientWidth) left = end - scroller.clientWidth;
    if (left === null) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }

  function focusTab(index: number) {
    const tab = browser.tabs[index];
    if (!tab) return;
    browser.activate(tab.id);
    list.querySelector<HTMLElement>(`#tab-${CSS.escape(tab.id)}`)?.focus({ preventScroll: true });
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

  function closeWithPointer(event: MouseEvent, id: string) {
    event.stopPropagation();
    frozenWidth = width;
    browser.close(id);
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

<div
  class="strip"
  bind:this={strip}
  style:--tab-gap="{TAB_LAYOUT.gap}px"
  style:--edge="{EDGE}px"
  style:--fade="{FADE}px"
  onpointerleave={() => (frozenWidth = null)}
>
  <div
    class="scroller"
    class:fade-start={scrolledFromStart}
    class:fade-end={scrolledFromEnd}
    bind:this={scroller}
    onscroll={updateFades}
  >
    <div class="tabs" role="tablist" aria-label="Tabs" bind:this={list}>
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
          style:width="{width}px"
          in:tabOpen
          out:tabClose
          animate:flip
          onintroend={() => active && revealTab(tab.id)}
          role="tab"
          tabindex={active ? 0 : -1}
          aria-selected={active}
          aria-controls="panel-{tab.id}"
          aria-label={label}
          title={label}
          draggable="true"
          onclick={() => browser.activate(tab.id)}
          onauxclick={(e) => e.button === 1 && closeWithPointer(e, tab.id)}
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
            onclick={(e) => closeWithPointer(e, tab.id)}
          >
            <X size={14} strokeWidth={2.25} />
          </button>
        </div>
      {/each}
    </div>
  </div>
  <!-- As tall as a tab, so the button centres on the tabs without offsets. -->
  <div class="new-tab-slot" bind:this={newTab}>
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
</div>

<style>
  .strip {
    --tab-height: 36px;
    display: flex;
    align-items: flex-end;
    gap: var(--space-1);
    min-width: 0;
    padding: var(--space-2) var(--space-2) 0 0;
  }

  /* Shrinks to fit its tabs, so the + button follows them until the strip is full. */
  .scroller {
    position: relative;
    flex: 0 1 auto;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
  }

  .scroller::-webkit-scrollbar {
    display: none;
  }

  /* Fade whichever edge has tabs scrolled past it. */
  .scroller.fade-start,
  .scroller.fade-end {
    --fade-start: 0px;
    --fade-end: 0px;
    mask-image: linear-gradient(
      to right,
      transparent,
      #000 var(--fade-start),
      #000 calc(100% - var(--fade-end)),
      transparent
    );
  }

  .scroller.fade-start {
    --fade-start: var(--fade);
  }

  .scroller.fade-end {
    --fade-end: var(--fade);
  }

  .tabs {
    display: flex;
    gap: var(--tab-gap);
    width: max-content;
    padding: 0 var(--edge);
  }

  .tab {
    /*
     * !important beats the inline position: absolute that animate:flip gives a leaving
     * tab. Kept in flow, its shrinking width slides the tabs after it along, instead of the
     * scroller snapping narrower while the tab still overflows it.
     */
    position: relative !important;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: none;
    height: var(--tab-height);
    padding: 0 var(--space-2) 0 var(--space-3);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    color: var(--text-muted);
    font-size: var(--text-sm);
    cursor: default;
    user-select: none;
    /* Tabs are the one thing allowed to animate layout: their width eases as the strip re-flows. */
    transition-property: background-color, color, width;
    transition-duration: var(--duration-fast), var(--duration-fast), var(--duration-slow);
    transition-timing-function: var(--ease-standard);
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

  /* Inset, so the scroller never clips it. */
  .tab:focus-visible {
    outline-offset: -2px;
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
    width: 16px;
    height: 16px;
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

  .new-tab-slot {
    display: grid;
    place-items: center;
    flex: none;
    height: var(--tab-height);
  }

  .new-tab {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    padding: 0;
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

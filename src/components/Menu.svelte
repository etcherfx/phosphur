<script lang="ts" module>
  export interface MenuItem {
    label: string;
    hint?: string;
    run: () => void;
    separatorBefore?: boolean;
  }
</script>

<script lang="ts">
  import EllipsisVertical from "@lucide/svelte/icons/ellipsis-vertical";
  import { tick } from "svelte";
  import { pop } from "../lib/motion.ts";

  let { items }: { items: MenuItem[] } = $props();

  let open = $state(false);
  let root: HTMLDivElement;
  let button: HTMLButtonElement;
  let list = $state<HTMLDivElement>();

  function entries(): HTMLElement[] {
    return list ? [...list.querySelectorAll<HTMLElement>('[role="menuitem"]')] : [];
  }

  async function show(focusLast = false) {
    open = true;
    await tick();
    const all = entries();
    (focusLast ? all.at(-1) : all[0])?.focus();
  }

  function hide(returnFocus = true) {
    open = false;
    if (returnFocus) button.focus();
  }

  function onButtonKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      show(event.key === "ArrowUp");
    }
  }

  function onMenuKeydown(event: KeyboardEvent) {
    const all = entries();
    const index = all.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => all[(to + all.length) % all.length]?.focus();
    switch (event.key) {
      case "ArrowDown":
        move(index + 1);
        break;
      case "ArrowUp":
        move(index - 1);
        break;
      case "Home":
        move(0);
        break;
      case "End":
        move(all.length - 1);
        break;
      case "Escape":
        hide();
        break;
      case "Tab":
        hide(false);
        return;
      default:
        return;
    }
    event.preventDefault();
  }

  function choose(item: MenuItem) {
    hide(false);
    item.run();
  }

  $effect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.contains(event.target as Node)) hide(false);
    };
    const onBlur = () => hide(false);
    document.addEventListener("pointerdown", onPointer, true);
    // Clicking into a tab's iframe blurs the shell window.
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("blur", onBlur);
    };
  });
</script>

<div class="menu" bind:this={root}>
  <button
    bind:this={button}
    class="trigger"
    type="button"
    aria-label="Menu"
    aria-haspopup="menu"
    aria-expanded={open}
    aria-controls="app-menu"
    onclick={() => (open ? hide(false) : show())}
    onkeydown={onButtonKeydown}
  >
    <EllipsisVertical size={18} />
  </button>
  {#if open}
    <div
      bind:this={list}
      id="app-menu"
      class="list"
      transition:pop
      role="menu"
      tabindex="-1"
      aria-label="Menu"
      onkeydown={onMenuKeydown}
    >
      {#each items as item (item.label)}
        {#if item.separatorBefore}
          <div class="separator" role="separator"></div>
        {/if}
        <button
          class="item"
          type="button"
          role="menuitem"
          tabindex="-1"
          onclick={() => choose(item)}
        >
          <span>{item.label}</span>
          {#if item.hint}<kbd>{item.hint}</kbd>{/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .menu {
    position: relative;
    flex: none;
  }

  .trigger {
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

  .trigger:hover,
  .trigger[aria-expanded="true"] {
    background: var(--hover);
    color: var(--text);
  }

  .list {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 30;
    min-width: 240px;
    padding: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--raised);
    box-shadow: var(--shadow-lg);
    transform-origin: top right;
  }

  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    width: 100%;
    min-height: var(--control-height);
    padding: 0 var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    font-size: var(--text-sm);
    text-align: left;
  }

  .item:hover,
  .item:focus-visible {
    background: var(--raised-hover);
    box-shadow: none;
  }

  .item:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  kbd {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-faint);
  }

  .separator {
    height: 1px;
    margin: var(--space-1) var(--space-2);
    background: var(--border);
  }
</style>

<script lang="ts" module>
  export interface SelectOption<T extends string = string> {
    value: T;
    label: string;
  }
</script>

<!--
  A select-only combobox (WAI-ARIA APG pattern): focus stays on the trigger and
  aria-activedescendant points at the highlighted option.
-->
<script lang="ts" generics="T extends string">
  import Check from "@lucide/svelte/icons/check";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import { tick } from "svelte";
  import { pop } from "../lib/motion.ts";

  let {
    id,
    labelledby,
    describedby,
    options,
    value,
    onchange,
  }: {
    id: string;
    labelledby: string;
    describedby?: string;
    options: SelectOption<T>[];
    value: T;
    onchange: (value: T) => void;
  } = $props();

  const MAX_HEIGHT = 320;
  const MARGIN = 8;

  let open = $state(false);
  let active = $state(0);
  let above = $state(false);
  let maxHeight = $state(MAX_HEIGHT);
  let root: HTMLDivElement;
  let trigger: HTMLDivElement;
  let listbox = $state<HTMLUListElement>();

  let typed = "";
  let typedAt = 0;

  const listId = $derived(`${id}-listbox`);
  const selectedIndex = $derived(
    Math.max(
      0,
      options.findIndex((o) => o.value === value),
    ),
  );
  const optionId = (index: number) => `${id}-option-${index}`;

  /** The part of the screen a popover can use: the viewport, cut to any scrolling ancestor. */
  function bounds(): { top: number; bottom: number } {
    let top = 0;
    let bottom = innerHeight;
    for (let el = root.parentElement; el; el = el.parentElement) {
      const { overflowY } = getComputedStyle(el);
      if (overflowY === "auto" || overflowY === "scroll" || overflowY === "hidden") {
        const rect = el.getBoundingClientRect();
        top = Math.max(top, rect.top);
        bottom = Math.min(bottom, rect.bottom);
      }
    }
    return { top, bottom };
  }

  async function show(index = selectedIndex) {
    active = index;
    open = true;
    await tick();
    if (!listbox) return;
    const rect = trigger.getBoundingClientRect();
    const { top, bottom } = bounds();
    const below = bottom - rect.bottom - MARGIN;
    const over = rect.top - top - MARGIN;
    const wanted = Math.min(listbox.scrollHeight, MAX_HEIGHT);
    above = below < wanted && over > below;
    maxHeight = Math.max(120, Math.min(MAX_HEIGHT, above ? over : below));
    reveal();
  }

  function hide(returnFocus = true) {
    open = false;
    if (returnFocus) trigger.focus();
  }

  function commit(index: number) {
    const option = options[index];
    hide();
    if (option && option.value !== value) onchange(option.value);
  }

  function move(index: number) {
    active = Math.min(options.length - 1, Math.max(0, index));
    reveal();
  }

  function reveal() {
    listbox
      ?.querySelector<HTMLElement>(`#${CSS.escape(optionId(active))}`)
      ?.scrollIntoView({ block: "nearest" });
  }

  /** Type-ahead: jumps to the next option starting with what's been typed. */
  function typeAhead(char: string) {
    const now = Date.now();
    typed = now - typedAt > 500 ? char : typed + char;
    typedAt = now;
    const query = typed.toLowerCase();
    // Repeating one letter cycles through the options that start with it.
    const needle = [...query].every((c) => c === query[0]) ? query[0] : query;
    const current = open ? active : selectedIndex;
    // A single letter moves past the current option; a longer prefix may match it.
    const from = needle.length === 1 ? current + 1 : current;
    for (let i = 0; i < options.length; i++) {
      const index = (from + i) % options.length;
      if (options[index].label.toLowerCase().startsWith(needle)) return index;
    }
    return null;
  }

  function onKeydown(event: KeyboardEvent) {
    const { key, altKey } = event;
    const printable = key.length === 1 && !event.ctrlKey && !event.metaKey && !altKey;

    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(key)) show();
      else if (key === "Home") show(0);
      else if (key === "End") show(options.length - 1);
      else if (printable) {
        const match = typeAhead(key);
        show(match ?? selectedIndex);
      } else return;
      event.preventDefault();
      return;
    }

    if (altKey && key === "ArrowUp") commit(active);
    else if (key === "ArrowDown") move(active + 1);
    else if (key === "ArrowUp") move(active - 1);
    else if (key === "Home") move(0);
    else if (key === "End") move(options.length - 1);
    else if (key === "PageDown") move(active + 10);
    else if (key === "PageUp") move(active - 10);
    else if (key === "Enter" || (key === " " && Date.now() - typedAt > 500)) commit(active);
    else if (key === "Escape") hide();
    else if (key === "Tab") {
      hide(false);
      return;
    } else if (printable) {
      const match = typeAhead(key);
      if (match !== null) move(match);
    } else return;
    event.preventDefault();
    event.stopPropagation();
  }

  $effect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.contains(event.target as Node)) hide(false);
    };
    // Clicking into a tab's iframe blurs the shell window.
    const onBlur = () => hide(false);
    document.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("blur", onBlur);
    };
  });
</script>

<div class="select" bind:this={root}>
  <div
    bind:this={trigger}
    {id}
    class="trigger"
    role="combobox"
    tabindex="0"
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls={listId}
    aria-activedescendant={open ? optionId(active) : undefined}
    aria-labelledby={labelledby}
    aria-describedby={describedby}
    onclick={() => (open ? hide() : show())}
    onkeydown={onKeydown}
    onblur={(e) => {
      // Focus left for somewhere other than the list (e.g. Shift+Tab).
      if (open && !root.contains(e.relatedTarget as Node | null)) hide(false);
    }}
  >
    <span class="value">{options[selectedIndex]?.label}</span>
    <span class="chevron" class:open aria-hidden="true"><ChevronDown size={16} /></span>
  </div>
  {#if open}
    <ul
      bind:this={listbox}
      id={listId}
      class="popover"
      class:above
      transition:pop
      role="listbox"
      tabindex="-1"
      aria-labelledby={labelledby}
      style:max-height="{maxHeight}px"
    >
      {#each options as option, index (option.value)}
        <!-- Keyboard use goes through the combobox, which owns focus. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          id={optionId(index)}
          class="option"
          class:active={index === active}
          role="option"
          aria-selected={index === active}
          onpointermove={() => (active = index)}
          onpointerdown={(e) => e.preventDefault()}
          onclick={() => commit(index)}
        >
          <span class="label">{option.label}</span>
          <span class="check" aria-hidden="true">
            {#if option.value === value}<Check size={16} />{/if}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .select {
    position: relative;
    flex: none;
    min-width: 200px;
  }

  .trigger {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: var(--control-height);
    padding: 0 var(--space-2) 0 var(--space-3);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    background: var(--field);
    color: var(--text);
    font-size: var(--text-sm);
    cursor: pointer;
    user-select: none;
  }

  .trigger:hover {
    background: var(--field-hover);
  }

  .trigger:focus-visible,
  .trigger[aria-expanded="true"] {
    border-color: var(--accent);
  }

  .trigger:focus-visible {
    outline-offset: -1px;
  }

  .value {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .chevron {
    display: grid;
    place-items: center;
    flex: none;
    width: 20px;
    height: 20px;
    color: var(--text-muted);
  }

  .chevron {
    transition: transform var(--duration-med) var(--ease-standard);
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .popover {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    left: 0;
    z-index: 20;
    margin: 0;
    padding: var(--space-1);
    overflow-y: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--raised);
    box-shadow: var(--shadow-lg);
    list-style: none;
    overscroll-behavior: contain;
    transform-origin: top center;
  }

  .popover.above {
    top: auto;
    bottom: calc(100% + 4px);
    transform-origin: bottom center;
  }

  .option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--control-height);
    padding: 0 var(--space-2) 0 var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .option.active {
    background: var(--raised-hover);
  }

  .option .label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .check {
    display: grid;
    place-items: center;
    flex: none;
    width: 20px;
    height: 20px;
    color: var(--accent);
  }
</style>

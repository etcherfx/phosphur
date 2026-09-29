<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import Star from "@lucide/svelte/icons/star";
  import { dataEvents, isBookmarked, toggleBookmark } from "../lib/db.ts";
  import { isWebUrl, NEW_TAB_URL } from "../lib/internal.ts";
  import { searchTemplate } from "../lib/settings.ts";
  import { browser } from "../lib/state/browser.svelte.ts";
  import { settings } from "../lib/state/settings.svelte.ts";
  import { toasts } from "../lib/state/toasts.svelte.ts";
  import { urlParts } from "../lib/tab-label.ts";
  import { currentUrl } from "../lib/tabs.ts";

  const tab = $derived(browser.active);
  const url = $derived(currentUrl(tab));
  const shown = $derived(url === NEW_TAB_URL ? "" : url);
  const parts = $derived(urlParts(shown));

  let input: HTMLInputElement;
  let focused = $state(false);
  let draft = $state("");
  let bookmarked = $state(false);

  // Keep the box in sync with the tab unless the user is typing.
  $effect(() => {
    const value = shown;
    if (!focused) draft = value;
  });

  $effect(() => {
    if (browser.omniboxFocusRequest > 0) {
      input.focus();
      input.select();
    }
  });

  $effect(() => {
    const target = url;
    const refresh = () => {
      if (!isWebUrl(target)) {
        bookmarked = false;
        return;
      }
      isBookmarked(target).then(
        (value) => {
          if (target === url) bookmarked = value;
        },
        () => (bookmarked = false),
      );
    };
    refresh();
    dataEvents.addEventListener("change", refresh);
    return () => dataEvents.removeEventListener("change", refresh);
  });

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (browser.submit(tab.id, draft, searchTemplate(settings.current))) {
      input.blur();
      browser.focusFrame(tab.id);
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      draft = shown;
      input.blur();
    }
  }

  async function onStar() {
    try {
      const now = await toggleBookmark(url, tab.title);
      toasts.show({ message: now ? "Bookmark added" : "Bookmark removed", tone: "info" }, 2500);
    } catch {
      toasts.show({ message: "Couldn't save the bookmark.", tone: "error" });
    }
  }
</script>

<form class="omnibox" class:focused role="search" onsubmit={submit}>
  <Search size={16} class="omnibox-icon" aria-hidden="true" />
  <div class="field">
    <input
      bind:this={input}
      bind:value={draft}
      class:dimmed={!focused && shown !== ""}
      type="text"
      inputmode="url"
      enterkeyhint="go"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      aria-label="Search or enter address"
      placeholder="Search or enter address"
      onfocus={() => {
        focused = true;
        // select() can re-focus the input, so skip it if focus already moved on.
        requestAnimationFrame(() => document.activeElement === input && input.select());
      }}
      onblur={() => (focused = false)}
      onkeydown={onKeydown}
    />
    {#if !focused && shown}
      <div class="display" aria-hidden="true">
        <span class="muted">{parts.before}</span><span class="host">{parts.host}</span><span
          class="muted">{parts.after}</span
        >
      </div>
    {/if}
  </div>
  {#if isWebUrl(url)}
    <button
      class="star"
      class:on={bookmarked}
      type="button"
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark this page"}
      title={bookmarked ? "Remove bookmark" : "Bookmark this page"}
      onclick={onStar}
    >
      <Star size={16} fill={bookmarked ? "currentColor" : "none"} />
    </button>
  {/if}
</form>

<style>
  .omnibox {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1;
    min-width: 0;
    height: 36px;
    padding: 0 var(--space-1) 0 var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    background: var(--surface-1);
    color: var(--text-muted);
    transition:
      border-color var(--duration-fast) ease,
      box-shadow var(--duration-fast) ease;
  }

  .omnibox:hover {
    border-color: var(--border-strong);
  }

  .omnibox.focused {
    border-color: var(--accent-line);
    box-shadow: var(--glow-md);
  }

  .omnibox :global(.omnibox-icon) {
    flex: none;
  }

  .field {
    position: relative;
    flex: 1;
    min-width: 0;
    height: 100%;
  }

  input,
  .display {
    position: absolute;
    inset: 0;
    width: 100%;
    padding: 0;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 34px;
    white-space: nowrap;
  }

  input {
    border: 0;
    background: none;
    color: var(--text);
  }

  input::placeholder {
    font-family: var(--font-ui);
    color: var(--text-faint);
  }

  input:focus-visible {
    box-shadow: none;
  }

  input.dimmed {
    color: transparent;
  }

  .display {
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
  }

  .muted {
    color: var(--text-faint);
  }

  .host {
    color: var(--text);
  }

  .star {
    display: grid;
    place-items: center;
    flex: none;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: var(--radius-pill);
    background: none;
    color: var(--text-muted);
  }

  .star:hover {
    background: var(--surface-3);
    color: var(--text);
  }

  .star.on {
    color: var(--accent);
  }
</style>

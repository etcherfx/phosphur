<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import { onMount } from "svelte";
  import {
    dataEvents,
    listBookmarks,
    listHistory,
    type Bookmark,
    type HistoryEntry,
  } from "../../lib/db.ts";
  import { internalUrl } from "../../lib/internal.ts";
  import { displayHost } from "../../lib/monogram.ts";
  import { SEARCH_ENGINES, searchTemplate } from "../../lib/settings.ts";
  import { browser } from "../../lib/state/browser.svelte.ts";
  import { settings } from "../../lib/state/settings.svelte.ts";
  import Logo from "../Logo.svelte";
  import Monogram from "../Monogram.svelte";
  import { follow } from "./links.ts";

  let { tabId }: { tabId: string } = $props();

  let query = $state("");
  let now = $state(new Date());
  let bookmarks = $state.raw<Bookmark[]>([]);
  let recent = $state.raw<HistoryEntry[]>([]);

  const engineName = $derived(
    settings.current.searchEngine === "custom"
      ? "the web"
      : SEARCH_ENGINES[settings.current.searchEngine].name,
  );
  const time = $derived(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const date = $derived(
    now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }),
  );

  async function load() {
    try {
      [bookmarks, recent] = await Promise.all([listBookmarks(), listHistory(6)]);
    } catch {
      // IndexedDB unavailable (e.g. some private modes); show an empty page.
    }
  }

  onMount(() => {
    load();
    dataEvents.addEventListener("change", load);
    const timer = setInterval(() => (now = new Date()), 10_000);
    return () => {
      dataEvents.removeEventListener("change", load);
      clearInterval(timer);
    };
  });

  function submit(event: SubmitEvent) {
    event.preventDefault();
    browser.submit(tabId, query, searchTemplate(settings.current));
  }
</script>

<div class="newtab">
  <header class="hero">
    <div class="brand">
      <Logo size={44} />
      <span class="wordmark">Phosphur</span>
    </div>
    <p class="clock">
      <time datetime={now.toISOString()}>{time}</time>
      <span class="date">{date}</span>
    </p>
  </header>

  <form class="search" role="search" onsubmit={submit}>
    <Search size={20} aria-hidden="true" />
    <input
      bind:value={query}
      type="search"
      enterkeyhint="search"
      autocomplete="off"
      spellcheck="false"
      aria-label="Search {engineName} or enter an address"
      placeholder="Search {engineName} or enter an address"
    />
  </form>

  <section aria-labelledby="nt-bookmarks">
    <div class="section-head">
      <h2 id="nt-bookmarks">Bookmarks</h2>
      <a href={internalUrl("bookmarks")} onclick={(e) => follow(e, tabId, internalUrl("bookmarks"))}
        >All bookmarks</a
      >
    </div>
    {#if bookmarks.length === 0}
      <p class="empty">Star a page to pin it here.</p>
    {:else}
      <ul class="tiles">
        {#each bookmarks.slice(0, 12) as bookmark (bookmark.url)}
          <li>
            <a
              class="tile"
              href={bookmark.url}
              title={bookmark.title}
              onclick={(e) => follow(e, tabId, bookmark.url)}
              onauxclick={(e) => follow(e, tabId, bookmark.url)}
            >
              <Monogram url={bookmark.url} title={bookmark.title} size={44} />
              <span class="tile-label">{bookmark.title || displayHost(bookmark.url)}</span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section aria-labelledby="nt-recent">
    <div class="section-head">
      <h2 id="nt-recent">Recently visited</h2>
      <a href={internalUrl("history")} onclick={(e) => follow(e, tabId, internalUrl("history"))}
        >All history</a
      >
    </div>
    {#if recent.length === 0}
      <p class="empty">Pages you visit will show up here.</p>
    {:else}
      <ul class="recent">
        {#each recent as entry (entry.id)}
          <li>
            <a
              href={entry.url}
              onclick={(e) => follow(e, tabId, entry.url)}
              onauxclick={(e) => follow(e, tabId, entry.url)}
            >
              <Monogram url={entry.url} title={entry.title} size={28} />
              <span class="recent-title">{entry.title || entry.url}</span>
              <span class="recent-host">{displayHost(entry.url)}</span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .newtab {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    width: min(720px, 100%);
    margin: 0 auto;
    padding: clamp(var(--space-5), 8vh, 96px) var(--space-4) var(--space-7);
    background: radial-gradient(
      ellipse 60% 40% at 50% 0%,
      color-mix(in srgb, var(--accent) 7%, transparent),
      transparent 70%
    );
  }

  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    text-align: center;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .wordmark {
    font-size: var(--text-2xl);
    font-weight: 650;
    letter-spacing: -0.03em;
  }

  .clock {
    display: flex;
    flex-direction: column;
    margin: 0;
  }

  time {
    font-family: var(--font-mono);
    font-size: var(--text-xl);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  .date {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  .search {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: 56px;
    padding: 0 var(--space-5);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text-muted);
    transition:
      border-color var(--duration-fast) ease,
      box-shadow var(--duration-fast) ease;
  }

  .search:focus-within {
    border-color: var(--accent-line);
    box-shadow: var(--glow-md);
  }

  .search input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    background: none;
    font-size: var(--text-lg);
  }

  .search input:focus-visible {
    box-shadow: none;
  }

  .search input::placeholder {
    color: var(--text-faint);
  }

  .search input::-webkit-search-cancel-button {
    display: none;
  }

  .section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }

  h2 {
    margin: 0;
    color: var(--text-muted);
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .section-head a {
    font-size: var(--text-sm);
    text-decoration: none;
  }

  .section-head a:hover {
    text-decoration: underline;
  }

  .empty {
    margin: 0;
    color: var(--text-faint);
    font-size: var(--text-sm);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: var(--space-2);
  }

  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-2);
    border-radius: var(--radius-md);
    color: var(--text);
    text-decoration: none;
  }

  .tile:hover {
    background: var(--surface-2);
  }

  .tile-label {
    max-width: 100%;
    overflow: hidden;
    font-size: var(--text-xs);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .recent a {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2);
    border-radius: var(--radius-md);
    color: var(--text);
    text-decoration: none;
  }

  .recent a:hover {
    background: var(--surface-2);
  }

  .recent-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: var(--text-sm);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .recent-host {
    color: var(--text-faint);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }
</style>

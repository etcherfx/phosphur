<script lang="ts">
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import X from "@lucide/svelte/icons/x";
  import { onMount } from "svelte";
  import {
    clearHistory,
    dataEvents,
    deleteHistoryEntry,
    listHistory,
    type HistoryEntry,
  } from "../../lib/db.ts";
  import { displayHost } from "../../lib/monogram.ts";
  import { fade, flip } from "../../lib/motion.ts";
  import { toasts } from "../../lib/state/toasts.svelte.ts";
  import Monogram from "../Monogram.svelte";
  import { follow } from "./links.ts";

  let { tabId }: { tabId: string } = $props();

  let query = $state("");
  let entries = $state.raw<HistoryEntry[]>([]);
  let loaded = $state(false);

  // Entries arrive newest first, so each day's group is contiguous.
  const groups = $derived.by(() => {
    const result: [string, HistoryEntry[]][] = [];
    for (const entry of entries) {
      const day = dayLabel(entry.visitedAt);
      const last = result.at(-1);
      if (last?.[0] === day) last[1].push(entry);
      else result.push([day, [entry]]);
    }
    return result;
  });

  function dayLabel(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
    });
  }

  function timeLabel(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  async function load() {
    try {
      entries = await listHistory(500, query);
    } catch {
      entries = [];
    }
    loaded = true;
  }

  onMount(() => {
    dataEvents.addEventListener("change", load);
    return () => dataEvents.removeEventListener("change", load);
  });

  $effect(() => {
    void query;
    load();
  });

  async function clearAll() {
    if (!confirm("Clear all browsing history? This can't be undone.")) return;
    try {
      await clearHistory();
      toasts.show({ message: "History cleared", tone: "success" }, 2500);
    } catch {
      toasts.show({ message: "Couldn't clear history.", tone: "error" });
    }
  }
</script>

<div class="page">
  <header>
    <h1>History</h1>
    <div class="actions">
      <input
        bind:value={query}
        type="search"
        placeholder="Search history"
        aria-label="Search history"
        autocomplete="off"
      />
      <button
        class="danger"
        type="button"
        onclick={clearAll}
        disabled={entries.length === 0 && !query}
      >
        <Trash2 size={16} /> Clear all
      </button>
    </div>
  </header>

  {#if loaded && entries.length === 0}
    <p class="empty">
      {query ? "No matching pages." : "Your history is empty. It's stored only in this browser."}
    </p>
  {/if}

  {#each groups as [day, items] (day)}
    <section aria-label={day}>
      <h2>{day}</h2>
      <ul>
        {#each items as entry (entry.id)}
          <li out:fade animate:flip>
            <span class="time">{timeLabel(entry.visitedAt)}</span>
            <a
              href={entry.url}
              title={entry.url}
              onclick={(e) => follow(e, tabId, entry.url)}
              onauxclick={(e) => follow(e, tabId, entry.url)}
            >
              <Monogram url={entry.url} title={entry.title} size={24} />
              <span class="title">{entry.title || entry.url}</span>
              <span class="host">{displayHost(entry.url)}</span>
            </a>
            <button
              class="remove"
              type="button"
              aria-label="Remove {entry.title || entry.url} from history"
              onclick={() => deleteHistoryEntry(entry.id)}
            >
              <X size={16} />
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</div>

<style>
  .time {
    flex: none;
    min-width: 8ch;
    white-space: nowrap;
    color: var(--text-faint);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
  }
</style>

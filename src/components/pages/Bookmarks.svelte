<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import { onMount } from "svelte";
  import { dataEvents, listBookmarks, removeBookmark, type Bookmark } from "../../lib/db.ts";
  import { displayHost } from "../../lib/monogram.ts";
  import { fade, flip } from "../../lib/motion.ts";
  import Monogram from "../Monogram.svelte";
  import { follow } from "./links.ts";

  let { tabId }: { tabId: string } = $props();

  let bookmarks = $state.raw<Bookmark[]>([]);
  let loaded = $state(false);

  async function load() {
    try {
      bookmarks = await listBookmarks();
    } catch {
      bookmarks = [];
    }
    loaded = true;
  }

  onMount(() => {
    load();
    dataEvents.addEventListener("change", load);
    return () => dataEvents.removeEventListener("change", load);
  });
</script>

<div class="page">
  <header>
    <h1>Bookmarks</h1>
  </header>

  {#if loaded && bookmarks.length === 0}
    <p class="empty">No bookmarks yet. Use the star in the address bar to save a page.</p>
  {:else}
    <ul>
      {#each bookmarks as bookmark (bookmark.url)}
        <li out:fade animate:flip>
          <a
            href={bookmark.url}
            title={bookmark.url}
            onclick={(e) => follow(e, tabId, bookmark.url)}
            onauxclick={(e) => follow(e, tabId, bookmark.url)}
          >
            <Monogram url={bookmark.url} title={bookmark.title} size={28} />
            <span class="title">{bookmark.title || bookmark.url}</span>
            <span class="host">{displayHost(bookmark.url)}</span>
          </a>
          <button
            class="remove"
            type="button"
            aria-label="Remove bookmark {bookmark.title || bookmark.url}"
            onclick={() => removeBookmark(bookmark.url)}
          >
            <X size={16} />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

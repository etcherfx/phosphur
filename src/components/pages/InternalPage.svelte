<script lang="ts">
  import type { InternalPage } from "../../lib/internal.ts";
  import Bookmarks from "./Bookmarks.svelte";
  import History from "./History.svelte";
  import NewTab from "./NewTab.svelte";
  import Settings from "./Settings.svelte";

  let { page, tabId }: { page: InternalPage; tabId: string } = $props();
</script>

{#if page === "settings"}
  <Settings />
{:else if page === "history"}
  <History {tabId} />
{:else if page === "bookmarks"}
  <Bookmarks {tabId} />
{:else}
  <NewTab {tabId} />
{/if}

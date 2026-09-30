<script lang="ts">
  import type { InternalPage } from "../../lib/internal.ts";
  import { fade } from "../../lib/motion.ts";
  import Bookmarks from "./Bookmarks.svelte";
  import History from "./History.svelte";
  import NewTab from "./NewTab.svelte";
  import Settings from "./Settings.svelte";

  let { page, tabId }: { page: InternalPage; tabId: string } = $props();
</script>

<!-- Fades in whenever the tab switches to a different internal page. -->
{#key page}
  <div in:fade>
    {#if page === "settings"}
      <Settings />
    {:else if page === "history"}
      <History {tabId} />
    {:else if page === "bookmarks"}
      <Bookmarks {tabId} />
    {:else}
      <NewTab {tabId} />
    {/if}
  </div>
{/key}

<script lang="ts">
  import { isInternalUrl } from "../lib/internal.ts";
  import Logo from "./Logo.svelte";
  import Monogram from "./Monogram.svelte";

  let {
    src,
    url,
    title = "",
    size = 16,
  }: { src: string | null; url: string; title?: string; size?: number } = $props();

  let failedSrc = $state<string | null>(null);
</script>

{#if isInternalUrl(url)}
  <Logo {size} glow={false} />
{:else if src && failedSrc !== src}
  <img
    class="favicon"
    {src}
    alt=""
    width={size}
    height={size}
    style:--size="{size}px"
    decoding="async"
    onerror={() => (failedSrc = src)}
  />
{:else}
  <Monogram {url} {title} {size} />
{/if}

<style>
  .favicon {
    flex: none;
    width: var(--size);
    height: var(--size);
    object-fit: contain;
    border-radius: 3px;
  }
</style>

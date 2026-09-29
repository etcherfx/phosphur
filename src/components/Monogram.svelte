<script lang="ts">
  import { monogram } from "../lib/monogram.ts";

  let { url, title = "", size = 32 }: { url: string; title?: string; size?: number } = $props();
  const mark = $derived(monogram(url, title));
</script>

<span class="monogram" style:--hue={mark.hue} style:--size="{size}px" aria-hidden="true"
  >{mark.letter}</span
>

<style>
  .monogram {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: var(--size);
    height: var(--size);
    border-radius: calc(var(--size) * 0.3);
    font-size: calc(var(--size) * 0.46);
    font-weight: 650;
    line-height: 1;
    color: hsl(var(--hue) 70% 78%);
    background: hsl(var(--hue) 35% 18%);
    border: 1px solid hsl(var(--hue) 40% 28%);
    user-select: none;
  }

  :global([data-theme="light"]) .monogram {
    color: hsl(var(--hue) 55% 28%);
    background: hsl(var(--hue) 60% 92%);
    border-color: hsl(var(--hue) 40% 80%);
  }
</style>

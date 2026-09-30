<script lang="ts">
  /** Decorative by default; pass alt where the logo stands for the name. */
  let { size = 32, alt = "" }: { size?: number; alt?: string } = $props();
</script>

<img
  class="logo"
  src="/icons/logo-64.png"
  srcset="/icons/logo-32.png 32w, /icons/logo-64.png 64w, /icons/logo-128.png 128w, /icons/icon-192.png 192w, /icons/logo-256.png 256w"
  sizes="{size}px"
  width={size}
  height={size}
  {alt}
  decoding="async"
  draggable="false"
/>

<style>
  .logo {
    flex: none;
    object-fit: contain;
  }
</style>

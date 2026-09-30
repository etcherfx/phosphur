<script lang="ts">
  let { size = 32 }: { size?: number } = $props();
</script>

<img
  class="logo"
  src="/icons/logo-64.png"
  srcset="/icons/logo-32.png 32w, /icons/logo-64.png 64w, /icons/logo-128.png 128w, /icons/icon-192.png 192w"
  sizes="{size}px"
  width={size}
  height={size}
  alt=""
  decoding="async"
  draggable="false"
/>

<style>
  .logo {
    flex: none;
    object-fit: contain;
  }
</style>

<script lang="ts">
  let { size = 32, glow = true }: { size?: number; glow?: boolean } = $props();
  const id = `logo-${Math.random().toString(36).slice(2, 8)}`;
</script>

<svg
  class="logo"
  width={size}
  height={size}
  viewBox="0 0 64 64"
  aria-hidden="true"
  focusable="false"
>
  <defs>
    <filter {id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <g filter={glow ? `url(#${id})` : undefined}>
    <path
      d="M23 49V15h10.5a10.5 10.5 0 0 1 0 21H23"
      fill="none"
      stroke="currentColor"
      stroke-width="5.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle cx="44" cy="47" r="3.5" fill="currentColor" />
  </g>
</svg>

<style>
  .logo {
    color: var(--accent);
    flex: none;
    overflow: visible;
  }
</style>

<script lang="ts">
  let { loading }: { loading: boolean } = $props();
</script>

<div class="progress" class:loading aria-hidden="true">
  <div class="bar"></div>
</div>

<style>
  .progress {
    position: absolute;
    right: 0;
    bottom: -1px;
    left: 0;
    height: 2px;
    overflow: hidden;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--duration-med) var(--ease-standard);
  }

  .progress.loading {
    opacity: 1;
  }

  .bar {
    width: 40%;
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    animation: sweep 1.3s var(--ease-out) infinite;
  }

  @keyframes sweep {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(260%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bar {
      width: 100%;
      animation: none;
      opacity: 0.7;
    }
  }
</style>

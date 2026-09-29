<script lang="ts">
  import type { WispStatus } from "../lib/wisp-status.ts";

  let { status, onclick }: { status: WispStatus; onclick: () => void } = $props();

  const label = $derived(
    status.state === "online"
      ? `Wisp server online, ${status.latency} ms`
      : status.state === "offline"
        ? "Wisp server offline"
        : "Connecting to wisp server",
  );
</script>

<button class="status" type="button" aria-label="{label}. Check again" title={label} {onclick}>
  <span class="dot {status.state}" aria-hidden="true"></span>
  {#if status.state === "online"}
    <span class="latency" aria-hidden="true">{status.latency}<small>ms</small></span>
  {/if}
</button>
<span class="visually-hidden" role="status">{label}</span>

<style>
  .status {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
    height: 32px;
    padding: 0 var(--space-2);
    border: 0;
    border-radius: var(--radius-pill);
    background: none;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .status:hover {
    background: var(--surface-3);
    color: var(--text);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-faint);
  }

  .dot.online {
    background: var(--accent);
    box-shadow: var(--glow-sm);
  }

  .dot.offline {
    background: var(--danger);
  }

  .dot.connecting {
    background: var(--warning);
    animation: pulse 1.2s ease-in-out infinite;
  }

  small {
    margin-left: 1px;
    font-size: 0.85em;
    color: var(--text-faint);
  }

  @keyframes pulse {
    50% {
      opacity: 0.35;
    }
  }

  @media (max-width: 640px) {
    .latency {
      display: none;
    }
  }
</style>

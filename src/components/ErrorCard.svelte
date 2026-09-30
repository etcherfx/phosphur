<script lang="ts">
  import type { ProxyErrorKind } from "../lib/proxy/controller.ts";
  import Logo from "./Logo.svelte";

  let { kind, message, detail }: { kind: ProxyErrorKind; message: string; detail?: string } =
    $props();

  const TITLES: Record<ProxyErrorKind, string> = {
    insecure: "Secure connection required",
    unsupported: "Browser not supported",
    "service-worker": "Service worker unavailable",
    runtime: "Proxy failed to start",
    transport: "Transport failed to start",
  };
</script>

<div class="backdrop mica">
  <div class="card" role="alertdialog" aria-labelledby="error-title" aria-describedby="error-body">
    <Logo size={40} />
    <h1 id="error-title">{TITLES[kind]}</h1>
    <p id="error-body">{message}</p>
    {#if detail}
      <details>
        <summary>Technical details</summary>
        <pre>{detail}</pre>
      </details>
    {/if}
    <button type="button" onclick={() => location.reload()}>Try again</button>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: var(--space-4);
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
    width: min(480px, 100%);
    padding: var(--space-6);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--layer);
    box-shadow: var(--shadow-lg);
  }

  h1 {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xl);
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: var(--text-muted);
  }

  details {
    width: 100%;
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  pre {
    overflow-x: auto;
    padding: var(--space-3);
    border-radius: var(--radius-sm);
    background: var(--field);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    white-space: pre-wrap;
  }

  button {
    margin-top: var(--space-2);
    padding: var(--space-2) var(--space-5);
    border: 1px solid var(--accent-edge);
    border-radius: var(--radius-md);
    background: var(--accent-fill);
    color: var(--on-accent);
    font-weight: 600;
  }
</style>

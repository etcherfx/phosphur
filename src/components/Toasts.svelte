<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import { flip, slide } from "../lib/motion.ts";
  import { toasts } from "../lib/state/toasts.svelte.ts";
</script>

<div class="toasts" aria-live="polite" aria-relevant="additions">
  {#each toasts.items as toast (toast.id)}
    <div
      class="toast {toast.tone}"
      role={toast.tone === "error" ? "alert" : "status"}
      in:slide
      out:slide
      animate:flip
    >
      <span class="message">{toast.message}</span>
      {#if toast.action}
        {@const action = toast.action}
        <button
          class="action"
          type="button"
          onclick={() => {
            toasts.dismiss(toast.id);
            action.run();
          }}>{action.label}</button
        >
      {/if}
      <button
        class="dismiss"
        type="button"
        aria-label="Dismiss"
        onclick={() => toasts.dismiss(toast.id)}
      >
        <X size={14} />
      </button>
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    right: var(--space-4);
    bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-2);
    max-width: calc(100vw - 2 * var(--space-4));
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    max-width: 420px;
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    background: var(--raised);
    box-shadow: var(--shadow-lg);
    font-size: var(--text-sm);
    pointer-events: auto;
  }

  .toast.error {
    border-color: color-mix(in srgb, var(--danger) 55%, var(--border));
    box-shadow:
      inset 3px 0 0 var(--danger),
      var(--shadow-lg);
  }

  .message {
    flex: 1;
  }

  .action {
    display: inline-flex;
    align-items: center;
    flex: none;
    height: 28px;
    padding: 0 var(--space-3);
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    background: none;
    color: var(--accent);
    font-weight: 600;
  }

  .action:hover {
    background: var(--accent-soft);
  }

  .dismiss {
    display: grid;
    place-items: center;
    flex: none;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--text-muted);
  }

  .dismiss:hover {
    background: var(--raised-hover);
  }
</style>

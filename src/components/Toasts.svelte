<script lang="ts">
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import Info from "@lucide/svelte/icons/info";
  import X from "@lucide/svelte/icons/x";
  import { flip, slide } from "../lib/motion.ts";
  import { toasts } from "../lib/state/toasts.svelte.ts";

  const ICONS = { info: Info, success: CircleCheck, error: CircleAlert };
</script>

<div class="toasts" aria-live="polite" aria-relevant="additions">
  {#each toasts.items as toast (toast.id)}
    {@const Icon = ICONS[toast.tone]}
    <div
      class="toast {toast.tone}"
      role={toast.tone === "error" ? "alert" : "status"}
      in:slide
      out:slide
      animate:flip
    >
      <span class="icon" aria-hidden="true"><Icon size={18} strokeWidth={2.25} /></span>
      <div class="body">
        {#if toast.title}
          <strong class="title">{toast.title}</strong>
        {/if}
        <p class="message">{toast.message}</p>
        {#if toast.action}
          {@const action = toast.action}
          <div class="actions">
            <button
              class="action"
              type="button"
              onclick={() => {
                toasts.dismiss(toast.id);
                action.run();
              }}>{action.label}</button
            >
          </div>
        {/if}
      </div>
      <button
        class="dismiss"
        type="button"
        aria-label="Dismiss"
        onclick={() => toasts.dismiss(toast.id)}
      >
        <X size={16} />
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
    pointer-events: none;
  }

  /*
   * Icon, text and close button share a 20px first line: the icon box is 20px and the
   * 28px close button pulls in 4px above and below, so all three center on it.
   */
  .toast {
    --tone: var(--accent);

    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) 28px;
    align-items: start;
    column-gap: var(--space-3);
    width: min(360px, calc(100vw - 2 * var(--space-4)));
    padding: 14px var(--space-2) 14px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--raised);
    box-shadow: var(--shadow-lg);
    font-size: var(--text-sm);
    line-height: 20px;
    pointer-events: auto;
  }

  .toast.success {
    --tone: var(--success);
  }

  .toast.error {
    --tone: var(--danger);
  }

  .icon {
    display: grid;
    place-items: center;
    height: 20px;
    color: var(--tone);
  }

  .body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .title {
    color: var(--text);
    font-weight: 600;
  }

  .message {
    margin: 0;
    color: var(--text);
  }

  .title + .message {
    color: var(--text-muted);
  }

  .actions {
    display: flex;
    gap: var(--space-2);
    margin-top: 10px;
  }

  .action {
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 var(--space-3);
    border: 1px solid var(--accent-edge);
    border-radius: var(--radius-sm);
    background: var(--accent-fill);
    color: var(--on-accent);
    font-weight: 600;
  }

  .action:hover {
    background: var(--accent-fill-hover);
  }

  .dismiss {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin: -4px 0;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--text-muted);
  }

  .dismiss:hover {
    background: var(--raised-hover);
    color: var(--text);
  }
</style>

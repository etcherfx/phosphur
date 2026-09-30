<script lang="ts">
  let {
    id,
    checked,
    describedby,
    onchange,
  }: {
    id: string;
    checked: boolean;
    describedby?: string;
    onchange: (checked: boolean) => void;
  } = $props();
</script>

<!-- A <button>, so a <label for={id}> names and toggles it. -->
<button
  {id}
  class="switch"
  type="button"
  role="switch"
  aria-checked={checked}
  aria-describedby={describedby}
  onclick={() => onchange(!checked)}
>
  <span class="thumb" aria-hidden="true"></span>
</button>

<style>
  /* The thumb is centred by flexbox; only its travel is computed, from the same sizes. */
  .switch {
    --track-width: 40px;
    --track-height: 24px;
    --thumb: 18px;
    --inset: calc((var(--track-height) - 2px - var(--thumb)) / 2);

    display: flex;
    align-items: center;
    flex: none;
    width: var(--track-width);
    height: var(--track-height);
    margin: 0;
    padding: 0 var(--inset);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-pill);
    background: var(--field);
    cursor: pointer;
  }

  .switch:hover {
    background: var(--field-hover);
  }

  .switch[aria-checked="true"] {
    border-color: var(--accent-edge);
    background: var(--accent-fill);
  }

  .switch[aria-checked="true"]:hover {
    background: var(--accent-fill-hover);
  }

  .thumb {
    flex: none;
    width: var(--thumb);
    height: var(--thumb);
    border-radius: 50%;
    background: var(--text-muted);
  }

  .switch[aria-checked="true"] .thumb {
    background: var(--on-accent);
    transform: translateX(calc(var(--track-width) - 2px - 2 * var(--inset) - var(--thumb)));
  }
</style>

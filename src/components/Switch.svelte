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
  /*
   * Both states are a filled track with the same white thumb, so the thumb's gap to the
   * edge looks identical on and off; only the track colour and the thumb's side change.
   * The thumb is centred by flexbox; only its travel is computed, from the same sizes.
   */
  .switch {
    --track-width: 40px;
    --track-height: 24px;
    --thumb: 18px;
    --inset: calc((var(--track-height) - var(--thumb)) / 2);

    display: flex;
    align-items: center;
    flex: none;
    width: var(--track-width);
    height: var(--track-height);
    margin: 0;
    padding: 0 var(--inset);
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--switch-off);
    cursor: pointer;
  }

  .switch[aria-checked="true"] {
    background: var(--switch-on);
  }

  .switch:hover {
    background-image: linear-gradient(var(--hover), var(--hover));
  }

  .thumb {
    flex: none;
    width: var(--thumb);
    height: var(--thumb);
    border-radius: 50%;
    background: var(--on-accent);
    transition: transform var(--duration-med) var(--ease-standard);
  }

  .switch[aria-checked="true"] .thumb {
    transform: translateX(calc(var(--track-width) - 2 * var(--inset) - var(--thumb)));
  }
</style>

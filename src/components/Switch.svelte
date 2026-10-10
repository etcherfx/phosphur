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
   * Windows 11 proportions: a 40x20 track and a 12px thumb with 4px of room on every side,
   * which stays visibly even at any display scale. Both states are a filled track with the
   * same white thumb; only the track color and the thumb's side change. The thumb is
   * centered by flexbox; only its travel is computed, from the same sizes.
   */
  .switch {
    --track-width: 40px;
    --track-height: 20px;
    --thumb: 12px;
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
    transition-property: translate, scale;
    transition-duration: var(--duration-med), var(--duration-fast);
    transition-timing-function: var(--ease-standard);
  }

  .switch[aria-checked="true"] .thumb {
    translate: calc(var(--track-width) - 2 * var(--inset) - var(--thumb)) 0;
  }

  /* The thumb grows to 14px under the pointer, in either state. */
  .switch:hover .thumb {
    scale: calc(14 / 12);
  }
</style>

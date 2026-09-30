# Design system

## Tokens

`src/styles/tokens.css` is the single source of every colour, radius, spacing step, font stack, control size and duration. Components reference variables only. The exceptions are values CSS can't reach: `theme-color` in `Base.astro` and `manifest.webmanifest`, the about:blank host background in `cloak.ts`, and `#000`/`transparent` stops in `mask-image` gradients (masks read alpha only).

Themes are `:root[data-theme="dark"|"light"]`; `applyTheme()` sets the attribute and the boot script in `Base.astro` sets it before first paint.

## Mica

The look is Windows 11 Mica: a blurred blue wallpaper under translucent layers.

- `body` (and any element with the global `.mica` class) paints `--mica-tint` over `/images/mica-{dark,light}.{avif,webp}` via `image-set()`, with `--mica-solid` underneath and a WebP-only fallback declaration first. The blur is baked into the image; the page runs no CSS `filter`.
- Surfaces over the wallpaper are translucent: `--layer` (toolbar, active tab, cards), `--hover`, `--pressed`, `--field`/`--field-hover` (inputs).
- Anything that can float over a proxied page (menus, the Select popover, toasts, the tab sheet) uses opaque `--raised`/`--raised-hover`, because its contrast can't depend on an unknown page.
- Proxied pages sit on opaque `--webpage` (white) inside their iframes.
- The active tab shares `--layer` with the toolbar so they read as one surface; concave ears join them. Inactive tabs are transparent.

## Colour and contrast

One brand blue, no accent setting. `--accent` is for links, focus and small highlights; `--accent-fill` with `--on-accent` is for filled controls (primary buttons, checked switches, the segmented indicator).

Every text/background pair meets WCAG AA (4.5:1 text, 3:1 UI such as field borders, switch tracks and focus rings), measured against the composited colour: the tint and layer alpha-blended over both the lightest and darkest wallpaper pixels. When you change a tint, layer alpha or text colour, recompute those composites; eyeballing translucent colours is unreliable.

Focus is a 2px `--accent` outline with a 2px offset (global `:focus-visible`). Text fields and the Select trigger pull it to `-1px` so it overlays their border; elements inside a clipping scroller (tabs) use `-2px`.

## Components and alignment

- Shared form controls (inputs, buttons, the Select trigger) are `--control-height` (36px) with `--radius-md`.
- Icons centre with flex or grid (`display: grid; place-items: center` on a fixed-size box, `padding: 0`); spacing between items comes from `gap`.
- `Select.svelte` is a select-only combobox; use it for every dropdown instead of `<select>`.
- `Switch.svelte` is a `role="switch"` button; its thumb is centred by flexbox and travels a distance computed from the track and thumb sizes.
- Fonts are self-hosted: Google Sans Flex (`--font-ui`) and JetBrains Mono (`--font-mono`, for URLs and code).

## Motion

Tokens: `--duration-fast` (120ms: hover, press, colour), `--duration-med` (200ms: small things entering or leaving, toggles, popovers), `--duration-slow` (300ms: sheets, reorders, tab widths), `--duration-intro` (600ms: the New Tab hero); `--ease-out` entering, `--ease-in` leaving, `--ease-standard` movement. All durations are 0 under `prefers-reduced-motion`.

Rules:

- Every interactive element eases `background-color`, `color`, `border-color` and `opacity` at the fast duration (a global rule in `global.css`); components add properties with `transition-property`, keeping the tokens.
- Everything that enters or leaves uses a `src/lib/motion.ts` transition (`tabOpen`/`tabClose`, `pop`, `fade`, `rise`, `slide`) and animates its exit as well as its entrance.
- Lists that reorder or remove items use `animate:flip` from `motion.ts`.
- Only tabs animate layout properties (width, padding). Everything else moves with `transform` and `opacity`.
- Looping indicators (spinner, progress sweep, connecting pulse, splash) are CSS keyframes, as is the New Tab intro and the dialog `::backdrop`, which isn't an element.
- `motion.ts` reads the tokens at runtime and parses both `ms` and `s`, because the CSS minifier rewrites `200ms` as `.2s`.

## Images

Originals live in `assets/source/` (copied from the 0.x branch). `bun run assets` (`scripts/optimize-images.ts`, sharp) writes:

- `public/images/mica-*.{avif,webp}`: 960px wallpapers with the blur baked in.
- `public/images/banner-{dark,light}-{720,1080}.{avif,webp}`: the New Tab hero at 1x and 1.5x.
- `public/favicon.ico` (16/32/48 PNG frames), `public/icons/logo-{32,64,128}.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (logo inside the safe zone on brand blue).
- `projectInfo/banner-{dark,light}.png` for the README's `<picture>`.

Outputs are committed, so builds and Docker never need sharp. The source logo's largest frame is 256px, so the 512px icons are upscaled. `Logo.svelte` renders the logo with a `srcset`.

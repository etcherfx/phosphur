# Phosphur

A tabbed browser-in-a-browser: an Astro + Svelte 5 shell whose tabs are iframes proxied by Scramjet's controller, talking to the internet through the libcurl transport over Wisp. One Bun process serves the static build and the `/wisp/` endpoint.

## Verification gates

Run in this order; each must pass before the next is worth running.

1. `bunx prettier --check .`
2. `bun run check` (Astro + Svelte + TypeScript)
3. `bun run lint`
4. `bun run test` (unit)
5. `bun run build`
6. `bun run test:e2e` (real server + Chromium; needs step 5 and `bunx playwright install chromium`)

A UI change is done only after it has also been looked at in a browser: read `docs/agents/testing.md`.

## Code map

- `server/`: the Bun HTTP server (sirv for `dist/`, wisp-js for `/wisp/`) and its env config.
- `src/components/`: the shell (`App`, `TabStrip`, `Toolbar`, `Omnibox`, …) and shared controls (`Select`, `Switch`).
- `src/components/pages/`: the `phosphur://` internal pages (New Tab, Settings, History, Bookmarks).
- `src/lib/`: pure logic, unit-tested (tabs reducer, omnibox, settings, tab layout, frame URLs, …).
- `src/lib/state/`: Svelte 5 rune stores (`browser`, `settings`, `toasts`), the only shared mutable state.
- `src/lib/proxy/controller.ts`: boots the service worker, Scramjet, the controller and the transport.
- `src/lib/motion.ts`: every Svelte transition the app uses.
- `src/styles/tokens.css`: every colour, size and duration.
- `scripts/`: `vendor.ts` (copies the proxy runtime into `public/vendor/`), `optimize-images.ts` (`bun run assets`).
- `assets/source/`: original images; their optimized outputs in `public/` are committed.
- `tests/unit/`, `tests/e2e/`: `bun test` suites.

## Conventions

- **bun** runs all JavaScript (installs, scripts, `bunx`); **uv** runs any Python.
- Svelte 5 runes only (`$state`, `$derived`, `$effect`, `$props`). Shared state lives in `src/lib/state/`; logic worth testing lives in a pure `src/lib/*.ts` module.
- Colours come from `tokens.css` variables; components hold no raw colour values.
- Motion goes through `src/lib/motion.ts` transitions and the `--duration-*`/`--ease-*` tokens.
- Commits are Conventional Commits with a DCO sign-off (`git commit -s`).

## Gotchas

- **Pinned proxy runtime.** `@mercuryworkshop/scramjet` and `@mercuryworkshop/scramjet-controller` are pinned to exact versions that are only known to work as a pair; upgrade them together, following `docs/agents/proxy-runtime.md`.
- **`patchHistoryUrl`** in `controller.ts` works around Scramjet 2.0.67-alpha.2 turning `history.replaceState(state, "")` into a navigation to `/undefined`. Re-check it on every Scramjet upgrade.
- **libcurl is the only transport.** epoxy-transport 3.0.1 drops the first message a page sends on a new WebSocket, so keep libcurl as the one transport.
- **Moving an iframe in the DOM reloads it.** Tab panels render in creation order (`stableOrder`) so reordering tabs never moves a panel.
- **Per-tab history stacks.** Iframes share the top window's session history, so each tab keeps its own `entries`/`index` in `src/lib/tabs.ts`; back/forward go through the reducer, never `history.back()`.
- **sirv caches the build's file list at startup.** Restart `bun run start` after every `bun run build`, or new files 404.
- **Secure context required.** Service workers only run over HTTPS or on `localhost`; e2e and manual testing use `localhost`.
- **`^0.x` ranges never cross a minor version** (`^0.5.0` won't take 0.6.0); bump 0.x dependencies by hand.

## Topic docs

- `docs/agents/architecture.md`: read before changing the shell, tab state, sessions or IndexedDB data.
- `docs/agents/proxy-runtime.md`: read before touching Scramjet, the controller, the transport, wisp, frame URLs or `scripts/vendor.ts`.
- `docs/agents/design-system.md`: read before changing styles, tokens, components, motion or images.
- `docs/agents/testing.md`: read before writing tests or signing off a UI change.

# Testing

## Unit tests

`bun run test` runs `tests/unit/` with `bun test`. They cover the pure modules in `src/lib/` (tabs reducer, omnibox, settings, tab layout, frame URLs, wisp URLs, shortcuts, sessions, history, server config). New logic goes into a pure module with a unit test; components stay thin.

## End-to-end tests

`bun run test:e2e` runs `tests/e2e/shell.test.ts`: it spawns the real server (`PORT=0`, `WISP_ALLOW_LOOPBACK_IPS=true`), serves fixture pages from a second `Bun.serve`, and drives Chromium through Playwright. It needs a fresh `bun run build` and, once per machine, `bunx playwright install chromium`.

- Query by role and accessible name (`getByRole("combobox", { name: "Search engine" })`); pass `exact: true` when a name is a prefix of another ("New tab" vs "Close New Tab").
- Elements animate out, so wait for removal (`waitFor({ state: "detached" })`) and poll layout until it settles (the `settle()` helper) rather than asserting the instant after an action.
- Below 640px the tab strip is `display: none`, so its tabs leave the accessibility tree; use the tab sheet there.

## Smoke test

Run after any change to the proxy runtime, transport or server:

1. `bun run build && bun run start`, then open `http://localhost:8080`.
2. Search for something on the New Tab page and open a Wikipedia article (`https://en.wikipedia.org/wiki/Special:Random`); it should render with images, and links should navigate within the tab.
3. Check WebSockets through libcurl: in a proxied page's devtools console, run
   `const ws = new WebSocket("wss://echo.websocket.org"); ws.onmessage = (e) => console.log(e.data); ws.onopen = () => ws.send("hi");`
   and expect the server greeting and then `hi` echoed back.
4. Back, forward, reload and the status dot's latency should all respond.

## Visual QA

A UI change is signed off only after screenshots, taken with one-off Playwright scripts kept outside the repo:

- **Matrix:** 1280×800 and 390×844, dark and light, device scale 1, 1.25 and 1.5.
- **States:** the New Tab hero, every Settings section, a Select open, History and Bookmarks both empty and filled, the menu, a toast, the tab sheet (390px), the error card, and many tabs (overflowing strip).
- **Alignment:** measure bounding boxes; switch thumbs, Select chevrons and toolbar icons sit within ±0.5px of their box's centre.
- **Contrast:** check text and UI colours against the composited surfaces (see `design-system.md`).
- **Reduced motion:** with `reducedMotion: "reduce"`, a new tab appears at full width immediately and menus appear and disappear without animating.

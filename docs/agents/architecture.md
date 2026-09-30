# Architecture

## The shell

`src/pages/index.astro` renders a splash and mounts `App.svelte` with `client:only="svelte"`; there is no server rendering of the shell. `App` owns the layout (tab strip, toolbar, progress bar, tab panels), boots the proxy, polls wisp status, wires keyboard shortcuts and persists the session.

Every tab is a `TabPanel`: an iframe plus, for `phosphur://` URLs, an `InternalPage` drawn over the hidden iframe. Panels are absolutely stacked; only the active one is visible, the rest are `inert`.

Panels render in `stableOrder` (creation order), not tab order. Moving an iframe in the DOM reloads it, so dragging tabs reorders only the strip, never the panels.

## State and data flow

State lives in three rune stores in `src/lib/state/`:

- `browser.svelte.ts` (`BrowserStore`): the tabs, the proxy runtime and per-tab iframe handles. Tab state is an immutable `TabsState` changed only through `tabsReducer` in `src/lib/tabs.ts`, which is pure and unit-tested.
- `settings.svelte.ts`: `settings.current` (validated `Settings`) and `resolvedTheme`. `update()` validates and writes localStorage; `applyTheme()` sets `data-theme` on `<html>` and follows the OS for "system".
- `toasts.svelte.ts`: the toast queue.

A navigation flows: omnibox/internal link → `browser.submit()`/`navigate()` → reducer `navigate` (pushes an entry, sets `pending`) → `frame.go()` → iframe `load` → `#onLoad` reads the real URL back through `decodeFrameUrl` and dispatches `commit`, which replaces the pending entry so redirects leave no bounce entries. `#syncMeta` then reads title and favicon and records history.

In-page navigations (pushState, hash) fire no load, so `App` polls `browser.syncUrl()` every second for the active tab, and `popstate`/`hashchange` listeners cover the rest.

Back/forward are `traverse` actions on the tab's own `entries`/`index`. Iframes share the top window's joint session history, so the browser's own back button and `history.back()` would move the wrong frame.

Keyboard shortcuts are handled in the capture phase on the shell window and on every proxied page's window (`browser.keyHandler`), so they work while a page has focus. `browser.capturingKeys` lets Settings record a key combo without triggering them.

## Sessions and settings

- `phosphur:settings` (localStorage): versioned JSON. `parseSettings` → `migrateSettings` → `validateSettings`; validation rebuilds the object field by field, so unknown or removed fields (the old `transport` and `accent`) are dropped on load. A theme-only boot script in `Base.astro` reads it before first paint. `theme` from Phosphur 0.x (localStorage `theme`) is imported once.
- `phosphur:session` (localStorage): `{ urls, active }`, rewritten on every tab change and restored on startup when "Restore tabs" is on.

## IndexedDB

`src/lib/db.ts` wraps the `phosphur` database (version 1) with `idb`:

- `history`: auto-increment `id`, index `visitedAt`. `recordVisit` collapses consecutive duplicate visits (`planVisit` in `history.ts`) and trims to the cap.
- `bookmarks`: keyed by `url`, index `createdAt`.

Every write dispatches `change` on `dataEvents`; open pages (New Tab, History, Bookmarks, the omnibox star) listen and reload. IndexedDB can be unavailable in private windows, so every caller treats it as best-effort.

## Cloaking

`src/lib/cloak.ts` opens Phosphur inside an `about:blank` tab (an iframe of `/`) and sends the original tab to the safe URL; `hostDocument()` then points title and favicon updates at the host tab. The panic key replaces the top window's location.

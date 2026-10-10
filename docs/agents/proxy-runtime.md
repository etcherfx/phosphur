# Proxy runtime

## Pieces

- **Scramjet** (`@mercuryworkshop/scramjet`): the rewriter (JS bundle + WASM).
- **Scramjet controller** (`@mercuryworkshop/scramjet-controller`): the v2 API that owns frames. `controller.api.js` runs in the shell, `controller.inject.js` in proxied pages and `controller.sw.js` in the service worker.
- **libcurl transport** (`@mercuryworkshop/libcurl-transport`): TLS in the page via libcurl.js, tunnelled over Wisp, so the server never sees plaintext.
- **Wisp**: a WebSocket multiplexing protocol. `server/wisp.ts` runs wisp-js on `/wisp/`; users may point Phosphur at any other `ws://`/`wss://` Wisp server.

## Boot

`initProxy()` in `src/lib/proxy/controller.ts`, in order:

1. Requires a secure context and service worker support (errors become `ProxyInitError` kinds that `ErrorCard` explains).
2. Registers `public/sw.js` (scope `/`, `updateViaCache: "none"`); the worker imports `controller.sw.js` and routes what `shouldRoute` claims. Browsers stop idle workers, and a restarted one knows no controllers until the shell registers again, so `sw.js` also holds other `/~/sj/` requests (polling `shouldRoute` for up to 5 s) instead of letting them 404 on the server. This is a stopgap for controller 0.0.14; the upstream fix is MercuryWorkshop/scramjet#211.
3. Loads `scramjet.js` and `controller.api.js` as classic scripts; they attach `$scramjet` and `$scramjetController` globals.
4. Starts the libcurl transport (`LibcurlClient({ wisp })`, 20 s timeout).
5. Creates the `Controller` and waits for the worker to answer.

`ProxyRuntime.createTab()` attaches a frame to each tab iframe and taps the frame's init hook to install `patchHistoryUrl`. `setWispUrl()` swaps transports live; a version counter drops a switch that a newer one overtook.

## Frame URLs

A proxied location is `<frame prefix><encoded url>?<scramjet params>#<encoded hash>`. `src/lib/frame-url.ts` encodes and decodes it with the controller's codec, mirroring Scramjet's `unrewriteUrl`; the unit tests pin the format. The shell only ever stores real URLs.

## Vendoring

`scripts/vendor.ts` (run by `predev`/`prebuild`) copies the six runtime files from `node_modules/@mercuryworkshop/` into `public/vendor/`, which is gitignored. They are served unmodified from our origin, which the AGPL notice in the README relies on.

## Upgrading

1. Bump Scramjet and the controller together to exact versions (no `^`); check the controller's release notes for the Scramjet version it expects.
2. Re-check each `dist/` path in `scripts/vendor.ts`.
3. Re-test the `patchHistoryUrl` bug on DuckDuckGo search; delete the patch once Scramjet keeps the URL on `replaceState(state, "")`.
4. If the new controller includes MercuryWorkshop/scramjet#211, delete the restart stopgap in `public/sw.js`; the e2e test "survives the service worker restarting" must still pass without it.
5. Run all gates, then the smoke test in `testing.md` (Wikipedia and a WebSocket echo).
6. For the transport, libcurl is the one that passes the WebSocket smoke test; epoxy-transport 3.0.1 drops the first message sent on a new socket.

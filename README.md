<h1 align="center">
  <img src=".github/assets/banner.png" alt="Phosphur" width="850">
</h1>

<div align="center">

<img alt="astro" height="56" src="https://cdn.jsdelivr.net/npm/@intergrav/devins-badges@3/assets/cozy/built-with/astro_vector.svg">
<img alt="svelte" height="56" src="https://cdn.jsdelivr.net/npm/@intergrav/devins-badges@3/assets/cozy/built-with/svelte_vector.svg">
<img alt="typescript" height="56" src="https://cdn.jsdelivr.net/npm/@intergrav/devins-badges@3/assets/cozy/built-with/typescript_vector.svg">

[![Release](https://img.shields.io/github/v/release/etcherfx/phosphur?style=for-the-badge)](https://github.com/etcherfx/phosphur/releases/latest)
[![Bun](https://img.shields.io/badge/bun-1.2%2B-f9f1e1?style=for-the-badge&logo=bun&logoColor=black)](https://bun.sh)

**A tabbed browser-in-a-browser built on Scramjet and Wisp.**

[Getting started](#getting-started) · [Configuration](#configuration) · [Docker](#docker) · [Keyboard shortcuts](#keyboard-shortcuts) · [Website](https://phosphur.etcherfx.dev)

</div>

## Features

- **Real tabs.** Open, close, drag to reorder and switch tabs; each keeps its own page, history and state. On small screens the tab strip becomes a tab sheet.
- **Omnibox.** Type a URL, a bare domain or a search. Choose DuckDuckGo, Google, Bing, Brave, Startpage or your own `%s` template.
- **Scramjet v2.** Pages run through [Scramjet](https://github.com/MercuryWorkshop/scramjet)'s controller API, with the end-to-end encrypted **libcurl** transport over [Wisp](https://github.com/MercuryWorkshop/wisp-protocol).
- **Bring your own Wisp server.** Use the built-in `/wisp/` endpoint or point Phosphur at any `ws://`/`wss://` Wisp server, live without reloading. A status dot shows whether it's reachable and its latency.
- **History and bookmarks,** stored only in your browser (IndexedDB), with a New Tab page showing both.
- **Session restore.** Reopens the tabs you had open last time.
- **Cloaking.** Open Phosphur in an `about:blank` tab, disguise the tab as Google Drive, Classroom, Canvas, Wikipedia or anything else, and set a panic key that instantly leaves for a safe page.
- **Blue Mica design.** A blurred blue wallpaper behind translucent, Windows 11-style surfaces, in navy (dark) or light blue, following your system if you like. Fonts are self-hosted, and it's installable as a PWA.

## Getting started

Phosphur runs on [Bun](https://bun.sh) (1.2 or newer).

1. Download `phosphur-X.Y.Z.tar.gz` or `.zip` from the [latest release](https://github.com/etcherfx/phosphur/releases/latest) and extract it. It contains the built site and the server.
2. Install the server's dependencies:

   ```sh
   bun install --production
   ```

3. Start the server:

   ```sh
   bun run start
   ```

Then open <http://localhost:8080>.

> [!NOTE]
> Service workers only run in a secure context. Serve Phosphur over HTTPS, or use `localhost` while testing.

To run from a clone instead, run `bun install` and `bun run build` before `bun run start`.

## Configuration

The server is configured with environment variables. Invalid values log a warning and fall back to the default.

| Variable                  | Default   | Description                                                                    |
| ------------------------- | --------- | ------------------------------------------------------------------------------ |
| `PORT`                    | `8080`    | Port to listen on.                                                             |
| `HOST`                    | `0.0.0.0` | Interface to bind.                                                             |
| `LOG_LEVEL`               | `info`    | Wisp server logging: `debug`, `info`, `warn`, `error` or `none`.               |
| `WISP_MOTD`               | _(none)_  | Message of the day sent to Wisp v2 clients.                                    |
| `WISP_HOSTNAME_BLACKLIST` | _(none)_  | Comma-separated regular expressions for hostnames the Wisp server won't reach. |
| `WISP_ALLOW_PRIVATE_IPS`  | `false`   | Allow connections to private network addresses.                                |
| `WISP_ALLOW_LOOPBACK_IPS` | `false`   | Allow connections to loopback addresses (e.g. `127.0.0.1`).                    |

Browser-side settings (theme, search engine, custom Wisp server, cloaking) live in **Settings** inside the app (`phosphur://settings`).

## Docker

From a clone:

```sh
docker build -t phosphur .
docker run -d -p 8080:8080 --name phosphur phosphur
```

Pass any of the variables above with `-e`, for example `-e WISP_MOTD="hello"`.

## Keyboard shortcuts

These work in the shell and inside open pages. They avoid Ctrl+T/W/N, which browsers don't let pages override.

| Shortcut            | Action                |
| ------------------- | --------------------- |
| `Alt+T`             | New tab               |
| `Alt+W`             | Close tab             |
| `Alt+1` – `Alt+8`   | Go to tab 1–8         |
| `Alt+9`             | Go to the last tab    |
| `Alt+[` / `Alt+]`   | Previous / next tab   |
| `Ctrl+L` or `Alt+D` | Focus the address bar |
| `Ctrl+R` or `F5`    | Reload the tab        |

## Development

```sh
bun install
bun run dev        # Astro dev server with the /wisp/ endpoint attached
bun run check      # type-check
bun run lint       # ESLint
bun run format     # Prettier
bun run test       # unit tests
bun run test:e2e   # end-to-end tests (needs `bun run build` first)
```

The end-to-end tests drive Chromium through Playwright. Install it once with `bunx playwright install chromium`.

The proxy runtime (Scramjet, the Scramjet controller and the libcurl transport) is pinned to exact versions and copied into `public/vendor/` by `bun run vendor`, which runs before every `dev` and `build`.

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Documentation

- [Architecture](docs/agents/architecture.md): the shell, tab state, sessions and stored data.
- [Proxy runtime](docs/agents/proxy-runtime.md): Scramjet, the controller, the transport and Wisp.
- [Design system](docs/agents/design-system.md): tokens, components, motion and images.
- [Testing](docs/agents/testing.md): unit, end-to-end and visual checks.

## License

Phosphur is released under the [MIT License](LICENSE).

It serves unmodified builds of [Scramjet](https://github.com/MercuryWorkshop/scramjet), the Scramjet controller, [libcurl-transport](https://github.com/MercuryWorkshop/libcurl-transport), which are licensed under the **GNU AGPL-3.0**, and runs an unmodified [wisp-js](https://github.com/MercuryWorkshop/wisp-js) server, licensed under the **GNU LGPL-3.0-or-later**. Their source is available at the linked repositories.

## Credits

- [Mercury Workshop](https://github.com/MercuryWorkshop) for Scramjet, Wisp and the libcurl transport
- [Astro](https://astro.build), [Svelte](https://svelte.dev) and [Bun](https://bun.sh)
- [Lucide](https://lucide.dev) icons
- [Google Sans Flex](https://fonts.google.com/specimen/Google+Sans+Flex) and [JetBrains Mono](https://www.jetbrains.com/lp/mono/) typefaces
- Logo from [icons8](https://icons8.com/icon/SA3MF2iUwDMR/measuring-cylinder)
- Wallpapers from [Freepik](https://www.freepik.com/free-photo/abstract-dark-blue-wallpaper-image_11303164.htm)

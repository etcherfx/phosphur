import type * as ScramjetApi from "@mercuryworkshop/scramjet";
import type * as ControllerApi from "@mercuryworkshop/scramjet-controller";
import type { Controller, Frame } from "@mercuryworkshop/scramjet-controller";
import type EpoxyTransport from "@mercuryworkshop/epoxy-transport";
import type LibcurlClient from "@mercuryworkshop/libcurl-transport";
import { decodeFrameUrl, encodeFrameUrl } from "../frame-url.ts";
import type { TransportKind } from "../settings.ts";

export type { Frame };

const VENDOR = "/vendor";
const PATHS = {
  sw: "/sw.js",
  scramjet: `${VENDOR}/scramjet/scramjet.js`,
  wasm: `${VENDOR}/scramjet/scramjet.wasm`,
  controllerApi: `${VENDOR}/controller/controller.api.js`,
  controllerInject: `${VENDOR}/controller/controller.inject.js`,
  transports: {
    libcurl: `${VENDOR}/transports/libcurl.js`,
    epoxy: `${VENDOR}/transports/epoxy.js`,
  },
} as const;

const TRANSPORT_INIT_TIMEOUT = 20_000;

export type ProxyErrorKind =
  "insecure" | "unsupported" | "service-worker" | "runtime" | "transport";

export class ProxyInitError extends Error {
  constructor(
    readonly kind: ProxyErrorKind,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ProxyInitError";
  }
}

type ProxyTransport = ControllerApi.Controller["transport"];

interface VendorGlobals {
  $scramjet?: typeof ScramjetApi;
  $scramjetController?: typeof ControllerApi;
  LibcurlTransport?: { LibcurlClient: typeof LibcurlClient };
  EpoxyTransport?: { default: typeof EpoxyTransport };
}

// SAFETY: the vendored UMD bundles attach these globals; every property is optional
// and checked before use because a script may have failed to load.
const vendor = globalThis as unknown as VendorGlobals;
const scripts = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  let pending = scripts.get(src);
  if (!pending) {
    pending = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => {
        scripts.delete(src);
        script.remove();
        reject(new Error(`Failed to load ${src}`));
      };
      document.head.append(script);
    });
    scripts.set(src, pending);
  }
  return pending;
}

async function registerServiceWorker(): Promise<ServiceWorker> {
  if (!window.isSecureContext) {
    throw new ProxyInitError(
      "insecure",
      "Phosphur needs a secure connection. Open it over HTTPS (or on localhost) to browse.",
    );
  }
  if (!("serviceWorker" in navigator)) {
    throw new ProxyInitError(
      "unsupported",
      "This browser doesn't support service workers, which Phosphur needs to proxy pages. " +
        "If you're in a private window, try a regular one.",
    );
  }

  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.register(PATHS.sw, {
      scope: "/",
      updateViaCache: "none",
    });
  } catch (error) {
    throw new ProxyInitError(
      "service-worker",
      "The service worker couldn't be registered. Your browser may be blocking it.",
      { cause: error },
    );
  }

  await navigator.serviceWorker.ready;
  const worker = registration.active;
  if (!worker) throw new ProxyInitError("service-worker", "The service worker never activated.");
  return worker;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Loads and initializes a transport client pointed at a wisp server. */
export async function createTransport(
  kind: TransportKind,
  wispUrl: string,
): Promise<ProxyTransport> {
  try {
    await loadScript(PATHS.transports[kind]);
    let transport: ProxyTransport;
    if (kind === "libcurl") {
      const Client = vendor.LibcurlTransport?.LibcurlClient;
      if (!Client) throw new Error("libcurl transport didn't load");
      transport = new Client({ wisp: wispUrl });
    } else {
      const Client = vendor.EpoxyTransport?.default;
      if (!Client) throw new Error("Epoxy transport didn't load");
      transport = new Client({ wisp: wispUrl });
    }
    await withTimeout(transport.init(), TRANSPORT_INIT_TIMEOUT, `${kind} took too long to start`);
    return transport;
  } catch (error) {
    throw new ProxyInitError("transport", `The ${kind} transport failed to start.`, {
      cause: error,
    });
  }
}

type HistoryMethod = (data: unknown, unused: string, url?: string | URL | null) => void;

/**
 * Works around Scramjet 2.0.67-alpha.2 turning a missing `url` in
 * `history.pushState`/`replaceState` into the literal path "undefined"
 * (DuckDuckGo calls `replaceState(state, "")`). Per spec the URL stays the same.
 */
function patchHistoryUrl(win: Window, client: { url: URL }): void {
  // The frame's own History.prototype, where Scramjet installed its hooks.
  const proto: History = Object.getPrototypeOf(win.history);
  for (const method of ["pushState", "replaceState"] as const) {
    const hooked: HistoryMethod = proto[method];
    const patched: HistoryMethod = function (this: History, data, unused, url) {
      hooked.call(this, data, unused, url ?? client.url.href);
    };
    proto[method] = patched;
  }
}

/** A running Scramjet controller plus helpers for driving tab iframes. */
export class ProxyRuntime {
  #transportVersion = 0;
  #plugin: ScramjetApi.Plugin | null;

  constructor(
    readonly controller: Controller,
    public transportKind: TransportKind,
    public wispUrl: string,
  ) {
    const Plugin = vendor.$scramjet?.Plugin;
    this.#plugin = Plugin ? new Plugin("phosphur") : null;
  }

  /** Attaches Scramjet to a tab's iframe. */
  createTab(iframe: HTMLIFrameElement): Frame {
    const frame = this.controller.createFrame(iframe);
    this.#plugin?.tap(frame.hooks.init.post, ({ window, client }) =>
      patchHistoryUrl(window, client),
    );
    return frame;
  }

  /** Detaches a closed tab so the controller stops routing its requests. */
  releaseTab(frame: Frame): void {
    const index = this.controller.frames.indexOf(frame);
    if (index !== -1) this.controller.frames.splice(index, 1);
  }

  /** Swaps the transport live; open tabs keep their state. */
  async setTransport(kind: TransportKind, wispUrl: string): Promise<void> {
    const version = ++this.#transportVersion;
    const transport = await createTransport(kind, wispUrl);
    // A newer switch started while this one was initializing.
    if (version !== this.#transportVersion) return;
    this.controller.setTransport(transport);
    this.transportKind = kind;
    this.wispUrl = wispUrl;
  }

  /** The real URL a tab's iframe is showing, or null if it's not on a proxied page. */
  realUrl(frame: Frame, location: string): string | null {
    const prefix = new URL(frame.prefix, window.location.href).href;
    return decodeFrameUrl(location, prefix, this.controller.config.codec.decode);
  }

  /** The proxied location for a real URL in a given tab. */
  proxiedUrl(frame: Frame, url: string): string {
    const prefix = new URL(frame.prefix, window.location.href).href;
    return encodeFrameUrl(url, prefix, this.controller.config.codec.encode);
  }
}

/**
 * Boots the proxy: registers the service worker, loads the vendored runtime,
 * starts the transport and waits for the controller to connect.
 */
export async function initProxy(kind: TransportKind, wispUrl: string): Promise<ProxyRuntime> {
  const serviceworker = await registerServiceWorker();

  try {
    await loadScript(PATHS.scramjet);
    await loadScript(PATHS.controllerApi);
  } catch (error) {
    throw new ProxyInitError("runtime", "The proxy runtime couldn't be loaded.", { cause: error });
  }
  const api = vendor.$scramjetController;
  if (!api) throw new ProxyInitError("runtime", "The proxy runtime didn't initialize.");

  const transport = await createTransport(kind, wispUrl);

  let controller: Controller;
  try {
    controller = new api.Controller({
      serviceworker,
      transport,
      config: {
        scramjetPath: PATHS.scramjet,
        injectPath: PATHS.controllerInject,
        wasmPath: PATHS.wasm,
      },
    });
    await withTimeout(controller.wait(), 20_000, "The service worker didn't respond");
  } catch (error) {
    throw new ProxyInitError("runtime", "The proxy controller failed to start.", { cause: error });
  }

  return new ProxyRuntime(controller, kind, wispUrl);
}

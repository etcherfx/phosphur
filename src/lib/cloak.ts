import { DEFAULT_PANIC_URL } from "./settings.ts";

/** Only ever leave for an http(s) page; anything else falls back to the default safe URL. */
function safeDestination(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
  } catch {
    // Fall through to the default.
  }
  return DEFAULT_PANIC_URL;
}

/** The document shown in the browser's tab strip: the about:blank host when cloaked, else ours. */
export function hostDocument(): Document {
  try {
    if (window.top && window.top !== window) return window.top.document;
  } catch {
    // Embedded cross-origin; only our own document is reachable.
  }
  return document;
}

export function isCloaked(): boolean {
  return window.top !== window;
}

/** Sets the host tab's title and favicon. */
export function applyTabIdentity(title: string, icon: string): void {
  const doc = hostDocument();
  if (doc.title !== title) doc.title = title;
  let link = doc.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) {
    link = doc.createElement("link");
    link.rel = "icon";
    doc.head.append(link);
  }
  const href = new URL(icon, location.href).href;
  if (link.href !== href) {
    link.removeAttribute("type");
    link.href = href;
  }
}

/**
 * Reopens Phosphur inside an about:blank tab so it stays out of the browser's
 * history, then sends this tab to the safe URL. Returns false if the popup was blocked.
 */
export function openInAboutBlank(safeUrl: string, title: string, icon: string): boolean {
  const destination = safeDestination(safeUrl);
  // Opens a fixed blank page, never a user-supplied URL.
  const win = open("about:blank", "_blank");
  if (!win) return false;

  const doc = win.document;
  doc.title = title;
  const link = doc.createElement("link");
  link.rel = "icon";
  link.href = new URL(icon, location.href).href;
  doc.head.append(link);

  const style = doc.createElement("style");
  style.textContent =
    "html,body{margin:0;height:100%;overflow:hidden;background:#060807}" +
    "iframe{display:block;width:100%;height:100%;border:0}";
  doc.head.append(style);

  const frame = doc.createElement("iframe");
  frame.src = new URL("/", location.href).href;
  frame.allow =
    "fullscreen; autoplay; clipboard-read; clipboard-write; encrypted-media; picture-in-picture";
  doc.body.append(frame);

  location.replace(destination);
  return true;
}

/** Leaves immediately for the safe URL, taking the about:blank host with us when cloaked. */
export function panic(safeUrl: string): void {
  const destination = safeDestination(safeUrl);
  try {
    (window.top ?? window).location.replace(destination);
  } catch {
    location.replace(destination);
  }
}

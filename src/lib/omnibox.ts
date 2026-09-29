import { internalPage, internalUrl, isInternalUrl } from "./internal.ts";

export type Resolution =
  | { kind: "internal"; url: string }
  | { kind: "url"; url: string }
  | { kind: "search"; url: string };

const SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const TLD = /^(?:[a-z][a-z\d-]*|xn--[a-z\d-]+)$/i;

function parse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function hostOf(input: string): string {
  // Strip path/query/fragment and any port to inspect the bare host.
  const authority = input.split(/[/?#]/)[0];
  if (authority.startsWith("[")) return authority.slice(0, authority.indexOf("]") + 1);
  return authority.replace(/:\d*$/, "");
}

/** Builds a search URL from a template containing `%s`. */
export function searchUrl(query: string, template: string): string {
  return template.replace("%s", encodeURIComponent(query));
}

/**
 * Resolves what the user typed into the omnibox:
 * full URLs are kept, bare hosts get a scheme, `phosphur://` opens an internal page,
 * and everything else becomes a search.
 */
export function resolveInput(raw: string, template: string): Resolution | null {
  const input = raw.trim();
  if (!input) return null;

  if (isInternalUrl(input)) {
    return { kind: "internal", url: internalUrl(internalPage(input) ?? "newtab") };
  }

  if (!/\s/.test(input)) {
    if (SCHEME.test(input)) {
      const url = parse(input);
      if (url && (url.protocol === "http:" || url.protocol === "https:")) {
        return { kind: "url", url: url.href };
      }
    } else {
      const host = hostOf(input);
      const lower = host.toLowerCase();

      if (lower === "localhost" || IPV4.test(host) || /^\[[\da-f:.]+\]$/i.test(host)) {
        const url = parse(`http://${input}`);
        if (url) return { kind: "url", url: url.href };
      }

      const labels = host.split(".");
      if (labels.length > 1 && labels.every(Boolean) && TLD.test(labels[labels.length - 1])) {
        const url = parse(`https://${input}`);
        if (url) return { kind: "url", url: url.href };
      }
    }
  }

  return { kind: "search", url: searchUrl(input, template) };
}

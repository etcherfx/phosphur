export type WispUrlResult = { ok: true; url: string } | { ok: false; error: string };

/** Validates a user-supplied wisp server URL; only `ws://` and `wss://` are accepted. */
export function validateWispUrl(raw: string): WispUrlResult {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Enter a wisp server URL." };

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, error: "That isn't a valid URL." };
  }

  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    return { ok: false, error: "Wisp URLs must start with ws:// or wss://." };
  }
  if (url.username || url.password) {
    return { ok: false, error: "Wisp URLs can't contain credentials." };
  }

  return { ok: true, url: url.href };
}

/** The wisp endpoint served by this Phosphur instance. */
export function defaultWispUrl(location: Pick<Location, "protocol" | "host">): string {
  return `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/wisp/`;
}

/** The wisp URL in use: the custom one when set and valid, otherwise this instance's endpoint. */
export function activeWispUrl(
  custom: string,
  location: Pick<Location, "protocol" | "host">,
): string {
  const result = custom ? validateWispUrl(custom) : null;
  return result?.ok ? result.url : defaultWispUrl(location);
}

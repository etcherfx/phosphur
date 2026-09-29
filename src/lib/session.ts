import { isInternalUrl, isWebUrl } from "./internal.ts";

export const SESSION_KEY = "phosphur:session";

export interface Session {
  urls: string[];
  active: number;
}

export function parseSession(stored: string | null): Session | null {
  if (!stored) return null;
  try {
    const data = JSON.parse(stored) as Partial<Session>;
    if (!Array.isArray(data.urls)) return null;
    const urls = data.urls.filter(
      (url): url is string => typeof url === "string" && (isWebUrl(url) || isInternalUrl(url)),
    );
    if (urls.length === 0) return null;
    const active = typeof data.active === "number" ? data.active : 0;
    return { urls, active: Math.min(Math.max(0, Math.trunc(active)), urls.length - 1) };
  } catch {
    return null;
  }
}

import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { logging, server as wisp } from "@mercuryworkshop/wisp-js/server";
import type { ServerConfig } from "./config.ts";

export const WISP_PATH = "/wisp/";

const WISP_LOG_LEVELS = {
  debug: logging.DEBUG,
  info: logging.INFO,
  warn: logging.WARN,
  error: logging.ERROR,
  none: logging.NONE,
} as const;

/** Applies the parsed server config to wisp-js' global options. */
export function configureWisp(config: ServerConfig): void {
  logging.set_level(WISP_LOG_LEVELS[config.logLevel]);
  Object.assign(wisp.options, {
    hostname_blacklist: config.wispHostnameBlacklist,
    allow_private_ips: config.wispAllowPrivateIps,
    allow_loopback_ips: config.wispAllowLoopbackIps,
    wisp_motd: config.wispMotd,
  });
}

/** Routes `/wisp/` upgrades to wisp-js. Returns false for any other upgrade path. */
export function routeWispUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): boolean {
  const pathname = (req.url ?? "").split("?")[0];
  if (pathname !== WISP_PATH) return false;
  wisp.routeRequest(req, socket, head);
  return true;
}

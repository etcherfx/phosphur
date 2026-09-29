declare module "@mercuryworkshop/wisp-js/server" {
  import type { IncomingMessage } from "node:http";
  import type { Duplex } from "node:stream";

  export const logging: {
    DEBUG: number;
    INFO: number;
    WARN: number;
    ERROR: number;
    NONE: number;
    set_level(level: number): void;
  };

  export const server: {
    options: {
      hostname_blacklist: RegExp[] | null;
      allow_private_ips: boolean;
      allow_loopback_ips: boolean;
      wisp_motd: string | null;
      [key: string]: unknown;
    };
    routeRequest(request: IncomingMessage, socket: Duplex, head: Buffer): void;
  };
}

export const LOG_LEVELS = ["debug", "info", "warn", "error", "none"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export interface ServerConfig {
  port: number;
  host: string;
  logLevel: LogLevel;
  wispMotd: string | null;
  wispHostnameBlacklist: RegExp[] | null;
  wispAllowPrivateIps: boolean;
  wispAllowLoopbackIps: boolean;
}

export const DEFAULT_CONFIG: ServerConfig = {
  port: 8080,
  host: "0.0.0.0",
  logLevel: "info",
  wispMotd: null,
  wispHostnameBlacklist: null,
  wispAllowPrivateIps: false,
  wispAllowLoopbackIps: false,
};

type Env = Record<string, string | undefined>;

function blank(value: string | undefined): value is undefined {
  return value === undefined || value.trim() === "";
}

function parsePort(value: string, warn: (msg: string) => void): number {
  const port = Number(value);
  if (!/^\d+$/.test(value.trim()) || port < 0 || port > 65535) {
    warn(`PORT "${value}" is not a valid port; using ${DEFAULT_CONFIG.port}`);
    return DEFAULT_CONFIG.port;
  }
  return port;
}

function parseBool(
  name: string,
  value: string,
  fallback: boolean,
  warn: (msg: string) => void,
): boolean {
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  warn(`${name} "${value}" is not a boolean; using ${fallback}`);
  return fallback;
}

function parseBlacklist(value: string, warn: (msg: string) => void): RegExp[] | null {
  const patterns: RegExp[] = [];
  for (const raw of value.split(",")) {
    const source = raw.trim();
    if (!source) continue;
    try {
      patterns.push(new RegExp(source));
    } catch {
      warn(`WISP_HOSTNAME_BLACKLIST entry "${source}" is not a valid regex; skipping`);
    }
  }
  return patterns.length > 0 ? patterns : null;
}

/** Parses server settings from the environment. Invalid values warn and fall back to defaults. */
export function parseConfig(
  env: Env,
  warn: (msg: string) => void = (msg) => console.warn(`[config] ${msg}`),
): ServerConfig {
  const config: ServerConfig = { ...DEFAULT_CONFIG };

  if (!blank(env.PORT)) config.port = parsePort(env.PORT, warn);
  if (!blank(env.HOST)) config.host = env.HOST.trim();

  if (!blank(env.LOG_LEVEL)) {
    const level = env.LOG_LEVEL.trim().toLowerCase();
    if ((LOG_LEVELS as readonly string[]).includes(level)) {
      config.logLevel = level as LogLevel;
    } else {
      warn(`LOG_LEVEL "${env.LOG_LEVEL}" must be one of ${LOG_LEVELS.join(", ")}; using info`);
    }
  }

  if (!blank(env.WISP_MOTD)) config.wispMotd = env.WISP_MOTD;
  if (!blank(env.WISP_HOSTNAME_BLACKLIST)) {
    config.wispHostnameBlacklist = parseBlacklist(env.WISP_HOSTNAME_BLACKLIST, warn);
  }
  if (!blank(env.WISP_ALLOW_PRIVATE_IPS)) {
    config.wispAllowPrivateIps = parseBool(
      "WISP_ALLOW_PRIVATE_IPS",
      env.WISP_ALLOW_PRIVATE_IPS,
      DEFAULT_CONFIG.wispAllowPrivateIps,
      warn,
    );
  }
  if (!blank(env.WISP_ALLOW_LOOPBACK_IPS)) {
    config.wispAllowLoopbackIps = parseBool(
      "WISP_ALLOW_LOOPBACK_IPS",
      env.WISP_ALLOW_LOOPBACK_IPS,
      DEFAULT_CONFIG.wispAllowLoopbackIps,
      warn,
    );
  }

  return config;
}

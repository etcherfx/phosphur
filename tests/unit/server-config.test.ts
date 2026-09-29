import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, parseConfig } from "../../server/config.ts";

function parse(env: Record<string, string>) {
  const warnings: string[] = [];
  const config = parseConfig(env, (msg) => warnings.push(msg));
  return { config, warnings };
}

describe("server config", () => {
  test("uses defaults for an empty environment", () => {
    expect(parse({})).toEqual({ config: DEFAULT_CONFIG, warnings: [] });
  });

  test("parses every variable", () => {
    const { config, warnings } = parse({
      PORT: "3000",
      HOST: "127.0.0.1",
      LOG_LEVEL: "WARN",
      WISP_MOTD: "hello",
      WISP_HOSTNAME_BLACKLIST: "^ads\\., tracker\\.example$",
      WISP_ALLOW_PRIVATE_IPS: "true",
      WISP_ALLOW_LOOPBACK_IPS: "1",
    });
    expect(warnings).toEqual([]);
    expect(config.port).toBe(3000);
    expect(config.host).toBe("127.0.0.1");
    expect(config.logLevel).toBe("warn");
    expect(config.wispMotd).toBe("hello");
    expect(config.wispHostnameBlacklist?.map(String)).toEqual([
      "/^ads\\./",
      "/tracker\\.example$/",
    ]);
    expect(config.wispAllowPrivateIps).toBe(true);
    expect(config.wispAllowLoopbackIps).toBe(true);
  });

  test("warns and falls back on invalid values", () => {
    const { config, warnings } = parse({
      PORT: "eighty",
      LOG_LEVEL: "loud",
      WISP_HOSTNAME_BLACKLIST: "([",
      WISP_ALLOW_PRIVATE_IPS: "maybe",
    });
    expect(config.port).toBe(8080);
    expect(config.logLevel).toBe("info");
    expect(config.wispHostnameBlacklist).toBeNull();
    expect(config.wispAllowPrivateIps).toBe(false);
    expect(warnings).toHaveLength(4);
  });

  test("rejects out-of-range ports", () => {
    expect(parse({ PORT: "70000" }).config.port).toBe(8080);
    expect(parse({ PORT: "0" }).config.port).toBe(0);
  });
});

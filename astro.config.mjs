// @ts-check
import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import { parseConfig } from "./server/config.ts";
import { configureWisp, routeWispUpgrade } from "./server/wisp.ts";

/**
 * Attaches the wisp endpoint to Vite's dev server so `bun run dev` proxies end to end.
 * @returns {import("astro").AstroIntegration}
 */
function wispDevServer() {
  return {
    name: "phosphur:wisp-dev",
    hooks: {
      "astro:server:setup": ({ server }) => {
        configureWisp(parseConfig(process.env));
        // Vite owns other upgrades (HMR), so only claim /wisp/.
        server.httpServer?.on("upgrade", routeWispUpgrade);
      },
    },
  };
}

export default defineConfig({
  output: "static",
  integrations: [svelte(), wispDevServer()],
  devToolbar: { enabled: false },
});

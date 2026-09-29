import { createReadStream, existsSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { hostname } from "node:os";
import { join } from "node:path";
import sirv from "sirv";
import { parseConfig } from "./config.ts";
import { configureWisp, routeWispUpgrade } from "./wisp.ts";

const config = parseConfig(process.env);
configureWisp(config);

const dist = join(import.meta.dir, "..", "dist");
const notFoundPage = join(dist, "404.html");

if (!existsSync(dist)) {
  console.error(`No build found at ${dist}. Run \`bun run build\` first.`);
  process.exit(1);
}

const NO_CACHE_FILES = new Set(["/sw.js", "/manifest.webmanifest"]);

function setCacheHeaders(res: ServerResponse, pathname: string): void {
  if (pathname.startsWith("/_astro/")) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else if (pathname.endsWith(".html") || NO_CACHE_FILES.has(pathname)) {
    res.setHeader("Cache-Control", "no-cache");
  }
}

const serveStatic = sirv(dist, {
  etag: true,
  setHeaders: setCacheHeaders,
});

function sendNotFound(res: ServerResponse): void {
  res.statusCode = 404;
  res.setHeader("Cache-Control", "no-cache");
  if (!existsSync(notFoundPage)) {
    res.end("Not found");
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  createReadStream(notFoundPage).pipe(res);
}

const server = createServer((req, res) => {
  serveStatic(req, res, () => sendNotFound(res));
});

server.on("upgrade", (req, socket, head) => {
  if (!routeWispUpgrade(req, socket, head)) socket.end();
});

server.on("listening", () => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : config.port;
  console.info("Phosphur listening on:");
  console.info(`\thttp://localhost:${port}`);
  console.info(`\thttp://${hostname()}:${port}`);
});

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`${signal} received: closing server`);
  server.close(() => process.exit(0));
  server.closeAllConnections();
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(config.port, config.host);

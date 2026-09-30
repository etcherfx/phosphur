// End-to-end tests: the real Bun server + Scramjet in Chromium, against a local fixture site.
// Requires `bun run build` and `bunx playwright install chromium` first.
import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

setDefaultTimeout(90_000);

const root = join(import.meta.dir, "..", "..");

const FIXTURE_PAGES: Record<string, string> = {
  "/one": `<!doctype html><title>Fixture One</title><h1>One</h1><a id="next" href="/two">Next</a>`,
  "/two": `<!doctype html><title>Fixture Two</title><h1>Two</h1><a id="prev" href="/one">Prev</a>`,
  "/safe": `<!doctype html><title>Safe</title><h1>Safe place</h1>`,
};

let fixture: ReturnType<typeof Bun.serve>;
let server: ReturnType<typeof Bun.spawn>;
let browser: Browser;
let appUrl: string;
let fixtureUrl: string;

async function waitForListening(proc: ReturnType<typeof Bun.spawn>): Promise<string> {
  const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let output = "";
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    output += decoder.decode(value);
    const match = output.match(/http:\/\/localhost:(\d+)/);
    if (match) {
      reader.releaseLock();
      return `http://localhost:${match[1]}`;
    }
  }
  throw new Error(`Server didn't start:\n${output}`);
}

beforeAll(async () => {
  if (!existsSync(join(root, "dist", "index.html"))) {
    throw new Error("No build found. Run `bun run build` before `bun run test:e2e`.");
  }

  fixture = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(req) {
      const body = FIXTURE_PAGES[new URL(req.url).pathname];
      return body
        ? new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } })
        : new Response("not found", { status: 404 });
    },
  });
  fixtureUrl = `http://127.0.0.1:${fixture.port}`;

  server = Bun.spawn([process.execPath, "server/index.ts"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: "0",
      HOST: "127.0.0.1",
      WISP_ALLOW_LOOPBACK_IPS: "true",
      LOG_LEVEL: "warn",
    },
    stdout: "pipe",
    stderr: "inherit",
  });
  appUrl = await waitForListening(server);

  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  server?.kill();
  fixture?.stop(true);
});

async function openApp(context?: BrowserContext): Promise<Page> {
  const page = await (context ?? (await browser.newContext())).newPage();
  await page.goto(appUrl);
  await page.getByRole("tab").first().waitFor();
  return page;
}

function omnibox(page: Page) {
  return page.getByRole("textbox", { name: "Search or enter address" });
}

async function go(page: Page, address: string) {
  await omnibox(page).fill(address);
  await omnibox(page).press("Enter");
}

function tab(page: Page, name: string) {
  return page.getByRole("tab", { name, exact: true });
}

/** Picks a styled radio option by clicking its label, as a user would. */
async function choose(page: Page, name: string) {
  await page.locator("label", { has: page.getByRole("radio", { name, exact: true }) }).click();
}

/** Waits for layout (and any transition) to reach a state. */
async function settle(done: () => Promise<boolean>, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (!(await done())) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for the layout to settle");
    await Bun.sleep(50);
  }
}

/** The iframe of the active tab. */
function activeFrame(page: Page) {
  return page.frameLocator('[role="tabpanel"]:not([inert]) iframe');
}

describe("Phosphur shell", () => {
  test("renders a New Tab page", async () => {
    const page = await openApp();
    await expect(tab(page, "New Tab").getAttribute("aria-selected")).resolves.toBe("true");
    await page.getByRole("search").getByRole("searchbox").waitFor();
    await page.context().close();
  });

  test("loads a page through the proxy and shows its title", async () => {
    const page = await openApp();
    await go(page, `${fixtureUrl}/one`);
    await tab(page, "Fixture One").waitFor();
    await activeFrame(page).getByRole("heading", { name: "One" }).waitFor();

    const location = await page.evaluate(
      () =>
        document.querySelector<HTMLIFrameElement>('[role="tabpanel"]:not([inert]) iframe')
          ?.contentWindow?.location.pathname,
    );
    expect(location).toStartWith("/~/sj/");
    expect(await omnibox(page).inputValue()).toBe(`${fixtureUrl}/one`);
    await page.context().close();
  });

  test("goes back and forward across pages", async () => {
    const page = await openApp();
    await go(page, `${fixtureUrl}/one`);
    await tab(page, "Fixture One").waitFor();
    await activeFrame(page).locator("#next").click();
    await tab(page, "Fixture Two").waitFor();

    await page.getByRole("button", { name: "Back" }).click();
    await tab(page, "Fixture One").waitFor();
    expect(await omnibox(page).inputValue()).toBe(`${fixtureUrl}/one`);

    await page.getByRole("button", { name: "Forward" }).click();
    await tab(page, "Fixture Two").waitFor();
    expect(await omnibox(page).inputValue()).toBe(`${fixtureUrl}/two`);
    await page.context().close();
  });

  test("keeps settings across reloads", async () => {
    const page = await openApp();
    await go(page, "phosphur://settings");
    await choose(page, "Light");
    expect(await page.locator("html").getAttribute("data-theme")).toBe("light");

    await page.reload();
    await page.getByRole("tab").first().waitFor();
    expect(await page.locator("html").getAttribute("data-theme")).toBe("light");
    expect(await page.getByRole("radio", { name: "Light" }).isChecked()).toBe(true);
    await page.context().close();
  });

  test("sizes tabs to fit, then scrolls them", async () => {
    const page = await openApp(
      await browser.newContext({ viewport: { width: 1280, height: 800 } }),
    );
    const widths = () =>
      page.getByRole("tab").evaluateAll((tabs) => tabs.map((t) => t.getBoundingClientRect().width));

    await page.keyboard.press("Alt+T");
    await settle(async () => (await widths()).every((w) => w === 240));
    expect(await widths()).toEqual([240, 240]);

    // Adding a tab while there's room leaves the others alone.
    await page.keyboard.press("Alt+T");
    await settle(
      async () => (await widths()).length === 3 && (await widths()).every((w) => w === 240),
    );
    expect(await widths()).toEqual([240, 240, 240]);

    for (let i = 0; i < 17; i++) await page.keyboard.press("Alt+T");
    await settle(async () => (await widths()).every((w) => w === 100));
    expect(await page.getByRole("tab").count()).toBe(20);
    expect(new Set(await widths())).toEqual(new Set([100]));

    const scroller = page.getByRole("tablist").locator("..");
    const overflow = await scroller.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(overflow).toBe(true);

    // The newest (active) tab and the + button stay on screen.
    const bounds = await scroller.boundingBox();
    await settle(async () => {
      const active = await page.getByRole("tab", { selected: true }).boundingBox();
      return !!active && !!bounds && active.x + active.width <= bounds.x + bounds.width;
    });
    const active = await page.getByRole("tab", { selected: true }).boundingBox();
    expect(active!.x).toBeGreaterThanOrEqual(bounds!.x);
    expect(active!.x + active!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
    const plus = await page.getByRole("button", { name: "New tab", exact: true }).boundingBox();
    expect(plus!.x + plus!.width).toBeLessThanOrEqual(1280);
    expect(plus!.x).toBeGreaterThanOrEqual(bounds!.x + bounds!.width);
    await page.context().close();
  });

  test("restores open tabs on startup", async () => {
    const page = await openApp();
    await go(page, `${fixtureUrl}/one`);
    await tab(page, "Fixture One").waitFor();
    await page.keyboard.press("Alt+T");
    await go(page, `${fixtureUrl}/two`);
    await tab(page, "Fixture Two").waitFor();

    await page.reload();
    await tab(page, "Fixture One").waitFor();
    await tab(page, "Fixture Two").waitFor();
    expect(await page.getByRole("tab").count()).toBe(2);
    expect(await tab(page, "Fixture Two").getAttribute("aria-selected")).toBe("true");
    await page.context().close();
  });

  test("the panic key leaves for the safe URL, even from inside a page", async () => {
    const context = await browser.newContext();
    await context.addInitScript(
      ([safe]) => {
        if (window.top !== window || localStorage.getItem("phosphur:settings")) return;
        localStorage.setItem(
          "phosphur:settings",
          JSON.stringify({ version: 1, panicKey: "Alt+Shift+P", panicUrl: safe }),
        );
      },
      [`${fixtureUrl}/safe`],
    );
    const page = await openApp(context);
    await go(page, `${fixtureUrl}/one`);
    await tab(page, "Fixture One").waitFor();

    await activeFrame(page).getByRole("heading", { name: "One" }).click();
    await page.keyboard.press("Alt+Shift+P");
    await page.waitForURL(`${fixtureUrl}/safe`);
    await context.close();
  });
});

<script lang="ts">
  import AppWindow from "@lucide/svelte/icons/app-window";
  import { cloakIdentity } from "../../lib/identity.ts";
  import { openInAboutBlank } from "../../lib/cloak.ts";
  import {
    DEFAULT_PANIC_URL,
    DISGUISES,
    isValidSearchTemplate,
    SEARCH_ENGINES,
    THEMES,
    type DisguiseId,
    type SearchEngineId,
    type Theme,
  } from "../../lib/settings.ts";
  import { comboFromEvent, formatCombo } from "../../lib/shortcuts.ts";
  import { browser } from "../../lib/state/browser.svelte.ts";
  import { settings } from "../../lib/state/settings.svelte.ts";
  import { toasts } from "../../lib/state/toasts.svelte.ts";
  import { defaultWispUrl, validateWispUrl } from "../../lib/wisp-url.ts";
  import { probeWisp } from "../../lib/wisp-status.ts";
  import Select, { type SelectOption } from "../Select.svelte";
  import Switch from "../Switch.svelte";

  const s = $derived(settings.current);
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const THEME_LABELS: Record<Theme, string> = { system: "System", dark: "Dark", light: "Light" };
  const ENGINE_OPTIONS: SelectOption<SearchEngineId>[] = [
    ...Object.entries(SEARCH_ENGINES).map(([value, engine]) => ({
      value: value as SearchEngineId,
      label: engine.name,
    })),
    { value: "custom", label: "Custom…" },
  ];
  const DISGUISE_OPTIONS: SelectOption<DisguiseId>[] = Object.entries(DISGUISES).map(
    ([value, disguise]) => ({ value: value as DisguiseId, label: disguise.name }),
  );

  let templateDraft = $state(settings.current.customSearchTemplate);
  let templateError = $state("");
  let wispDraft = $state(settings.current.wispUrl);
  let wispError = $state("");
  let wispTest = $state<{ state: "idle" | "testing" | "online" | "offline"; latency?: number }>({
    state: "idle",
  });
  let panicUrlDraft = $state(settings.current.panicUrl);
  let panicUrlError = $state("");
  let recording = $state(false);

  $effect(() => {
    browser.capturingKeys = recording;
    return () => (browser.capturingKeys = false);
  });

  // "Custom" only takes effect once a valid template is saved.
  let engineChoice = $state<SearchEngineId>(settings.current.searchEngine);

  function onEngine(value: SearchEngineId) {
    engineChoice = value;
    if (value !== "custom") settings.update({ searchEngine: value });
    else if (isValidSearchTemplate(templateDraft)) settings.update({ searchEngine: "custom" });
  }

  function saveTemplate() {
    if (!isValidSearchTemplate(templateDraft)) {
      templateError = "Use an http(s) URL with %s where the search terms go.";
      return;
    }
    templateError = "";
    settings.update({ customSearchTemplate: templateDraft.trim(), searchEngine: "custom" });
  }

  function saveWisp() {
    const value = wispDraft.trim();
    if (!value) {
      wispError = "";
      settings.update({ wispUrl: "" });
      return;
    }
    const result = validateWispUrl(value);
    if (!result.ok) {
      wispError = result.error;
      return;
    }
    wispError = "";
    wispDraft = result.url;
    settings.update({ wispUrl: result.url });
  }

  async function testWisp() {
    const value = wispDraft.trim();
    const result = value
      ? validateWispUrl(value)
      : { ok: true as const, url: defaultWispUrl(location) };
    if (!result.ok) {
      wispError = result.error;
      return;
    }
    wispError = "";
    wispTest = { state: "testing" };
    const status = await probeWisp(result.url);
    wispTest =
      status.state === "online"
        ? { state: "online", latency: status.latency }
        : { state: "offline" };
  }

  function savePanicUrl() {
    try {
      const url = new URL(panicUrlDraft.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      panicUrlError = "";
      panicUrlDraft = url.href;
      settings.update({ panicUrl: url.href });
    } catch {
      panicUrlError = "Enter a full http(s) address.";
    }
  }

  function recordKey(event: KeyboardEvent) {
    if (!recording) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      recording = false;
      return;
    }
    const combo = comboFromEvent(event);
    if (!combo) return;
    recording = false;
    settings.update({ panicKey: combo });
  }

  function togglePanic(enabled: boolean) {
    if (enabled) recording = true;
    else {
      recording = false;
      settings.update({ panicKey: null });
    }
  }

  function aboutBlank() {
    const identity = cloakIdentity(s);
    if (!openInAboutBlank(s.panicUrl, identity.title, identity.icon)) {
      toasts.show({
        message: "Your browser blocked the popup. Allow popups for this site.",
        tone: "error",
      });
    }
  }
</script>

<svelte:window onkeydowncapture={recordKey} />

<div class="page settings">
  <header>
    <h1>Settings</h1>
  </header>

  <section aria-labelledby="s-appearance">
    <h2 id="s-appearance">Appearance</h2>
    <div class="card">
      <div class="row">
        <div class="label" id="theme-label">Theme</div>
        <div
          class="segmented"
          role="radiogroup"
          aria-labelledby="theme-label"
          style:--selected={THEMES.indexOf(s.theme)}
          style:--count={THEMES.length}
        >
          <span class="indicator" aria-hidden="true"></span>
          {#each THEMES as theme (theme)}
            <label>
              <input
                type="radio"
                name="theme"
                value={theme}
                checked={s.theme === theme}
                onchange={() => settings.update({ theme })}
              />
              <span>{THEME_LABELS[theme]}</span>
            </label>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <section aria-labelledby="s-search">
    <h2 id="s-search">Search</h2>
    <div class="card">
      <div class="row">
        <span class="label" id="engine-label">Search engine</span>
        <Select
          id="engine"
          labelledby="engine-label"
          options={ENGINE_OPTIONS}
          value={engineChoice}
          onchange={onEngine}
        />
      </div>
      {#if engineChoice === "custom"}
        <div class="row stacked">
          <div class="label">
            <label for="template">Custom search URL</label>
            <span class="hint" id="template-hint"
              >Use <code>%s</code> where the search terms go.</span
            >
          </div>
          <div class="inline">
            <input
              id="template"
              type="url"
              bind:value={templateDraft}
              placeholder="https://search.example/?q=%s"
              aria-invalid={templateError !== ""}
              aria-describedby="template-hint template-error"
              onkeydown={(e) => e.key === "Enter" && saveTemplate()}
            />
            <button class="secondary" type="button" onclick={saveTemplate}>Save</button>
          </div>
          <p class="error" id="template-error" role="alert">{templateError}</p>
        </div>
      {/if}
    </div>
  </section>

  <section aria-labelledby="s-connection">
    <h2 id="s-connection">Connection</h2>
    <div class="card">
      <div class="row stacked">
        <div class="label">
          <label for="wisp">Wisp server</label>
          <span class="hint" id="wisp-hint"
            >Leave empty to use this server's <code>/wisp/</code> endpoint.</span
          >
        </div>
        <div class="inline">
          <input
            id="wisp"
            type="url"
            class="mono"
            bind:value={wispDraft}
            placeholder={defaultWispUrl(location)}
            aria-invalid={wispError !== ""}
            aria-describedby="wisp-hint wisp-error wisp-test"
            onkeydown={(e) => e.key === "Enter" && saveWisp()}
          />
          <button class="secondary" type="button" onclick={testWisp}>Test</button>
          <button class="primary" type="button" onclick={saveWisp}>Save</button>
        </div>
        <p class="error" id="wisp-error" role="alert">{wispError}</p>
        <p class="test {wispTest.state}" id="wisp-test" role="status">
          {#if wispTest.state === "testing"}
            Testing…
          {:else if wispTest.state === "online"}
            Reachable · {wispTest.latency} ms
          {:else if wispTest.state === "offline"}
            Couldn't reach that server.
          {/if}
        </p>
      </div>
    </div>
  </section>

  <section aria-labelledby="s-startup">
    <h2 id="s-startup">Startup</h2>
    <div class="card">
      <div class="row toggle">
        <div class="label">
          <label for="restore-tabs">Restore tabs</label>
          <span class="hint" id="restore-tabs-hint">Reopen the tabs you had open last time.</span>
        </div>
        <Switch
          id="restore-tabs"
          describedby="restore-tabs-hint"
          checked={s.restoreTabs}
          onchange={(restoreTabs) => settings.update({ restoreTabs })}
        />
      </div>
    </div>
  </section>

  <section aria-labelledby="s-cloak">
    <h2 id="s-cloak">Cloaking</h2>
    <div class="card">
      <div class="row">
        <div class="label">
          <span>Open in about:blank</span>
          <span class="hint" id="blank-hint"
            >Runs Phosphur inside a blank tab and sends this one to your safe URL.</span
          >
        </div>
        <button
          class="secondary"
          type="button"
          aria-label="Open in about:blank"
          aria-describedby="blank-hint"
          onclick={aboutBlank}
        >
          <AppWindow size={16} /> Open
        </button>
      </div>
      <div class="row toggle">
        <div class="label">
          <label for="blank-auto">Launch in about:blank automatically</label>
          <span class="hint" id="blank-auto-hint">Your browser may ask you to allow popups.</span>
        </div>
        <Switch
          id="blank-auto"
          describedby="blank-auto-hint"
          checked={s.aboutBlankAutoLaunch}
          onchange={(aboutBlankAutoLaunch) => settings.update({ aboutBlankAutoLaunch })}
        />
      </div>
      <div class="row">
        <div class="label">
          <span id="disguise-label">Tab disguise</span>
          <span class="hint" id="disguise-hint">Changes the title and icon this tab shows.</span>
        </div>
        <Select
          id="disguise"
          labelledby="disguise-label"
          describedby="disguise-hint"
          options={DISGUISE_OPTIONS}
          value={s.disguise}
          onchange={(disguise) => settings.update({ disguise })}
        />
      </div>
      {#if s.disguise === "custom"}
        <div class="row stacked">
          <label class="label" for="disguise-title">Custom title</label>
          <input
            id="disguise-title"
            type="text"
            value={s.disguiseTitle}
            maxlength="200"
            onchange={(e) => settings.update({ disguiseTitle: e.currentTarget.value })}
          />
          <label class="label" for="disguise-icon">Custom icon URL</label>
          <input
            id="disguise-icon"
            type="url"
            class="mono"
            value={s.disguiseIcon}
            placeholder="https://example.com/favicon.ico"
            onchange={(e) => settings.update({ disguiseIcon: e.currentTarget.value.trim() })}
          />
        </div>
      {/if}
    </div>
  </section>

  <section aria-labelledby="s-panic">
    <h2 id="s-panic">Panic key</h2>
    <div class="card">
      <div class="row toggle">
        <div class="label">
          <label for="panic-enabled">Enable panic key</label>
          <span class="hint" id="panic-enabled-hint"
            >Instantly leaves for your safe URL, even while a page has focus.</span
          >
        </div>
        <Switch
          id="panic-enabled"
          describedby="panic-enabled-hint"
          checked={s.panicKey !== null || recording}
          onchange={togglePanic}
        />
      </div>
      {#if s.panicKey !== null || recording}
        <div class="row">
          <span class="label" aria-hidden="true">Shortcut</span>
          <button
            class="secondary key"
            class:recording
            type="button"
            aria-label={recording
              ? "Recording panic shortcut. Press a key combination, or Escape to cancel."
              : `Panic shortcut: ${formatCombo(s.panicKey ?? "", mac)}. Change`}
            onclick={() => (recording = !recording)}
          >
            {#if recording}
              Press a key combination… (Esc to cancel)
            {:else if s.panicKey}
              <kbd>{formatCombo(s.panicKey, mac)}</kbd> Change
            {/if}
          </button>
        </div>
      {/if}
      <div class="row stacked">
        <div class="label">
          <label for="panic-url">Safe URL</label>
          <span class="hint" id="panic-url-hint"
            >Where the panic key and about:blank send this tab.</span
          >
        </div>
        <div class="inline">
          <input
            id="panic-url"
            type="url"
            class="mono"
            bind:value={panicUrlDraft}
            placeholder={DEFAULT_PANIC_URL}
            aria-invalid={panicUrlError !== ""}
            aria-describedby="panic-url-hint panic-url-error"
            onkeydown={(e) => e.key === "Enter" && savePanicUrl()}
          />
          <button class="secondary" type="button" onclick={savePanicUrl}>Save</button>
        </div>
        <p class="error" id="panic-url-error" role="alert">{panicUrlError}</p>
      </div>
    </div>
  </section>

  <section aria-labelledby="s-keys">
    <h2 id="s-keys">Keyboard shortcuts</h2>
    <div class="card">
      <dl class="shortcuts">
        <dt><kbd>Alt+T</kbd></dt>
        <dd>New tab</dd>
        <dt><kbd>Alt+W</kbd></dt>
        <dd>Close tab</dd>
        <dt><kbd>Alt+1</kbd>–<kbd>Alt+8</kbd></dt>
        <dd>Go to tab 1–8</dd>
        <dt><kbd>Alt+9</kbd></dt>
        <dd>Go to the last tab</dd>
        <dt><kbd>Alt+[</kbd> / <kbd>Alt+]</kbd></dt>
        <dd>Previous / next tab</dd>
        <dt><kbd>Ctrl+L</kbd> or <kbd>Alt+D</kbd></dt>
        <dd>Focus the address bar</dd>
        <dt><kbd>Ctrl+R</kbd> or <kbd>F5</kbd></dt>
        <dd>Reload the tab</dd>
      </dl>
    </div>
  </section>
</div>

<style>
  .card {
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--layer);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
  }

  .row + .row {
    border-top: 1px solid var(--border);
  }

  .row.stacked {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }

  .label {
    display: flex;
    flex-direction: column;
    font-size: var(--text-md);
  }

  .hint {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  code,
  .mono {
    font-family: var(--font-mono);
  }

  .inline {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .inline input {
    flex: 1 1 200px;
    min-width: 0;
  }

  .error {
    margin: 0;
    color: var(--danger);
    font-size: var(--text-sm);
  }

  .error:empty,
  .test:empty {
    display: none;
  }

  .test {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-muted);
  }

  .test.online {
    color: var(--success);
  }

  .test.offline {
    color: var(--danger);
  }

  /* Equal columns, so the indicator slides by whole column widths. */
  .segmented {
    position: relative;
    display: inline-grid;
    grid-template-columns: repeat(var(--count), 1fr);
    padding: 3px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--field);
  }

  .segmented label {
    position: relative;
    display: flex;
  }

  .indicator {
    position: absolute;
    top: 3px;
    bottom: 3px;
    left: 3px;
    width: calc((100% - 6px) / var(--count));
    border-radius: calc(var(--radius-md) - 3px);
    background: var(--accent-fill);
    box-shadow: inset 0 0 0 1px var(--accent-edge);
    transform: translateX(calc(var(--selected) * 100%));
  }

  .segmented input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .segmented label span {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    height: 28px;
    padding: 0 var(--space-3);
    border-radius: calc(var(--radius-md) - 3px);
    color: var(--text-muted);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .segmented input:checked + span {
    color: var(--on-accent);
  }

  .segmented input:focus-visible + span {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  /* A switch stays beside its label, even when the label wraps on narrow screens. */
  .row.toggle {
    flex-wrap: nowrap;
  }

  .row.toggle .label {
    flex: 1;
    min-width: 0;
  }

  .toggle label {
    cursor: pointer;
  }

  .key.recording {
    border-color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent);
  }

  kbd {
    padding: 1px 6px;
    border: 1px solid var(--border-strong);
    border-bottom-width: 2px;
    border-radius: var(--radius-sm);
    background: var(--field);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .shortcuts {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: var(--space-2) var(--space-5);
    margin: 0;
    padding: var(--space-4);
    font-size: var(--text-sm);
  }

  dt {
    color: var(--text-muted);
  }

  dd {
    margin: 0;
  }
</style>

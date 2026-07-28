import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const SCHEMA = "atlas-public-interface/evidence/v1";
const preview = process.env.PREVIEW_URL;
const product = process.env.PRODUCT_ID;
const sha = process.env.HEAD_SHA || "unknown";
if (!preview || !product) throw new Error("PREVIEW_URL and PRODUCT_ID are required");

const config = {
  status: { fixture: "deterministic-unavailable", hosts: ["api.atlas-systems.uk", "atlas-systems.uk"] },
  "atlas-doc-viewer": { fixture: "protected-document-gate", hosts: [] },
  "ramone-edge": { fixture: "deterministic-offline-with-cited-answer", hosts: [] },
}[product];
if (!config) throw new Error(`Unsupported PRODUCT_ID: ${product}`);

const viewports = [
  ["320", 320, 760, "accepted"], ["375", 375, 812, "accepted"],
  ["768", 768, 900, "accepted"], ["1024", 1024, 900, "accepted"],
  ["1440", 1440, 1000, "accepted"], ["1920", 1920, 1080, "reporting-only"],
].map(([name, width, height, authority]) => ({ name, width, height, authority }));
const browsers = [
  ["chrome", () => chromium.launch({ channel: "chrome", headless: true })],
  ["firefox", () => firefox.launch({ headless: true })],
];
const output = process.env.COMPARABLE_EVIDENCE_OUTPUT_DIR || process.cwd();
const screenshots = path.join(output, "comparable-screenshots");
const reportPath = path.join(output, "comparable-evidence.json");
const errorPath = path.join(output, "comparable-capture-error.txt");
const report = {
  schema_version: SCHEMA,
  repository: process.env.GITHUB_REPOSITORY || `AtlasReaper311/${product}`,
  product,
  head_sha: sha,
  preview_url: preview,
  fixture: config.fixture,
  captured_at: new Date().toISOString(),
  browsers: browsers.map(([name]) => name),
  viewports,
  cases: [],
  findings: [],
  summary: {},
};

function save() {
  const counts = { P0: 0, P1: 0, P2: 0 };
  for (const item of report.findings) counts[item.priority] += 1;
  report.summary = {
    case_count: report.cases.length,
    finding_count: report.findings.length,
    findings_by_priority: counts,
    blocking_failures: 0,
    browser_performance_mode: "reporting-only",
  };
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}
function finding(priority, category, message, context, details) {
  report.findings.push({ priority, category, message, ...context, ...(details ? { details } : {}) });
}
function violation(item) {
  return {
    id: item.id, impact: item.impact, help: item.help,
    nodes: item.nodes.map((node) => ({ target: node.target, html: node.html, failure_summary: node.failureSummary })),
  };
}

async function configure(context) {
  await context.addInitScript((fixture) => {
    Object.defineProperty(window, "__ATLAS_COMPARABLE_EVIDENCE__", { value: true });
    if (!window.__ATLAS_EVIDENCE_MODE__) {
      Object.defineProperty(window, "__ATLAS_EVIDENCE_MODE__", { value: fixture });
    }
  }, config.fixture);
  if (!config.hosts.length) return;
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!config.hosts.includes(url.hostname)) return route.continue();
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      headers: { "cache-control": "no-store", "x-atlas-evidence-fixture": config.fixture },
      body: JSON.stringify({ error: "deterministic comparable-evidence fixture" }),
    });
  });
}

async function open(page) {
  let last;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await page.goto(new URL("/", preview).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
      if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? "none"}`);
      await page.waitForSelector("main", { timeout: 15000 });
      await page.evaluate(() => document.fonts?.ready || Promise.resolve());
      await page.waitForTimeout(1000);
      return { attempts: attempt, status: response.status() };
    } catch (error) {
      last = error;
      await page.waitForTimeout(attempt * 750);
    }
  }
  throw last;
}

async function semantics(page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const controls = [...document.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      });
    return {
      title: document.title,
      canonical: document.querySelector('link[rel="canonical"]')?.href || null,
      h1_count: document.querySelectorAll("h1").length,
      main_count: document.querySelectorAll("main").length,
      width,
      scroll_width: document.documentElement.scrollWidth,
      fixture_mode: window.__ATLAS_EVIDENCE_MODE__ || null,
      interactive_count: controls.length,
      undersized_controls: controls.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: element.getAttribute("aria-label") || element.textContent.trim().replace(/\s+/g, " ").slice(0, 80),
          width: Math.round(rect.width), height: Math.round(rect.height),
        };
      }).filter((item) => item.width < 44 || item.height < 44),
    };
  });
}

async function focus(page) {
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(30);
    const state = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || [document.body, document.documentElement].includes(element)) return null;
      return {
        tag: element.tagName.toLowerCase(), id: element.id || null,
        label: element.getAttribute("aria-label") || element.textContent.trim().replace(/\s+/g, " ").slice(0, 80),
        focus_visible: Boolean(document.querySelector(":focus-visible")),
      };
    });
    if (state) return state;
  }
  return null;
}

async function resources(page) {
  return page.evaluate(() => performance.getEntriesByType("resource").reduce((out, item) => {
    out.request_count += 1;
    out.transfer_bytes += Number(item.transferSize || 0);
    out.encoded_bytes += Number(item.encodedBodySize || 0);
    out.decoded_bytes += Number(item.decodedBodySize || 0);
    if (item.initiatorType === "script") out.javascript += 1;
    if (["link", "css"].includes(item.initiatorType)) out.css += 1;
    return out;
  }, { request_count: 0, transfer_bytes: 0, encoded_bytes: 0, decoded_bytes: 0, css: 0, javascript: 0 }));
}

function actionableConsoleErrors(item) {
  const expectedFixture503 = item.diagnostics.response_errors.some(
    (error) => error.expected_fixture && error.status === 503,
  );
  return item.diagnostics.console_errors.filter((message) => !(
    expectedFixture503 &&
    message.includes("Failed to load resource") &&
    message.includes("503")
  ));
}

function classify(item) {
  const context = { product, browser: item.browser, viewport: item.viewport.name, route: "/" };
  if (item.semantics.h1_count !== 1) finding("P1", "semantics", `Expected one h1, found ${item.semantics.h1_count}`, context);
  if (item.semantics.main_count !== 1) finding("P1", "semantics", `Expected one main, found ${item.semantics.main_count}`, context);
  if (item.semantics.scroll_width > item.semantics.width + 1) finding("P1", "responsive", "Horizontal overflow", context);
  if (item.diagnostics.page_errors.length) finding("P1", "javascript", "Page errors", context, item.diagnostics.page_errors);
  const consoleErrors = actionableConsoleErrors(item);
  if (consoleErrors.length) finding("P1", "console", "Console errors", context, consoleErrors);
  if (item.diagnostics.failed_requests.length) finding("P1", "network", "Failed requests", context, item.diagnostics.failed_requests);
  const unexpected = item.diagnostics.response_errors.filter((error) => !error.expected_fixture);
  if (unexpected.length) finding("P1", "network", "Unexpected HTTP errors", context, unexpected);
  if (item.accessibility.blocking.length) finding("P1", "accessibility", "Serious accessibility findings", context, item.accessibility.blocking);
  if (item.semantics.interactive_count && !item.focus?.focus_visible) finding("P1", "keyboard", "Visible focus was not confirmed", context);
  if (item.semantics.undersized_controls.length) finding("P2", "target-size", "Controls below 44px", context, item.semantics.undersized_controls);
}

async function runCase(browser, browserName, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: "dark", reducedMotion: "reduce", serviceWorkers: "block",
  });
  await configure(context);
  const page = await context.newPage();
  const diagnostics = { page_errors: [], console_errors: [], failed_requests: [], response_errors: [] };
  page.on("pageerror", (error) => diagnostics.page_errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") diagnostics.console_errors.push(message.text()); });
  page.on("requestfailed", (request) => diagnostics.failed_requests.push({ url: request.url(), error: request.failure()?.errorText || "unknown" }));
  page.on("response", async (response) => {
    if (response.status() >= 400) diagnostics.response_errors.push({
      status: response.status(), url: response.url(),
      expected_fixture: Boolean(await response.headerValue("x-atlas-evidence-fixture")),
    });
  });
  try {
    const navigation = await open(page);
    const semanticState = await semantics(page);
    const focusState = await focus(page);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const violations = axe.violations.map(violation);
    const screenshot = path.join(screenshots, `${browserName}-${viewport.name}-${product}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    const item = {
      browser: browserName, viewport, route: "/", navigation,
      semantics: semanticState, focus: focusState, diagnostics,
      accessibility: { violations, blocking: violations.filter(({ impact }) => ["serious", "critical"].includes(impact)) },
      resources: await resources(page), screenshot: path.relative(output, screenshot),
    };
    report.cases.push(item);
    classify(item);
  } finally {
    await context.close();
    save();
  }
}

async function main() {
  fs.mkdirSync(screenshots, { recursive: true });
  for (const [browserName, launch] of browsers) {
    const browser = await launch();
    try {
      for (const viewport of viewports) await runCase(browser, browserName, viewport);
    } finally {
      await browser.close();
    }
  }
  save();
  console.log(`Captured ${report.cases.length} comparable ${product} cases with ${report.findings.length} reporting findings.`);
}

main().catch((error) => {
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(errorPath, `${error.stack || error.message || error}\n`);
  save();
  console.error(error);
  process.exitCode = 1;
});

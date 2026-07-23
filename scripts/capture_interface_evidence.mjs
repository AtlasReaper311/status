import fs from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const base = process.env.PREVIEW_URL;
if (!base) throw new Error("PREVIEW_URL is required");

const viewports = [
  ["320", { width: 320, height: 760 }],
  ["375", { width: 375, height: 812 }],
  ["768", { width: 768, height: 900 }],
  ["1024", { width: 1024, height: 900 }],
  ["1440", { width: 1440, height: 1000 }],
];
const browsers = [
  ["chrome", () => chromium.launch({ channel: "chrome", headless: true })],
  ["firefox", () => firefox.launch({ headless: true })],
];
const fixtureHosts = new Set([
  "api.atlas-systems.uk",
  "atlas-systems.uk",
]);
const expectedRoutes = ["Work", "Writing", "Lab", "Systems", "About"];
const report = [];
const failures = [];

function summarizeViolation(item) {
  return {
    id: item.id,
    impact: item.impact,
    help: item.help,
    nodes: item.nodes.map((node) => ({
      target: node.target,
      html: node.html,
      failureSummary: node.failureSummary,
    })),
  };
}

function writeReport() {
  fs.writeFileSync(
    "evidence.json",
    `${JSON.stringify({
      preview: base,
      commit: process.env.HEAD_SHA,
      fixture: "deterministic-unavailable",
      browsers: browsers.map(([name]) => name),
      viewports: viewports.map(([name]) => Number(name)),
      routes: report,
      failures,
    }, null, 2)}\n`,
  );
}

async function configureContext(context) {
  await context.addInitScript(() => {
    Object.defineProperty(window, "__ATLAS_EVIDENCE_MODE__", {
      value: "deterministic-unavailable",
      configurable: false,
      writable: false,
    });
  });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (fixtureHosts.has(url.hostname)) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: { "cache-control": "no-store" },
        body: JSON.stringify({ error: "deterministic preview fixture" }),
      });
      return;
    }
    await route.continue();
  });
}

async function openWithRetry(page) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const response = await page.goto(new URL("/", base).toString(), {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? "no response"}`);
      await page.waitForSelector(".status-global-header", { timeout: 15_000 });
      await page.waitForSelector("[data-atlas-status][data-state='unknown']", { timeout: 15_000 });
      await page.evaluate(() => document.fonts?.ready || Promise.resolve());
      await page.waitForTimeout(500);
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(attempt * 1_000);
    }
  }
  throw lastError;
}

async function inspectPage(page) {
  return page.evaluate(() => {
    function selectorFor(element) {
      if (!element || element === document.documentElement) return "html";
      if (element.id) return `#${CSS.escape(element.id)}`;
      const classes = [...element.classList]
        .slice(0, 3)
        .map((name) => `.${CSS.escape(name)}`)
        .join("");
      return `${element.tagName.toLowerCase()}${classes}`;
    }

    const width = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const overflow = [...document.querySelectorAll("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: selectorFor(element),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((item) => item.left < -1 || item.right > width + 1)
      .sort((a, b) => b.width - a.width)
      .slice(0, 12);

    const bottomNav = document.querySelector(".status-bottom-nav");
    const bottomNavVisible = getComputedStyle(bottomNav).display !== "none";
    const bottomNavHeight = bottomNavVisible ? bottomNav.getBoundingClientRect().height : 0;
    const bodyPaddingBottom = Number.parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
    const focusTarget = document.querySelector(".status-search-button");
    const focusStyle = getComputedStyle(focusTarget);
    const routes = [...document.querySelectorAll(".atlas-global-header__nav a")]
      .map((link) => link.textContent.trim());

    return {
      title: document.title,
      canonical: document.querySelector('link[rel="canonical"]')?.href || null,
      fixtureMode: window.__ATLAS_EVIDENCE_MODE__ || null,
      width,
      scrollWidth,
      overflow,
      h1Count: document.querySelectorAll("h1").length,
      mainCount: document.querySelectorAll("main").length,
      primaryNavCount: document.querySelectorAll('nav[aria-label="Primary navigation"]').length,
      mobileNavCount: document.querySelectorAll('nav[aria-label="Mobile navigation"]').length,
      routes,
      productStrip: Boolean(document.querySelector(".status-product-strip")),
      aggregateState: document.querySelector("[data-atlas-status]")?.dataset.state || null,
      aggregateLabel: document.querySelector("[data-atlas-status-label]")?.textContent.trim() || null,
      bottomNavVisible,
      bottomNavHeight,
      bodyPaddingBottom,
      bottomRoutes: [...bottomNav.querySelectorAll("a")].map((link) => link.textContent.trim()),
      searchHeight: Math.round(focusTarget.getBoundingClientRect().height),
      searchFocused: document.activeElement === focusTarget,
      focusOutline: {
        style: focusStyle.outlineStyle,
        width: focusStyle.outlineWidth,
      },
      bodyFont: Number.parseFloat(getComputedStyle(document.body).fontSize),
      supportingFont: Number.parseFloat(getComputedStyle(document.querySelector(".section-intro")).fontSize),
      metadataFont: Number.parseFloat(getComputedStyle(document.querySelector(".status-footnote")).fontSize),
    };
  });
}

function semanticFailures(evidence, browserName, viewportName) {
  const prefix = `${browserName}/${viewportName}/status`;
  const values = [];
  if (evidence.title !== "Status // Atlas Systems") values.push(`${prefix}: incorrect title`);
  if (evidence.canonical !== "https://status.atlas-systems.uk/") values.push(`${prefix}: incorrect canonical URL`);
  if (evidence.fixtureMode !== "deterministic-unavailable") values.push(`${prefix}: deterministic fixture mode is missing`);
  if (evidence.h1Count !== 1) values.push(`${prefix}: expected one h1, found ${evidence.h1Count}`);
  if (evidence.mainCount !== 1) values.push(`${prefix}: expected one main, found ${evidence.mainCount}`);
  if (evidence.primaryNavCount !== 1) values.push(`${prefix}: expected one primary navigation`);
  if (evidence.mobileNavCount !== 1) values.push(`${prefix}: expected one mobile navigation`);
  if (JSON.stringify(evidence.routes) !== JSON.stringify(expectedRoutes)) values.push(`${prefix}: desktop route order drifted`);
  if (JSON.stringify(evidence.bottomRoutes) !== JSON.stringify(expectedRoutes)) values.push(`${prefix}: mobile route order drifted`);
  if (!evidence.productStrip) values.push(`${prefix}: Status product identity is missing`);
  if (evidence.aggregateState !== "unknown" || evidence.aggregateLabel !== "Unknown") {
    values.push(`${prefix}: unavailable fixture did not fail closed to Unknown`);
  }
  if (evidence.scrollWidth > evidence.width + 1) {
    values.push(`${prefix}: horizontal overflow ${evidence.scrollWidth} > ${evidence.width}; ${JSON.stringify(evidence.overflow)}`);
  }
  const mobileExpected = Number(viewportName) < 768;
  if (mobileExpected !== evidence.bottomNavVisible) values.push(`${prefix}: bottom navigation visibility is incorrect`);
  if (mobileExpected && evidence.bodyPaddingBottom + 1 < evidence.bottomNavHeight) {
    values.push(`${prefix}: bottom navigation can obscure content or focus`);
  }
  if (mobileExpected && evidence.searchHeight < 44) values.push(`${prefix}: search touch target is under 44px`);
  if (!evidence.searchFocused) values.push(`${prefix}: keyboard Tab did not reach estate search`);
  if (evidence.focusOutline.style !== "solid" || Number.parseFloat(evidence.focusOutline.width) < 2) {
    values.push(`${prefix}: visible focus is missing`);
  }
  if (evidence.bodyFont < 15) values.push(`${prefix}: body copy is below 15px`);
  if (evidence.supportingFont < 13) values.push(`${prefix}: supporting copy is below 13px`);
  if (evidence.metadataFont < 11) values.push(`${prefix}: metadata is below 11px`);
  return values;
}

async function verifySearchDialog(page, browserName, viewportName) {
  await page.locator(".status-search-button").click();
  const dialog = page.locator('[role="dialog"][aria-modal="true"]');
  await dialog.waitFor({ state: "visible" });
  const inputFocused = await page.locator(".atlas-search-input").evaluate(
    (input) => document.activeElement === input,
  );
  if (!inputFocused) failures.push(`${browserName}/${viewportName}/status: search did not move focus into the dialog`);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  const focusReturned = await page.locator(".status-search-button").evaluate(
    (button) => document.activeElement === button,
  );
  if (!focusReturned) failures.push(`${browserName}/${viewportName}/status: search did not restore trigger focus`);
}

async function capture(context, browserName, viewportName) {
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await openWithRetry(page);
    await verifySearchDialog(page, browserName, viewportName);
    await page.locator(".atlas-global-header__nav a").last().focus();
    await page.keyboard.press("Tab");
    const semantics = await inspectPage(page);
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const violations = accessibility.violations.map(summarizeViolation);
    const blocking = violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical",
    );
    const pageFailures = semanticFailures(semantics, browserName, viewportName);
    if (pageErrors.length) {
      pageFailures.push(`${browserName}/${viewportName}/status: page errors ${JSON.stringify(pageErrors)}`);
    }
    if (blocking.length) {
      pageFailures.push(`${browserName}/${viewportName}/status: serious accessibility findings ${JSON.stringify(blocking)}`);
    }
    failures.push(...pageFailures);

    await page.evaluate(() => document.activeElement?.blur());
    const fullPage = `screenshots/${browserName}-${viewportName}-status-full.png`;
    await page.screenshot({ path: fullPage, fullPage: true });
    const viewport = `screenshots/${browserName}-${viewportName}-status-viewport.png`;
    await page.screenshot({ path: viewport, fullPage: false });
    report.push({
      browser: browserName,
      viewport: viewportName,
      route: "/",
      semantics,
      pageErrors,
      accessibilityViolations: violations,
      failures: pageFailures,
      screenshots: { fullPage, viewport },
    });
  } catch (error) {
    const message = `${browserName}/${viewportName}/status: ${error.stack || error.message}`;
    failures.push(message);
    report.push({ browser: browserName, viewport: viewportName, route: "/", failures: [message] });
  } finally {
    writeReport();
    await page.close();
  }
}

async function run() {
  fs.mkdirSync("screenshots", { recursive: true });
  for (const [browserName, launch] of browsers) {
    const browser = await launch();
    try {
      for (const [viewportName, viewport] of viewports) {
        const context = await browser.newContext({
          viewport,
          reducedMotion: "reduce",
          serviceWorkers: "block",
        });
        await configureContext(context);
        try {
          await capture(context, browserName, viewportName);
        } finally {
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
  writeReport();
  if (failures.length) {
    throw new Error(`Interface evidence failed with ${failures.length} findings:\n${failures.join("\n")}`);
  }
}

try {
  await run();
} catch (error) {
  fs.writeFileSync("capture-error.txt", `${error.stack || error.message}\n`);
  process.exitCode = 1;
}

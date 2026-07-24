import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";

import {
  STATUS_ENDPOINT,
  STATUS_LABELS,
  STATUS_PAGE,
  STATUS_STALE_AFTER_MS,
  parseEstateStatus,
} from "../js/estate-status.js";

const NOW = Date.parse("2026-07-23T08:00:00Z");
const BUNDLE_ROOT = "static/vendor/atlas-interface/v0.2.0";
const ROUTES = ["Work", "Writing", "Lab", "Systems", "About"];
const snapshot = (operational, total, checkedAt = "2026-07-23T07:55:00Z") => ({
  estate: { operational, total_components: total, checked_at: checkedAt },
});

function sha256(path) {
  return crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");
}

test("Status header consumes the bounded aggregate contract", () => {
  assert.equal(STATUS_ENDPOINT, "https://api.atlas-systems.uk/v1/stats");
  assert.equal(STATUS_PAGE, "https://status.atlas-systems.uk/");
  assert.equal(STATUS_STALE_AFTER_MS, 1_200_000);
  assert.equal(STATUS_LABELS.operational, "Operational");
  assert.equal(parseEstateStatus(snapshot(19, 19), NOW).state, "operational");
  assert.equal(parseEstateStatus(snapshot(18, 19), NOW).state, "degraded");
  assert.equal(parseEstateStatus(snapshot(9, 19), NOW).state, "unavailable");
  assert.equal(parseEstateStatus(snapshot(19, 19, "2026-07-23T07:39:59Z"), NOW).state, "unknown");
  assert.equal(parseEstateStatus(snapshot(20, 19), NOW).state, "unknown");
});

test("source HTML materializes the accepted shell and metadata", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert.match(html, /<title>Status \/\/ Atlas Systems<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/status\.atlas-systems\.uk\/">/);
  assert.doesNotMatch(html, /raw\.githubusercontent\.com/);
  assert.match(html, /static\/vendor\/atlas-interface\/v0\.2\.0\/atlas-fonts\.css/);
  assert.match(html, /static\/vendor\/atlas-interface\/v0\.2\.0\/atlas-interface-kit\.css/);
  assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com/);
  assert.match(html, /class="atlas-global-header status-global-header"/);
  assert.match(html, /class="atlas-product-strip status-product-strip"/);
  assert.match(html, /class="atlas-bottom-nav status-bottom-nav"/);
  assert.match(html, /data-atlas-status/);
  assert.match(html, /data-estate-search-open/);

  const desktop = html.match(
    /<nav class="atlas-global-header__nav"[\s\S]*?<\/nav>/,
  )?.[0];
  const mobile = html.match(
    /<nav class="atlas-bottom-nav status-bottom-nav"[\s\S]*?<\/nav>/,
  )?.[0];
  assert.ok(desktop);
  assert.ok(mobile);
  for (const source of [desktop, mobile]) {
    let previous = -1;
    for (const route of ROUTES) {
      const position = source.indexOf(`>${route}</a>`);
      assert.ok(position > previous, `${route} must follow the accepted route order`);
      previous = position;
    }
  }
});

test("runtime wrapper preserves source semantics and reliability ownership", () => {
  const wrapper = fs.readFileSync("js/reliability.js", "utf8");
  const shell = fs.readFileSync("js/interface-shell.js", "utf8");
  const core = fs.readFileSync("js/reliability-core.js", "utf8");
  assert.match(wrapper, /import "\.\/interface-shell\.js";/);
  assert.match(wrapper, /export \* from "\.\/reliability-core\.js";/);
  assert.doesNotMatch(wrapper, /page-title/);
  assert.doesNotMatch(shell, /replaceChildren\(/);
  assert.doesNotMatch(shell, /createElement\("nav"\)/);
  assert.match(shell, /installEstateSearch\(\)/);
  assert.match(shell, /noopener noreferrer/);
  assert.match(core, /https:\/\/api\.atlas-systems\.uk\/v1\/reliability/);
  assert.match(core, /const SLO_CONFIG_URL = "\/slo\.json"/);
  assert.match(core, /setInterval\(poll, SLO_POLL_MS\)/);
});

test("search is repository-local, bounded, and keyboard-contained", () => {
  const search = fs.readFileSync("js/estate-search.js", "utf8");
  assert.match(search, /https:\/\/api\.atlas-systems\.uk\/v1\/search/);
  assert.doesNotMatch(search, /corpus\.atlas-systems\.uk/);
  assert.match(search, /role", "dialog"/);
  assert.match(search, /aria-modal", "true"/);
  assert.match(search, /trapFocus/);
  assert.match(search, /previousFocus\.focus\(\)/);
  assert.match(search, /Rate limit|rate limit/i);
});

test("repository-local interface bundle matches the canonical manifest", () => {
  const versions = fs.readdirSync("static/vendor/atlas-interface", {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(versions, ["v0.2.0"]);

  const manifest = JSON.parse(
    fs.readFileSync(`${BUNDLE_ROOT}/manifest.json`, "utf8"),
  );
  assert.equal(manifest.schema_version, "atlas-interface-kit/bundle/v1");
  assert.equal(manifest.version, "0.2.0");
  assert.equal(manifest.contract_version, "2.0.0");
  assert.equal(manifest.component_role_count, 25);
  assert.deepEqual(
    Object.keys(manifest.files).sort(),
    [
      "atlas-fonts.css",
      "atlas-interface-kit.css",
      "components.json",
      "fonts/dm-serif-display-400-italic.woff2",
      "fonts/dm-serif-display-400.woff2",
      "fonts/ibm-plex-mono-400.woff2",
      "fonts/ibm-plex-mono-500.woff2",
      "licenses/DM-Serif-Display-OFL.txt",
      "licenses/IBM-Plex-Mono-OFL.txt",
      "tokens.json",
    ],
  );
  for (const [name, record] of Object.entries(manifest.files)) {
    const path = `${BUNDLE_ROOT}/${name}`;
    assert.equal(fs.statSync(path).size, record.bytes, `${name} byte count`);
    assert.equal(sha256(path), record.sha256, `${name} SHA-256`);
  }
});

test("Pages headers constrain the public status surface", () => {
  const headers = fs.readFileSync("_headers", "utf8");
  assert.match(headers, /Strict-Transport-Security: max-age=63072000; includeSubDomains/);
  assert.match(headers, /X-Frame-Options: DENY/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /Referrer-Policy: no-referrer/);
  assert.match(headers, /Permissions-Policy: camera=\(\), geolocation=\(\), microphone=\(\), payment=\(\), usb=\(\)/);
  assert.match(headers, /connect-src 'self' https:\/\/api\.atlas-systems\.uk/);
  assert.match(headers, /font-src 'self'/);
  assert.doesNotMatch(headers, /fonts\.(?:googleapis|gstatic)\.com/);
});

test("Status typography, touch, focus, and reduced-motion rules use v2 tokens", () => {
  const css = fs.readFileSync("css/interface-shell.css", "utf8");
  assert.match(css, /font-size: var\(--atlas-type-body\)/);
  assert.match(css, /font-size: var\(--atlas-type-supporting\)/);
  assert.match(css, /font-size: var\(--atlas-type-meta\)/);
  assert.match(css, /min-height: var\(--atlas-touch-min\)/);
  assert.match(css, /outline: 2px solid var\(--atlas-focus\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /--text-faint:\s*#3a3a44/);
});

test("browser icons and web manifest are repository-local", () => {
  for (const path of [
    "favicon.ico",
    "favicon-16x16.png",
    "favicon-32x32.png",
    "apple-touch-icon.png",
    "android-chrome-192x192.png",
    "android-chrome-512x512.png",
  ]) {
    assert.ok(fs.statSync(path).size > 0, path);
  }
  const manifest = JSON.parse(fs.readFileSync("site.webmanifest", "utf8"));
  assert.equal(manifest.name, "Atlas Systems Status");
  assert.equal(manifest.theme_color, "#0a0a0f");
  assert.equal(manifest.background_color, "#0a0a0f");
});

test("preview evidence covers both browsers and the governed viewport matrix", () => {
  const script = fs.readFileSync("scripts/capture_interface_evidence.mjs", "utf8");
  const workflow = fs.readFileSync(".github/workflows/interface-preview.yml", "utf8");
  for (const viewport of [320, 375, 768, 1024, 1440]) {
    assert.match(script, new RegExp(`\\["${viewport}"`));
  }
  assert.match(script, /chromium\.launch\(\{ channel: "chrome"/);
  assert.match(script, /firefox\.launch/);
  assert.match(script, /serious/);
  assert.match(script, /critical/);
  assert.match(script, /horizontal overflow/);
  assert.match(workflow, /retention-days: 14/);
  assert.match(workflow, /github\.event\.pull_request\.head\.sha/);
  assert.doesNotMatch(workflow, /feat\/estate-shell-v1/);
});

test("production deployment remains independent and does not rewrite source", () => {
  const deploy = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
  assert.match(deploy, /validate-static\.yml/);
  assert.match(deploy, /project_name: status/);
  assert.doesNotMatch(deploy, /git push/);
  assert.doesNotMatch(deploy, /source_changed/);
  assert.doesNotMatch(deploy, /\[skip ci\]/);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  STATUS_ENDPOINT,
  STATUS_STALE_AFTER_MS,
  parseEstateStatus,
} from "../js/estate-status.js";

const NOW = Date.parse("2026-07-23T08:00:00Z");
const snapshot = (operational, total, checkedAt = "2026-07-23T07:55:00Z") => ({
  estate: { operational, total_components: total, checked_at: checkedAt },
});

test("Status header consumes the bounded aggregate contract", () => {
  assert.equal(STATUS_ENDPOINT, "https://api.atlas-systems.uk/v1/stats");
  assert.equal(STATUS_STALE_AFTER_MS, 1_200_000);
  assert.equal(parseEstateStatus(snapshot(19, 19), NOW).state, "nominal");
  assert.equal(parseEstateStatus(snapshot(18, 19), NOW).state, "degraded");
  assert.equal(parseEstateStatus(snapshot(9, 19), NOW).state, "unavailable");
  assert.equal(parseEstateStatus(snapshot(19, 19, "2026-07-23T07:39:59Z"), NOW).state, "unknown");
  assert.equal(parseEstateStatus(snapshot(20, 19), NOW).state, "unknown");
});

test("interface wrapper preserves reliability exports and source semantics", () => {
  const wrapper = fs.readFileSync("js/reliability.js", "utf8");
  const core = fs.readFileSync("js/reliability-core.js", "utf8");
  assert.match(wrapper, /import "\.\/interface-shell\.js";/);
  assert.match(wrapper, /export \* from "\.\/reliability-core\.js";/);
  assert.match(core, /https:\/\/api\.atlas-systems\.uk\/v1\/reliability/);
  assert.match(core, /const SLO_CONFIG_URL = "\/slo\.json"/);
  assert.match(core, /setInterval\(poll, SLO_POLL_MS\)/);
});

test("global header, search, metadata, and safe link policies are present", () => {
  const shell = fs.readFileSync("js/interface-shell.js", "utf8");
  for (const route of ["/work/", "/writing/", "/lab/", "/about/"]) {
    assert.ok(shell.includes(`https://atlas-systems.uk${route}`));
  }
  assert.match(shell, /installEstateSearch\(\)/);
  assert.match(shell, /og:image:alt/);
  assert.match(shell, /noopener noreferrer/);
  assert.match(shell, /aria-current", "page"/);
});

test("search is repository-local and uses the public edge endpoint", () => {
  const search = fs.readFileSync("js/estate-search.js", "utf8");
  assert.match(search, /https:\/\/api\.atlas-systems\.uk\/v1\/search/);
  assert.doesNotMatch(search, /corpus\.atlas-systems\.uk/);
  assert.match(search, /role", "dialog"/);
  assert.match(search, /aria-modal", "true"/);
  assert.match(search, /Rate limit|rate limit/i);
});

test("required text no longer uses the failing historical faint token", () => {
  const css = fs.readFileSync("css/interface-shell.css", "utf8");
  assert.match(css, /--text-dim: #aaa9a0/);
  assert.match(css, /--text-faint: #77776f/);
  assert.doesNotMatch(css, /--text-faint:\s*#3a3a44/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /outline: 2px solid var\(--atlas-focus\)/);
});

test("web manifest is dark and names the product", () => {
  const manifest = JSON.parse(fs.readFileSync("site.webmanifest", "utf8"));
  assert.equal(manifest.name, "Atlas Systems Status");
  assert.equal(manifest.theme_color, "#0a0a0f");
  assert.equal(manifest.background_color, "#0a0a0f");
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const css = fs.readFileSync("css/phase-8-accessibility.css", "utf8");
const loader = fs.readFileSync("js/phase-8-accessibility.js", "utf8");
const root = fs.readFileSync("js/interface-shell.js", "utf8");
const error = fs.readFileSync("js/error-status.js", "utf8");

function block(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] || "";
}

test("Phase 8 keeps compact desktop nav geometry while sizing stateful controls", () => {
  assert.match(block(".nav-wordmark"), /min-width:\s*var\(--atlas-touch-min\)/);
  assert.match(block(".nav-wordmark"), /min-height:\s*var\(--atlas-touch-min\)/);
  assert.doesNotMatch(css, /\.status-global-header \.atlas-global-header__link\s*\{[\s\S]*min-width:\s*var\(--atlas-touch-min\)/);
  assert.match(css, /\.atlas-estate-status,[\s\S]*\.status-search-button\s*\{[\s\S]*min-height:\s*var\(--atlas-touch-min\)/);
});

test("Phase 8 styles are repository-local and installed on root and error routes", () => {
  assert.match(loader, /\/css\/phase-8-accessibility\.css\?v=20260730-phase-8-v1/);
  assert.doesNotMatch(loader, /https?:\/\//);
  assert.match(root, /ensurePhase8AccessibilityStylesheet\(\)/);
  assert.match(error, /ensurePhase8AccessibilityStylesheet\(\)/);
});

test("Phase 8 does not rewrite Status data or search ownership", () => {
  assert.doesNotMatch(loader + css, /\/v1\/(?:stats|registry|reliability|events|search)/);
  assert.doesNotMatch(loader + css, /setInterval|fetch\(|MutationObserver/);
});

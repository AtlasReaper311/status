import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  FOOTER_STYLESHEET,
  buildStatusFooter,
} from "../js/phase-6-footer.js";

test("Status footer module is installed by the existing interface shell", () => {
  const shell = fs.readFileSync("js/interface-shell.js", "utf8");
  assert.match(shell, /import \{ installStatusFooter \} from "\.\/phase-6-footer\.js";/);
  assert.match(shell, /installStatusFooter\(\);/);
});

test("Status footer profile is product-specific and complete", () => {
  assert.equal(FOOTER_STYLESHEET, "/css/phase-6-footer.css?v=20260730-phase-6-v1");
  const source = fs.readFileSync("js/phase-6-footer.js", "utf8");
  assert.match(source, /atlas-footer--product/);
  assert.match(source, /atlas-footer__identity/);
  assert.match(source, /atlas-footer__context/);
  assert.match(source, /atlas-footer__evidence/);
  assert.match(source, /atlas-footer__escape/);
  assert.match(source, /Atlas Systems Status/);
  assert.match(source, /Public service state and reliability evidence/);
  assert.doesNotMatch(source, /atlas-footer__sequence/);
  assert.equal(typeof buildStatusFooter, "function");
});

test("footer-only presentation keeps a compact two-band desktop rail and v0.4.0 responsive behaviour", () => {
  const css = fs.readFileSync("css/phase-6-footer.css", "utf8");
  assert.match(css, /atlas-interface-kit v0\.4\.0/);
  assert.match(
    css,
    /grid-template-areas:\s*"identity escape"\s*"context evidence"/,
  );
  assert.match(css, /margin: var\(--atlas-space-7, 48px\) auto 0/);
  assert.match(css, /padding: var\(--atlas-space-5, 24px\)/);
  assert.match(css, /min-width: var\(--atlas-touch-min, 44px\)/);
  assert.match(css, /min-height: var\(--atlas-touch-min, 44px\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /atlas-footer__sequence/);
});

test("preview publication requires explicit provider-write approval", () => {
  const workflow = fs.readFileSync(".github/workflows/interface-preview.yml", "utf8");
  assert.match(workflow, /types: \[opened, synchronize, reopened, labeled\]/);
  assert.match(
    workflow,
    /contains\(github\.event\.pull_request\.labels\.\*\.name, 'interface-preview-approved'\)/,
  );
  assert.match(workflow, /name: Validate Status preview candidate/);
  assert.match(workflow, /name: Publish non-production Status preview/);
});

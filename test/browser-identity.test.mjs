import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const home = fs.readFileSync("index.html", "utf8");
const notFound = fs.readFileSync("404.html", "utf8");
const errorStatus = fs.readFileSync("js/error-status.js", "utf8");
const icons = [
  ["icon", "/favicon.ico", "any"],
  ["icon", "/favicon-16x16.png", "16x16"],
  ["icon", "/favicon-32x32.png", "32x32"],
  ["apple-touch-icon", "/apple-touch-icon.png", "180x180"],
  ["manifest", "/site.webmanifest", null],
];

function assertIconContract(html) {
  for (const [rel, href, sizes] of icons) {
    assert.match(html, new RegExp(`<link[^>]+rel="${rel}"[^>]+href="${href.replaceAll("/", "\\/")}"`));
    if (sizes) assert.match(html, new RegExp(`href="${href.replaceAll("/", "\\/")}"[^>]+sizes="${sizes}"|sizes="${sizes}"[^>]+href="${href.replaceAll("/", "\\/")}"`));
  }
}

test("Status root exposes one coherent browser identity", () => {
  assert.match(home, /<title>Status \/\/ Atlas Systems<\/title>/);
  assert.match(home, /<link rel="canonical" href="https:\/\/status\.atlas-systems\.uk\/">/);
  assert.match(home, /property="og:url" content="https:\/\/status\.atlas-systems\.uk\/"/);
  assert.match(home, /property="og:title" content="Status \/\/ Atlas Systems"/);
  assert.match(home, /name="twitter:title" content="Status \/\/ Atlas Systems"/);
  assert.match(home, /property="og:image" content="https:\/\/atlas-systems\.uk\/og\/status\.png"/);
  assert.match(home, /name="twitter:image" content="https:\/\/atlas-systems\.uk\/og\/status\.png"/);
  assert.match(home, /property="og:image:alt" content="Live estate status\. \/\/ Atlas Systems"/);
  assert.match(home, /name="twitter:image:alt" content="Live estate status\. \/\/ Atlas Systems"/);
  assertIconContract(home);
});

test("Status owns a noindex 404 product response with bounded live aggregate status", () => {
  assert.match(notFound, /<title>404 \/\/ Status \/\/ Atlas Systems<\/title>/);
  assert.match(notFound, /name="robots" content="noindex, follow"/);
  assert.match(notFound, /name="theme-color" content="#0a0a0f"/);
  assert.doesNotMatch(notFound, /rel="canonical"/);
  assert.doesNotMatch(notFound, /property="og:/);
  assert.doesNotMatch(notFound, /name="twitter:/);
  assert.match(notFound, /class="atlas-footer atlas-footer--product"/);
  assert.match(notFound, /href="\/">Open Status<\/a>/);
  assert.match(notFound, /class="nav-wordmark"[^>]*>Atlas<span>_<\/span>Systems<\/a>/);
  assert.match(notFound, /\.nav-wordmark\{[^}]*text-transform:uppercase/);
  assert.match(notFound, /data-atlas-status data-state="checking"/);
  assert.match(notFound, /data-atlas-status-label>Checking<\/span>/);
  assert.match(notFound, /<script type="module" src="\/js\/error-status\.js"><\/script>/);
  assert.match(errorStatus, /STATUS_ENDPOINT/);
  assert.match(errorStatus, /parseEstateStatus/);
  assert.doesNotMatch(errorStatus, /v1\/registry|deploy-watch|activity|slo/i);
  assertIconContract(notFound);
});

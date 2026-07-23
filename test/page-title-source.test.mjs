import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const script = path.resolve("scripts/normalize_page_title.py");

function runFixture(html) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-status-title-"));
  const target = path.join(root, "index.html");
  fs.writeFileSync(target, html, "utf8");
  execFileSync("python3", [script, target], { stdio: "pipe" });
  return fs.readFileSync(target, "utf8");
}

test("source normalizer materializes browser and social title metadata", () => {
  const html = runFixture('<head>\n<title>Atlas Systems // status</title>\n</head>\n');
  assert.match(html, /<title>Status \/\/ Atlas Systems<\/title>/);
  assert.match(html, /<meta property="og:title" content="Status \/\/ Atlas Systems">/);
  assert.match(html, /<meta name="twitter:title" content="Status \/\/ Atlas Systems">/);
});

test("source normalizer is idempotent", () => {
  const html = runFixture(
    '<head>\n<title>Status // Atlas Systems</title>\n<meta property="og:title" content="Status // Atlas Systems">\n<meta name="twitter:title" content="Status // Atlas Systems">\n</head>\n',
  );
  assert.equal((html.match(/og:title/g) || []).length, 1);
  assert.equal((html.match(/twitter:title/g) || []).length, 1);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const security = fs.readFileSync(".well-known/security.txt", "utf8");

test("Status exposes the canonical Atlas Systems security contact", () => {
  assert.match(security, /^Contact: mailto:atlas@atlas-systems\.uk$/m);
  assert.match(security, /^Expires: 2027-07-24T23:59:59Z$/m);
  assert.match(security, /^Preferred-Languages: en$/m);
  assert.match(security, /^Canonical: https:\/\/status\.atlas-systems\.uk\/\.well-known\/security\.txt$/m);
});

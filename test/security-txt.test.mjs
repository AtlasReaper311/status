import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const path = ".well-known/security.txt";
const expected = [
  "Contact: mailto:atlas@atlas-systems.uk",
  "Expires: 2027-07-24T23:59:59Z",
  "Preferred-Languages: en",
  "Canonical: https://status.atlas-systems.uk/.well-known/security.txt",
];

test("Status publishes the approved security contact at the standard route", () => {
  assert.deepEqual(fs.readFileSync(path, "utf8").trim().split("\n"), expected);
});

test("Status security metadata is covered by the Pages security headers", () => {
  const headers = fs.readFileSync("_headers", "utf8");
  assert.match(headers, /^\/\*$/m);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /Referrer-Policy: no-referrer/);
});

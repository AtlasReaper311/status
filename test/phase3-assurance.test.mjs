import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const wrapper = fs.readFileSync("js/reliability.js", "utf8");
const landmark = fs.readFileSync("js/product-landmark.js", "utf8");

test("Status installs a named product landmark through its local interface shell", () => {
  assert.match(wrapper, /import "\.\/product-landmark\.js";/);
  assert.match(landmark, /querySelector\("\.status-product-strip"\)/);
  assert.match(landmark, /setAttribute\("role", "region"\)/);
  assert.match(
    landmark,
    /setAttribute\("aria-label", "Status product identity"\)/,
  );
  assert.doesNotMatch(landmark, /innerHTML|outerHTML|replaceChildren/);
});

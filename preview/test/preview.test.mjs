import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);

async function text(name) {
  return readFile(new URL(name, root), "utf8");
}

test("preview exposes the four primary tablet views", async () => {
  const html = await text("index.html");

  for (const view of ["dashboard", "products", "locations", "scanner"]) {
    assert.match(html, new RegExp(`data-view=\\"${view}\\"`));
  }
});

test("preview references local CSS and JS assets", async () => {
  const html = await text("index.html");
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/app\.js"/);
});

test("tablet CSS contains compact navigation breakpoint and touch target", async () => {
  const css = await text("styles.css");
  assert.match(css, /@media\s*\(max-width:\s*820px\)/);
  assert.match(css, /min-height:\s*44px/);
});

test("scanner demo includes multiple identifiers", async () => {
  const js = await text("app.js");
  assert.match(js, /789100006204/);
  assert.match(js, /ROL-6204/);
  assert.match(js, /ELE-DJ32/);
});

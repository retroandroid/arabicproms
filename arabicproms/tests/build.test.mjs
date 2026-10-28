import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import { test } from "node:test";

const source = new URL("../public/questionnaires/", import.meta.url);
const built = new URL("../dist/questionnaires/", import.meta.url);
test("production output contains the fresh manifest and all 23 questionnaire CSVs byte for byte", async () => {
  const files = (await readdir(source)).filter((file) => file.endsWith(".csv")).sort();
  assert.equal(files.length, 23);
  assert.deepEqual((await readdir(built)).filter((file) => file.endsWith(".csv")).sort(), files);
  for (const file of [...files, "manifest.json"]) {
    assert.deepEqual(await readFile(new URL(file, built)), await readFile(new URL(file, source)), file);
  }
});
test("production HTML has Arabic direction, a mobile viewport and existing JS/CSS assets", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /id="root"/);
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map((match) => match[1]);
  assert.ok(assets.some((path) => path.endsWith(".js")));
  assert.ok(assets.some((path) => path.endsWith(".css")));
  for (const asset of assets) await access(new URL(`../dist${asset}`, import.meta.url));
});

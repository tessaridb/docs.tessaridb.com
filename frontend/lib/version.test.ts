import assert from "node:assert/strict";
import { test } from "node:test";

import { basePath, inRelease, isLabel, release, withinRelease } from "./version.ts";

test("a label is a version string and nothing that could leave the path", () => {
  assert.equal(isLabel("0.32.0-beta"), true);
  assert.equal(isLabel("1.0.0"), true);
  assert.equal(isLabel("../etc"), false);
  assert.equal(isLabel("1.0.0/x"), false);
  assert.equal(isLabel("v1"), false);
  assert.equal(isLabel(""), false);
});

test("internal links stay in the release and nothing else is touched", () => {
  const html =
    '<a href="/query-language/records">r</a> <a href="//cdn.example/x">c</a> ' +
    '<a href="https://tessaridb.com/">t</a> <a href="#anchor">a</a>';
  assert.equal(
    withinRelease(html, "/v/0.31.0-beta"),
    '<a href="/v/0.31.0-beta/query-language/records">r</a> <a href="//cdn.example/x">c</a> ' +
      '<a href="https://tessaridb.com/">t</a> <a href="#anchor">a</a>',
  );
  assert.equal(withinRelease(html, basePath(null)), html);
});

test("switching release keeps the page", () => {
  assert.equal(inRelease("/query-language/records", "0.31.0-beta"), "/v/0.31.0-beta/query-language/records");
  assert.equal(inRelease("/v/0.31.0-beta/query-language/records", null), "/query-language/records");
  assert.equal(inRelease("/v/0.31.0-beta/x", "0.30.0-beta"), "/v/0.30.0-beta/x");
  assert.equal(inRelease("/", "0.31.0-beta"), "/v/0.31.0-beta");
  assert.equal(inRelease("/v/0.31.0-beta", null), "/");
});

test("a release parameter is the live site, a label, or refused", () => {
  assert.equal(release(null), null);
  assert.equal(release(""), null);
  assert.equal(release("0.31.0-beta"), "0.31.0-beta");
  assert.equal(release("../x"), undefined);
});

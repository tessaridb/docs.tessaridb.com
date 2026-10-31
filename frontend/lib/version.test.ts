import assert from "node:assert/strict";
import { test } from "node:test";

import { inRelease, isLabel, release, withinRelease } from "./version.ts";

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
    withinRelease(html, "db", "0.31.0-beta"),
    '<a href="/v/0.31.0-beta/query-language/records">r</a> <a href="//cdn.example/x">c</a> ' +
      '<a href="https://tessaridb.com/">t</a> <a href="#anchor">a</a>',
  );
  assert.equal(withinRelease(html, "db", null), html);
});

test("switching release keeps the page", () => {
  assert.equal(inRelease("/query-language/records", "0.31.0-beta"), "/v/0.31.0-beta/query-language/records");
  assert.equal(inRelease("/v/0.31.0-beta/query-language/records", null), "/query-language/records");
  assert.equal(inRelease("/v/0.31.0-beta/x", "0.30.0-beta"), "/v/0.30.0-beta/x");
  assert.equal(inRelease("/", "0.31.0-beta"), "/v/0.31.0-beta");
  assert.equal(inRelease("/v/0.31.0-beta", null), "/");
  assert.equal(inRelease("/kv/writes", "0.0.1"), "/kv/v/0.0.1/writes");
  assert.equal(inRelease("/kv/v/0.0.1/writes", null), "/kv/writes");
  assert.equal(inRelease("/kv/v/0.0.1", "0.0.2"), "/kv/v/0.0.2");
  assert.equal(inRelease("/kv", "0.0.1"), "/kv/v/0.0.1");
});

test("a release parameter is the live site, a label, or refused", () => {
  assert.equal(release(null), null);
  assert.equal(release(""), null);
  assert.equal(release("0.31.0-beta"), "0.31.0-beta");
  assert.equal(release("../x"), undefined);
});

test("in a product's release only that product's links stay in the release", () => {
  const html =
    '<a href="/kv/writes">w</a> <a href="/query-language/records">r</a>';
  assert.equal(
    withinRelease('<a href="/kv">k</a>', "kv", "0.0.1"),
    '<a href="/kv/v/0.0.1">k</a>',
  );
  assert.equal(
    withinRelease(html, "kv", "0.0.1"),
    '<a href="/kv/v/0.0.1/writes">w</a> <a href="/query-language/records">r</a>',
  );
  assert.equal(
    withinRelease(html, "db", "0.34.0"),
    '<a href="/kv/writes">w</a> <a href="/v/0.34.0/query-language/records">r</a>',
  );
});

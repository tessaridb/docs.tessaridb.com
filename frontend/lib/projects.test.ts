import assert from "node:assert/strict";
import { test } from "node:test";

import {
  home,
  pagePath,
  pageSlug,
  project,
  projectOf,
  projects,
  releaseOf,
  startOf,
} from "./projects.ts";

test("the project a path is in, live or archived", () => {
  assert.equal(projectOf("/"), "db");
  assert.equal(projectOf("/query-language/records"), "db");
  assert.equal(projectOf("/kv"), "kv");
  assert.equal(projectOf("/kv/getting-started"), "kv");
  assert.equal(projectOf("/s3/buckets"), "s3");
  assert.equal(projectOf("/am"), "am");
  assert.equal(projectOf("/kv/v/0.0.2/getting-started"), "kv");
  assert.equal(projectOf("/kv/v/0.0.2"), "kv");
  assert.equal(projectOf("/v/0.34.0/query-language/records"), "db");
  assert.equal(projectOf("/v/0.34.0"), "db");
  // A section that merely starts with a product's name is the engine's.
  assert.equal(projectOf("/kvstore/x"), "db");
});

test("a product's own address is its index page", () => {
  assert.equal(pageSlug("kv"), "kv/index");
  assert.equal(pageSlug("kv", ["getting-started"]), "kv/getting-started");
  assert.equal(pageSlug("db"), "index");
  assert.equal(
    pageSlug("db", ["query-language", "records"]),
    "query-language/records",
  );
});

test("every project has a home and a latest release", () => {
  assert.deepEqual(
    projects.map((each) => each.id),
    ["db", "s3", "am", "kv"],
  );
  assert.equal(home("db"), "/");
  assert.equal(home("kv"), "/kv");
  for (const each of projects) assert.match(each.latest, /^[0-9]/);
  assert.equal(project("am").name, "TessariDB Agent Memory");
});

test("a product's releases live under its own section", () => {
  assert.equal(startOf("db", null), "");
  assert.equal(startOf("kv", null), "/kv");
  assert.equal(startOf("db", "0.34.0"), "/v/0.34.0");
  assert.equal(startOf("kv", "0.0.1"), "/kv/v/0.0.1");
  assert.equal(releaseOf("/kv/v/0.0.1/writes"), "0.0.1");
  assert.equal(releaseOf("/kv/v/0.0.1"), "0.0.1");
  assert.equal(releaseOf("/v/0.34.0/query-language/records"), "0.34.0");
  assert.equal(releaseOf("/kv/writes"), null);
  assert.equal(releaseOf("/query-language/v/x"), null);
});

test("a page is read at its project's address in the release", () => {
  assert.equal(pagePath("index"), "/");
  assert.equal(pagePath("kv/index"), "/kv");
  assert.equal(pagePath("kv/writes"), "/kv/writes");
  assert.equal(pagePath("reference/index"), "/reference/index");
  assert.equal(pagePath("kv/index", "0.0.1"), "/kv/v/0.0.1");
  assert.equal(pagePath("kv/writes", "0.0.1"), "/kv/v/0.0.1/writes");
  assert.equal(pagePath("index", "0.34.0"), "/v/0.34.0");
  assert.equal(
    pagePath("query-language/records", "0.34.0"),
    "/v/0.34.0/query-language/records",
  );
});

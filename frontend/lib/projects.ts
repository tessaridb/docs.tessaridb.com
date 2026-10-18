/**
 * The products this site documents.
 *
 * The engine's pages were here first and keep the URLs they always had; every
 * other product owns exactly one top-level section named by its id — `/s3`,
 * `/am`, `/kv` — and every page under it is that product's. The API carries the
 * same closed list (`docs-store/src/projects.rs`), so a project named in a
 * request is one of these four or it is refused.
 *
 * Each product keeps its own releases: `latest` is the release its live pages
 * describe, and the archived ones are whatever the store kept for it.
 *
 * No imports, so the node test runner can load this file as it stands.
 */

export type ProjectId = "db" | "s3" | "am" | "kv";

export type Project = {
  id: ProjectId;
  /** The full product name, as a heading says it. */
  name: string;
  /** The name in the header, beside the mark, where room is short. */
  short: string;
  /**
   * The release the live pages describe — the header's picker and the footer
   * both read it here, which is where it is changed when a release ships.
   *
   * It is **not** derived from `DOCS_NAMESPACE`. That value — `v0_0_3_alpha` —
   * looks like a version and is not: it names the store's namespace, so
   * changing it moves the site's content rather than relabelling anything.
   */
  latest: string;
  /** The product site, for the reader who wants the case rather than the manual. */
  site: string;
  /** What it is, in one line — the switcher and `llms.txt` both say it. */
  blurb: string;
  /** The public repository, or `null` while the source is private. */
  source: string | null;
  /** The licence, as the footer states it. */
  licence: string;
};

export const projects: readonly Project[] = [
  {
    id: "db",
    name: "TessariDB",
    short: "TessariDB",
    latest: "0.36.2",
    site: "https://tessaridb.com",
    blurb:
      "The database: eleven engines under one language and one transaction.",
    source: "https://github.com/tessaridb/tessaridb",
    licence:
      "Business Source License 1.1. Free in production, including commercially. The one restriction is offering TessariDB to third parties as a database service, which needs a commercial licence.",
  },
  {
    id: "s3",
    name: "TessariDB S3",
    short: "S3",
    latest: "0.2.1-beta",
    site: "https://s3.tessaridb.com",
    blurb: "S3-compatible object storage, its metadata kept in TessariDB.",
    source: "https://github.com/tessaridb/tessaridb-s3",
    licence:
      "Business Source License 1.1: free in production, commercially too; the one restriction is offering it to third parties as an object storage service. The Rust SDK and CLI are Apache 2.0.",
  },
  {
    id: "am",
    name: "TessariDB Agent Memory",
    short: "Agent Memory",
    latest: "0.4.2-alpha",
    site: "https://am.tessaridb.com",
    blurb:
      "Memory for agents that outlives the context window, shared between them.",
    source: null,
    licence:
      "Business Source License 1.1: free for any use, production and commercial included, except offering it to others as an agent memory service.",
  },
  {
    id: "kv",
    name: "TessariKV",
    short: "TessariKV",
    latest: "0.1.0",
    site: "https://kv.tessaridb.com",
    blurb:
      "The storage engine at the heart of TessariDB: pure Rust, lock-free first.",
    source: "https://github.com/tessaridb/tessarikv",
    licence: "Apache License 2.0.",
  },
];

/** A project by id. The list is closed, so every id has one. */
export function project(id: ProjectId): Project {
  const found = projects.find((each) => each.id === id);
  if (found === undefined) throw new Error(`no project ${id}`);
  return found;
}

/** Whether a string names a project. */
export function isProjectId(named: string): named is ProjectId {
  return projects.some((each) => each.id === named);
}

/** The section a product's pages live under, or `null` for the engine. */
export function root(id: ProjectId): string | null {
  return id === "db" ? null : id;
}

/** Where a project's live pages start: `/` for the engine, `/kv` for a product. */
export function home(id: ProjectId): string {
  const at = root(id);
  return at === null ? "/" : `/${at}`;
}

/**
 * The project a path is in, read by its first step after any `/v/<label>`.
 *
 * Only a whole step counts: `/kvstore` is an engine section that happens to
 * start with a product's name.
 */
export function projectOf(pathname: string): ProjectId {
  const rest = pathname.replace(/^\/v\/[^/]+/, "");
  const first = rest.split("/")[1] ?? "";
  return first !== "db" && isProjectId(first) ? first : "db";
}

/**
 * The page a route's steps name inside a project. A project's own address —
 * `/` for the engine, `/kv` for a product — is its `index` page.
 */
export function pageSlug(id: ProjectId, steps: readonly string[] = []): string {
  const at = root(id);
  const path = steps.length === 0 ? "index" : steps.join("/");
  return at === null ? path : `${at}/${path}`;
}

/**
 * Where a project's pages start in a release: `""` for the live engine,
 * `/kv` for a live product, `/v/0.34.0` for an engine release and
 * `/kv/v/0.0.1` for a product's. A release belongs to one product, so it sits
 * inside that product's section; the engine's keep the `/v/<label>` they
 * always had. The front page is this or `/`; the search page is this plus
 * `/search`.
 */
export function startOf(id: ProjectId, archived: string | null): string {
  const at = root(id);
  const release = archived === null ? "" : `/v/${archived}`;
  return at === null ? release : `/${at}${release}`;
}

/** The archived release a path is in, or `null` on the live site. */
export function releaseOf(pathname: string): string | null {
  const id = projectOf(pathname);
  const at = root(id);
  const shape = at === null ? /^\/v\/([^/]+)/ : new RegExp(`^/${at}/v/([^/]+)`);
  return shape.exec(pathname)?.[1] ?? null;
}

/**
 * Where a page is read, in the live site or in an archived release. An
 * `index` page is its project's front page and is linked as one — `/kv`, not
 * `/kv/index` — so a link, the tree's highlight and the canonical URL all
 * agree on one address.
 */
export function pagePath(slug: string, archived: string | null = null): string {
  const id = projectOf(`/${slug}`);
  const at = root(id);
  const rest = at === null ? slug : slug.slice(at.length + 1);
  const start = startOf(id, archived);
  if (rest === "index" || rest === "") return start || "/";
  return `${start}/${rest}`;
}

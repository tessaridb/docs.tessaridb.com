/**
 * The one place that knows the API exists.
 *
 * Every call here runs on the **server**. The browser never reaches the API
 * directly, which is what lets the deployment keep it on an internal network
 * with only this front end exposed — and it is why the search box goes through
 * a route handler of ours rather than calling the API from the page.
 */

/** Where the API is. A bare origin; the store's own address is not spelled here. */
const API = process.env.DOCS_API ?? "http://127.0.0.1:8080";

/**
 * How long a read may be reused.
 *
 * Not only a load question. Every public read costs the store a sign-in — a
 * connection is a session, and the site opens one per request — so a cache here
 * is also what keeps a burst of readers off the node's password verifier. Thirty
 * seconds is short enough that an edit made through the API shows up while the
 * editor is still looking at it.
 */
const REVALIDATE = 30;

/** A node of the left-hand tree. */
export type TreeNode = {
  slug: string;
  title: string;
  kind: "section" | "page";
  icon: string | null;
  children: TreeNode[];
};

/** An entry in the right-hand outline. */
export type Heading = {
  depth: number;
  text: string;
  anchor: string;
};

/** A page, rendered by the API so its ids match its anchors. */
export type Page = {
  slug: string;
  title: string;
  summary: string | null;
  html: string;
  outline: Heading[];
  unreleased: boolean;
};

/** A span of a hit's `text`, as UTF-8 byte offsets — the store counts bytes. */
export type Window = { start: number; end: number };

/** One search result: a passage, with the page it sits in. */
export type Hit = {
  page: string;
  heading: string;
  anchor: string;
  text: string;
  relevance: number;
  /** The store's window of the passage holding the most query words, if ranked. */
  snippet: Window | null;
};

/** The API answered something other than what was asked for. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    body: string,
  ) {
    super(`${path}: ${status} ${body}`);
    this.name = "ApiError";
  }
}

async function get<T>(path: string, revalidate: number | false): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    next: revalidate === false ? undefined : { revalidate },
    cache: revalidate === false ? "no-store" : undefined,
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new ApiError(
      response.status,
      path,
      (await response.text()).slice(0, 200),
    );
  }
  return (await response.json()) as T;
}

/** An archived release the site can show. */
export type Release = { label: string };

/**
 * Where a release's routes start on the API: the live site's, or an archived
 * release's under `/api/v/<label>`. `archived` is a label already checked by
 * `isLabel`; it is escaped anyway, because this is the line that builds a path.
 */
function from(archived: string | null): string {
  return archived === null ? "/api" : `/api/v/${encodeURIComponent(archived)}`;
}

/** The archived releases, newest first. */
export function releases(): Promise<Release[]> {
  return get<Release[]>("/api/versions", REVALIDATE);
}

/** The whole left-hand tree of the live site, or of an archived release. */
export function nav(archived: string | null = null): Promise<TreeNode[]> {
  return get<TreeNode[]>(`${from(archived)}/nav`, REVALIDATE);
}

/**
 * One page, or `null` when there is none at that path.
 *
 * **400 counts as absent, and not only 404.** The API refuses a slug that could
 * not be a record id — one carrying a dot, a space, a quote — with 400, because
 * from its side such a request is malformed. From here it is a reader following
 * a bad link, or a browser asking for `/favicon.ico` and being caught by the
 * catch-all route. Treating it as an error turns every one of those into a 500
 * page, which is how this was found: the browser's automatic favicon request
 * took the page down in the console.
 */
export async function page(
  slug: string,
  archived: string | null = null,
): Promise<Page | null> {
  try {
    return await get<Page>(`${from(archived)}/page/${encodePath(slug)}`, REVALIDATE);
  } catch (fault) {
    if (
      fault instanceof ApiError &&
      (fault.status === 404 || fault.status === 400)
    ) {
      return null;
    }
    throw fault;
  }
}

/**
 * A ranked search of one release — the live site's index, or an archived
 * release's own. Never cached: the query is the reader's, not the site's.
 */
export function search(
  query: string,
  limit = 20,
  archived: string | null = null,
): Promise<Hit[]> {
  const asked = new URLSearchParams({ q: query, limit: String(limit) });
  return get<Hit[]>(`${from(archived)}/search?${asked}`, false);
}

/** Words one release holds that begin with what is being typed. Never cached. */
export function suggest(typed: string, archived: string | null = null): Promise<string[]> {
  const asked = new URLSearchParams({ p: typed });
  return get<string[]>(`${from(archived)}/suggest?${asked}`, false);
}

/**
 * Escapes a slug for a URL while leaving its separators alone.
 *
 * `encodeURIComponent` would turn `query-language/records` into one segment with
 * an escaped slash, and the API's route matches path segments — so the slashes
 * have to survive and everything between them has to be escaped.
 */
function encodePath(slug: string): string {
  return slug.split("/").map(encodeURIComponent).join("/");
}

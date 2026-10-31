/**
 * Which release of the documentation is being read, and how its URLs are made.
 *
 * The live site is the newest release and keeps the URLs it always had. An
 * archived release is the same site under `/v/<label>/`, read from a namespace
 * of its own — its pages, its tree and its search index.
 */

import {
  type ProjectId,
  projectOf,
  projects,
  releaseOf,
  root,
  startOf,
} from "./projects.ts";

/**
 * Whether a label can name a release: a version string and nothing else.
 *
 * The same rule the API applies, checked here too so that a label taken from a
 * URL never reaches a fetch path it could escape from.
 */
export function isLabel(label: string): boolean {
  return /^[0-9][0-9A-Za-z.-]{0,39}$/.test(label);
}

/**
 * The page's HTML with its own project's site-internal links pointed into the
 * release.
 *
 * A page links to `/query-language/records`; read in an archived release, that
 * link must stay in the release rather than jump to the live site. Only an
 * `href` that starts with one `/` is rewritten — a protocol-relative `//host`
 * and every absolute URL are left alone, and so are in-page `#anchors`.
 *
 * A release belongs to one project, so only that project's links move: an
 * archived TessariKV page linking to the engine's `/query-language/records`
 * keeps the live link, because the engine never had a release called `0.0.1`.
 */
export function withinRelease(
  html: string,
  id: ProjectId,
  archived: string | null,
): string {
  if (archived === null) return html;
  const at = root(id);
  const products = projects.flatMap((each) => root(each.id) ?? []).join("|");
  const ours =
    at === null
      ? new RegExp(`href="(?=/(?!/)(?!(?:${products})(?:[/"#?])))`, "g")
      : new RegExp(`href="/${at}(?=[/"#?])`, "g");
  return html.replace(ours, `href="${startOf(id, archived)}`);
}

/**
 * The same page in another release of its product: `/kv/v/0.0.1/x` → `/kv/x`
 * for the live site, or `/x` → `/v/0.31.0-beta/x`. A page that does not exist
 * there answers 404 in that release, which says exactly that.
 */
export function inRelease(pathname: string, target: string | null): string {
  const id = projectOf(pathname);
  const rest = pathname.slice(startOf(id, releaseOf(pathname)).length);
  return `${startOf(id, target)}${rest === "/" ? "" : rest}` || "/";
}

/**
 * The release a `?v=` parameter names: `null` for none (the live site), the
 * label when it could be one, and `undefined` when it could not — which a
 * caller answers with nothing rather than with the live site's results.
 */
export function release(asked: string | null): string | null | undefined {
  if (asked === null || asked === "") return null;
  return isLabel(asked) ? asked : undefined;
}

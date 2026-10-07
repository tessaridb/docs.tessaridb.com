/**
 * Which release of the documentation is being read, and how its URLs are made.
 *
 * The live site is the newest release and keeps the URLs it always had. An
 * archived release is the same site under `/v/<label>/`, read from a namespace
 * of its own — its pages, its tree and its search index.
 */

/**
 * Whether a label can name a release: a version string and nothing else.
 *
 * The same rule the API applies, checked here too so that a label taken from a
 * URL never reaches a fetch path it could escape from.
 */
export function isLabel(label: string): boolean {
  return /^[0-9][0-9A-Za-z.-]{0,39}$/.test(label);
}

/** Where a release's pages start: `""` for the live site, `/v/<label>` otherwise. */
export function basePath(archived: string | null): string {
  return archived === null ? "" : `/v/${archived}`;
}

/**
 * The page's HTML with its site-internal links pointed into the release.
 *
 * A page links to `/query-language/records`; read in an archived release, that
 * link must stay in the release rather than jump to the live site. Only an
 * `href` that starts with one `/` is rewritten — a protocol-relative `//host`
 * and every absolute URL are left alone, and so are in-page `#anchors`.
 */
export function withinRelease(html: string, base: string): string {
  if (base === "") return html;
  return html.replace(/href="\/(?!\/)/g, `href="${base}/`);
}

/**
 * The same page in another release: `/v/0.31.0-beta/x` → `/x` for the live
 * site, or `/x` → `/v/0.31.0-beta/x`. A page that does not exist there answers
 * 404 in that release, which says exactly that.
 */
export function inRelease(pathname: string, target: string | null): string {
  const rest = pathname.replace(/^\/v\/[^/]+/, "") || "/";
  if (target === null) return rest;
  return rest === "/" ? `/v/${target}` : `/v/${target}${rest}`;
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

/**
 * Where this site is, from the site's own point of view.
 *
 * A canonical URL, a sitemap entry and an Open Graph card all have to be
 * absolute, and none of them can be derived from the request: the front end sits
 * behind a TLS terminator, so the `Host` it sees is a loopback address and the
 * scheme it sees is `http`. Anything built from the incoming request would emit
 * `http://127.0.0.1:3000/...` as this page's canonical URL — which is not
 * wrong-looking enough to notice and is wrong everywhere it matters.
 *
 * Overridable by environment for a staging host, defaulting to production
 * because that is where it runs.
 */
export const origin = (process.env.DOCS_ORIGIN ?? "https://docs.tessaridb.com").replace(
  /\/$/,
  "",
);

/** What this site is, in one sentence, wherever one is needed. */
export const tagline =
  "The documentation for TessariDB — the stack around the model, in one store: eleven engines under one language and one transaction.";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Article } from "@/components/Article";
import { PageData } from "@/components/PageData";
import { nav, page as read } from "@/lib/api";
import { type ProjectId, pagePath, pageSlug, project } from "@/lib/projects";
import { origin, tagline } from "@/lib/site";
import { leaves } from "@/lib/tree";

import { archivedRelease } from "./release";

/**
 * The documentation pages of every product, live and archived.
 *
 * One implementation, bound by each product's route files to its own id. The
 * route files exist per product because a layout does not re-render on
 * navigation — see `Shell` — and they are a line each so that the four
 * products cannot drift into four different sites.
 *
 * Every route is per request: the content is the store's and is edited through
 * the API, so nothing here is prerendered — see the root layout.
 */

export type Live = { params: Promise<{ slug?: string[] }> };
export type Archived = {
  params: Promise<{ version: string; slug?: string[] }>;
};

/**
 * A page title. The engine's go through the root layout's template, which
 * appends "TessariDB"; a product's name its product instead, because
 * "Writes — TessariDB" on a TessariKV page names the wrong thing.
 */
function titled(id: ProjectId, text: string): Metadata["title"] {
  return id === "db" ? text : { absolute: `${text} — ${project(id).name}` };
}

/** What a front page says about itself when its `index` page has no summary. */
function fallback(id: ProjectId): string {
  return id === "db" ? tagline : project(id).blurb;
}

export async function liveMetadata(
  id: ProjectId,
  { params }: Live,
): Promise<Metadata> {
  const { slug: steps = [] } = await params;
  const slug = pageSlug(id, steps);
  const found = await read(slug);
  /*
   * `noindex` on the miss. Without it the 404 this route renders is, as far as
   * metadata is concerned, an ordinary page — and a crawler following a stale
   * link indexes "Not found" under the old URL.
   */
  if (!found)
    return { title: "Not found", robots: { index: false, follow: true } };

  const shown = project(id);
  const description = found.summary ?? fallback(id);
  // Stated because a front page is reachable both as `/kv` and, being a record
  // like any other, as `/kv/index`: two URLs competing for the same words.
  const canonical = pagePath(slug);

  if (steps.length === 0) {
    const name = `${shown.name} documentation`;
    return {
      ...(id === "db" ? {} : { title: { absolute: name } }),
      description,
      alternates: { canonical },
      openGraph: {
        type: "website",
        siteName: "TessariDB documentation",
        title: name,
        description,
        url: `${origin}${canonical === "/" ? "" : canonical}`,
      },
    };
  }

  return {
    title: titled(id, found.title),
    description,
    alternates: { canonical },
    openGraph: {
      /*
       * `article`, not `website` — and declared per page rather than inherited.
       * Next MERGES metadata rather than deriving it, so a page that sets only
       * a title keeps the layout's `og:title` and `og:url`: the product site
       * next door had exactly that, and every deep link unfurled as its home
       * page.
       */
      type: "article",
      siteName: "TessariDB documentation",
      title: found.title,
      description,
      url: `${origin}${canonical}`,
    },
    twitter: { card: "summary", title: found.title, description },
  };
}

/** A live page: a product's front page when there are no steps, else the page they name. */
export async function LivePage({ id, asked }: { id: ProjectId; asked: Live }) {
  await connection();
  const { slug: steps = [] } = await asked.params;
  const slug = pageSlug(id, steps);
  const found = await read(slug);
  if (!found) notFound();
  if (steps.length === 0) return <Article page={found} />;
  return (
    <>
      <PageData page={found} trail={await trail(id, slug)} />
      <Article page={found} />
    </>
  );
}

/**
 * The sections above a page, for the breadcrumb.
 *
 * Read from the same tree the sidebar is built from, so the crumb a search
 * result shows and the crumb the sidebar draws cannot disagree. A tree that
 * cannot be read gives a two-step breadcrumb rather than a failed page: a
 * poorer result snippet is not worth trading a working page for.
 */
async function trail(
  id: ProjectId,
  slug: string,
): Promise<{ title: string }[]> {
  try {
    return (
      leaves(await nav(id)).find((leaf) => leaf.slug === slug)?.trail ?? []
    );
  } catch (fault) {
    console.error("the tree could not be read for a breadcrumb", fault);
    return [];
  }
}

/**
 * An archived release is not indexed: its pages repeat the live site's words,
 * and a search engine should send readers to the release they will run.
 */
export async function archivedMetadata(
  id: ProjectId,
  { params }: Archived,
): Promise<Metadata> {
  const label = await archivedRelease(params, id);
  const { slug: steps = [] } = await params;
  const robots = { index: false, follow: true };
  if (steps.length === 0)
    return { title: { absolute: `${project(id).name} ${label}` }, robots };
  const found = await read(pageSlug(id, steps), label);
  return {
    title: found ? titled(id, `${found.title} (${label})`) : "Not found",
    robots,
  };
}

/** A page of an archived release, from that release's own namespace. */
export async function ArchivedPage({
  id,
  asked,
}: {
  id: ProjectId;
  asked: Archived;
}) {
  await connection();
  const label = await archivedRelease(asked.params, id);
  const { slug: steps = [] } = await asked.params;
  const found = await read(pageSlug(id, steps), label);
  if (!found) notFound();
  return <Article page={found} archived={label} />;
}

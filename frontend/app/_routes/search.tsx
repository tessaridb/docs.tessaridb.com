import type { Metadata } from "next";
import { connection } from "next/server";

import { SearchResults } from "@/components/SearchResults";
import type { ProjectId } from "@/lib/projects";

import { archivedRelease } from "./release";

/**
 * Each product's search page, live and archived — the release's own index,
 * narrowed to the product being read.
 */

type Query = { searchParams: Promise<{ q?: string }> };
export type LiveSearch = Query;
export type ArchivedSearch = Query & { params: Promise<{ version: string }> };

/*
 * `noindex, follow`. robots.txt already disallows the path, but the two rules
 * do different jobs: robots.txt stops the crawl, and a URL that is merely
 * uncrawled can still be indexed from an inbound link — as a bare title.
 * `noindex` is what keeps it out; `follow` means a shared result page still
 * passes the reader through to the real page.
 */
export async function searchMetadata({
  searchParams,
}: Query): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q}` : "Search",
    robots: { index: false, follow: true },
  };
}

/** A product's live search page. */
export async function LiveSearchPage({ id, asked }: { id: ProjectId; asked: LiveSearch }) {
  await connection();
  const { q } = await asked.searchParams;
  return <SearchResults asked={(q ?? "").trim()} archived={null} project={id} />;
}

/** The search page of one of a product's archived releases. */
export async function ArchivedSearchPage({ id, asked }: { id: ProjectId; asked: ArchivedSearch }) {
  await connection();
  const label = await archivedRelease(asked.params, id);
  const { q } = await asked.searchParams;
  return <SearchResults asked={(q ?? "").trim()} archived={label} project={id} />;
}

import type { Metadata } from "next";
import { connection } from "next/server";

import { SearchResults } from "@/components/SearchResults";

type Asked = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({
  searchParams,
}: Asked): Promise<Metadata> {
  const { q } = await searchParams;
  /*
   * `noindex, follow`. robots.txt already disallows this path, but the two rules
   * do different jobs: robots.txt stops the crawl, and a URL that is merely
   * uncrawled can still be indexed from an inbound link — as a bare title.
   * `noindex` is what keeps it out; `follow` means a shared result page still
   * passes the reader through to the real page.
   *
   * Without both, every distinct `?q=` is a URL carrying the same words as the
   * pages it is searching, competing with them.
   */
  return {
    title: q ? `Search: ${q}` : "Search",
    robots: { index: false, follow: true },
  };
}

/** The live site's results page — see `SearchResults`. */
export default async function SearchPage({ searchParams }: Asked) {
  await connection();
  const { q } = await searchParams;
  return <SearchResults asked={(q ?? "").trim()} archived={null} base="" />;
}

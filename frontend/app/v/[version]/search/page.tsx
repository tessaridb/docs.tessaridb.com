import type { Metadata } from "next";
import { connection } from "next/server";

import { SearchResults } from "@/components/SearchResults";
import { basePath } from "@/lib/version";

import { archivedRelease } from "../release";

type Asked = {
  params: Promise<{ version: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ searchParams }: Asked): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q}` : "Search",
    robots: { index: false, follow: true },
  };
}

/** A results page over one archived release's own index. */
export default async function ArchivedSearch({ params, searchParams }: Asked) {
  await connection();
  const label = await archivedRelease(params);
  const { q } = await searchParams;
  return <SearchResults asked={(q ?? "").trim()} archived={label} base={basePath(label)} />;
}

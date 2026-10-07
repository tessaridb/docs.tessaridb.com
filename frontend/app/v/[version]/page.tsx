import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Article } from "@/components/Article";
import { page as read } from "@/lib/api";
import { basePath } from "@/lib/version";

import { archivedRelease } from "./release";

type Asked = { params: Promise<{ version: string }> };

/**
 * An archived release is not indexed: its pages repeat the live site's words,
 * and a search engine should send readers to the release they will run.
 */
export async function generateMetadata({ params }: Asked): Promise<Metadata> {
  const label = await archivedRelease(params);
  return {
    title: `TessariDB ${label}`,
    robots: { index: false, follow: true },
  };
}

/** An archived release's front door — its own `index` page. */
export default async function ArchivedHome({ params }: Asked) {
  await connection();
  const label = await archivedRelease(params);
  const found = await read("index", label);
  if (!found) notFound();
  return <Article page={found} base={basePath(label)} />;
}

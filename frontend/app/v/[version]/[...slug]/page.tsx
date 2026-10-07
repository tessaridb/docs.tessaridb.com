import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Article } from "@/components/Article";
import { page as read } from "@/lib/api";
import { basePath } from "@/lib/version";

import { archivedRelease } from "../release";

type Asked = { params: Promise<{ version: string; slug: string[] }> };

/** `noindex`, as on the release's front door, and the release in the title. */
export async function generateMetadata({ params }: Asked): Promise<Metadata> {
  const label = await archivedRelease(params);
  const { slug } = await params;
  const found = await read(slug.join("/"), label);
  return {
    title: found ? `${found.title} (${label})` : "Not found",
    robots: { index: false, follow: true },
  };
}

/** A page of an archived release, from that release's namespace. */
export default async function ArchivedPage({ params }: Asked) {
  await connection();
  const label = await archivedRelease(params);
  const { slug } = await params;
  const found = await read(slug.join("/"), label);
  if (!found) notFound();
  return <Article page={found} base={basePath(label)} />;
}

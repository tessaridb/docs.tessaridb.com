import { notFound } from "next/navigation";

import { releases } from "@/lib/api";
import { isLabel } from "@/lib/version";

/**
 * The release a `/v/<label>` path names, or a 404 when no archived release
 * carries that label. Asked of the API's own list, so a release exists here
 * exactly when the store kept one.
 */
export async function archivedRelease(params: Promise<{ version: string }>): Promise<string> {
  const { version } = await params;
  const label = decodeURIComponent(version);
  if (!isLabel(label)) notFound();
  const kept = await releases();
  if (!kept.some((release) => release.label === label)) notFound();
  return label;
}

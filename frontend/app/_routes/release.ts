import { notFound } from "next/navigation";

import { releases } from "@/lib/api";
import type { ProjectId } from "@/lib/projects";
import { isLabel } from "@/lib/version";

/**
 * The release a `/v/<label>` path names, or a 404 when the product has no
 * archived release by that label. Asked of the API's own list for that
 * product, so a release exists here exactly when the store kept one — and
 * TessariKV's `0.0.1` is not found under the engine, which never had one.
 */
export async function archivedRelease(
  params: Promise<{ version: string }>,
  id: ProjectId,
): Promise<string> {
  const { version } = await params;
  const label = decodeURIComponent(version);
  if (!isLabel(label)) notFound();
  const kept = await releases(id);
  if (!kept.some((release) => release.label === label)) notFound();
  return label;
}

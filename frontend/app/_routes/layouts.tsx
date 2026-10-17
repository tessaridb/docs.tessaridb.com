import { Shell } from "@/components/Shell";
import type { ProjectId } from "@/lib/projects";

import { archivedRelease } from "./release";

/** A product's live pages, at the URLs they always have. */
export function LiveLayout({
  id,
  children,
}: {
  id: ProjectId;
  children: React.ReactNode;
}) {
  return (
    <Shell project={id} archived={null}>
      {children}
    </Shell>
  );
}

/** One of a product's archived releases: the same site, read from that release's namespace. */
export async function ArchivedLayout({
  id,
  params,
  children,
}: {
  id: ProjectId;
  params: Promise<{ version: string }>;
  children: React.ReactNode;
}) {
  const label = await archivedRelease(params, id);
  return (
    <Shell project={id} archived={label}>
      {children}
    </Shell>
  );
}

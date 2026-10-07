import { Shell } from "@/components/Shell";

import { archivedRelease } from "./release";

/** An archived release: the same site, read from the release's own namespace. */
export default async function Archived({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ version: string }>;
}) {
  const label = await archivedRelease(params);
  return <Shell archived={label}>{children}</Shell>;
}

"use client";

import { usePathname } from "next/navigation";

import { Missing } from "@/components/Missing";

/**
 * A path an archived release holds nothing at, drawn inside that release's
 * shell. Its way back is the release's own front door.
 */
export default function NotFound() {
  const here = usePathname();
  const release = /^\/v\/[^/]+/.exec(here)?.[0] ?? "/";
  return <Missing home={release} />;
}

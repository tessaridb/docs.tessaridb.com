"use client";

import { usePathname } from "next/navigation";

import { projectOf, releaseOf, startOf } from "@/lib/projects";
import { Missing } from "./Missing";

/**
 * A miss inside an archived release: "start from the beginning" goes to the
 * front page of the product and release being read, which only the path says.
 */
export function ReleaseMissing() {
  const here = usePathname();
  return <Missing home={startOf(projectOf(here), releaseOf(here)) || "/"} />;
}

"use client";

import { usePathname, useRouter } from "next/navigation";

import { inRelease } from "@/lib/version";

/**
 * Which release of the documentation is on screen, and the way to another.
 *
 * A native `<select>`: it is keyboard- and screen-reader-complete as it stands,
 * and on a phone it opens the platform's own picker rather than a dropdown that
 * has to fit a crowded header. Choosing a release keeps the page — the same
 * path in that release — so a reader comparing two releases does not have to
 * find their place again.
 *
 * `latest` is the live site's release; it is listed once even when an archive
 * of it exists, and choosing it goes to the live URLs.
 */
export function Releases({
  latest,
  archived,
  shown,
}: {
  latest: string;
  archived: string[];
  shown: string | null;
}) {
  const router = useRouter();
  const here = usePathname();
  const older = archived.filter((label) => label !== latest);

  return (
    <select
      className="releases"
      aria-label="Documentation version"
      value={shown ?? latest}
      onChange={(event) => {
        const chosen = event.target.value;
        router.push(inRelease(here, chosen === latest ? null : chosen));
      }}
    >
      <option value={latest}>{latest} (latest)</option>
      {older.map((label) => (
        <option key={label} value={label}>
          {label}
        </option>
      ))}
    </select>
  );
}

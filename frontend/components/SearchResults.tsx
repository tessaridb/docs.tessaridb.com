import Link from "next/link";

import { SearchAgain } from "@/components/SearchAgain";
import { type Hit, search } from "@/lib/api";
import { excerpt } from "@/lib/excerpt";
import { type ProjectId, pagePath, startOf } from "@/lib/projects";

/**
 * A whole page of results, for the live site or for one archived release.
 *
 * The header box answers a question you already know how to ask — you type a
 * word, you recognise the page, you go. This is for the other case: not knowing
 * which page holds a thing, and needing to read the passages to tell. A
 * dropdown is the wrong shape for that. It holds a handful of hits, it covers
 * the page it is searching, and on a phone it covers all of it.
 *
 * Being a page rather than a bigger dropdown buys three things a dropdown
 * cannot have: the query is in the URL, so a search can be linked, shared and
 * gone back to; the back button returns to the results instead of to an empty
 * box; and the results have room to show enough of each passage to be judged.
 *
 * Rendered on the server. The ranking is the store's own index for the release
 * being read — the same index, over the same fragments, that the header box
 * reads.
 */
export async function SearchResults({
  asked,
  archived,
  project,
}: {
  asked: string;
  archived: string | null;
  project: ProjectId;
}) {
  const start = startOf(project, archived);
  let hits: Hit[] = [];
  let broke = false;
  if (asked.length >= 2) {
    try {
      hits = await search(asked, 60, archived, project);
    } catch {
      broke = true;
    }
  }

  return (
    <div className="searchpage">
      <h1>Search</h1>
      <SearchAgain initial={asked} searchAt={`${start}/search`} />

      {asked.length < 2 ? (
        <p className="searchpage-note">
          Two letters or more. Terms are whole words here — the index holds the
          words a page contains, not fragments of them, so <code>analyz</code>{" "}
          finds nothing and <code>analyzer</code> finds the pages about one.
        </p>
      ) : broke ? (
        <p className="searchpage-note">
          The index could not be reached. The pages are still where they were —{" "}
          {project === "db" ? (
            <>
              the <Link href={`${start}/reference/statements`}>reference</Link>{" "}
              lists the language in full.
            </>
          ) : (
            <>
              start from <Link href={start}>the front page</Link>.
            </>
          )}
        </p>
      ) : hits.length === 0 ? (
        <p className="searchpage-note">
          Nothing matches <strong>{asked}</strong>.
        </p>
      ) : (
        <>
          <p className="searchpage-count">
            {hits.length === 60
              ? "The first 60 passages"
              : `${hits.length} passages`}{" "}
            for <strong>{asked}</strong>
          </p>
          <ol className="searchpage-hits">
            {hits.map((hit) => (
              <li key={`${hit.page}#${hit.anchor}`}>
                <Link
                  href={
                    hit.anchor
                      ? `${pagePath(hit.page, archived)}#${hit.anchor}`
                      : pagePath(hit.page, archived)
                  }
                >
                  <span className="searchpage-where">{hit.page}</span>
                  <span className="searchpage-heading">{hit.heading}</span>
                  <span className="searchpage-text">{excerpt(hit)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

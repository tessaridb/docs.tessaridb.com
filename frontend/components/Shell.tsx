import Link from "next/link";
import { connection } from "next/server";

import { Footer } from "@/components/Footer";
import { NavBackdrop, NavButton, NavProvider } from "@/components/Nav";
import { Releases } from "@/components/Releases";
import { ScrollReset } from "@/components/ScrollReset";
import { Search } from "@/components/Search";
import { ThemeToggle } from "@/components/Theme";
import { Tree } from "@/components/Tree";
import { Mark, Search as SearchIcon } from "@/components/icons";
import { type Release, type TreeNode, nav, releases } from "@/lib/api";
import { version } from "@/lib/site";
import { basePath } from "@/lib/version";

/**
 * Everything around a page: the header, the tree, the footer — for the live
 * site (`archived` is `null`) or for one archived release.
 *
 * The tree, the search box and every link here belong to the release being
 * read, so a reader inside an archived release stays inside it until they
 * choose another one.
 */
export async function Shell({
  archived,
  children,
}: {
  archived: string | null;
  children: React.ReactNode;
}) {
  // Per request, like every page: the tree and the releases are the store's,
  // and a shell rendered at build time would freeze them — the not-found page
  // included, which renders this shell too.
  await connection();
  const base = basePath(archived);

  // The tree comes from the store on every render of the shell. If that read
  // fails the site still serves the page — a reader who followed a link should
  // get what they came for even when the navigation cannot be built.
  let tree: TreeNode[];
  try {
    tree = await nav(archived);
  } catch (fault) {
    console.error("the tree could not be read", fault);
    tree = [];
  }

  // The picker without the archived releases is still a correct picker: it
  // shows the release being read and nothing else.
  let listed: Release[];
  try {
    listed = await releases();
  } catch (fault) {
    console.error("the releases could not be listed", fault);
    listed = [];
  }

  const picker = (
    <Releases
      latest={version}
      archived={listed.map((release) => release.label)}
      shown={archived}
    />
  );

  return (
    <NavProvider>
      <ScrollReset />
      <header className="header">
        <Link href={base === "" ? "/" : base} className="brand">
          <Mark />
          TessariDB
        </Link>
        {/* Named, because a reader arriving on a deep link from a search
            engine sees a page about a database and no indication that the
            rest of the site is its documentation rather than its marketing.
            The release sits with it: both answer "what am I reading". */}
        <span className="header-what">
          Docs
          {picker}
        </span>
        <div className="header-spacer" />
        <Search base={base} archived={archived} />
        {/* On a phone the live dropdown is the wrong shape — it covers the
            page it is searching, and the header has no room for a field
            worth typing into once the mark, "Docs" and two controls have
            had theirs. So the box gives way to this, and the results get a
            page of their own instead of a panel over the article. */}
        <Link href={`${base}/search`} className="search-link" aria-label="Search the documentation">
          <SearchIcon size={18} />
        </Link>
        <ThemeToggle />
        <NavButton />
      </header>

      <NavBackdrop />

      <div className="layout">
        <Tree nodes={tree} base={base} picker={picker} />
        <main className="main">
          {archived === null || archived === version ? null : (
            <p className="release-note" role="note">
              This is the documentation for TessariDB <strong>{archived}</strong>. The
              latest is <Link href="/">{version}</Link>.
            </p>
          )}
          {children}
        </main>
      </div>

      <Footer shown={archived ?? version} base={base} />
    </NavProvider>
  );
}

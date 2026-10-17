import Link from "next/link";
import { connection } from "next/server";

import { Footer } from "@/components/Footer";
import { NavBackdrop, NavButton, NavProvider } from "@/components/Nav";
import { Releases } from "@/components/Releases";
import { ScrollReset } from "@/components/ScrollReset";
import { Search } from "@/components/Search";
import { ThemeToggle } from "@/components/Theme";
import { Tree } from "@/components/Tree";
import { Projects } from "@/components/Projects";
import { Search as SearchIcon } from "@/components/icons";
import { type Release, type TreeNode, nav, releases } from "@/lib/api";
import { type ProjectId, home, project, startOf } from "@/lib/projects";

/**
 * Everything around a page: the header, the tree, the footer — for one
 * product, on the live site (`archived` is `null`) or in one archived release.
 *
 * The tree, the search box and every link here belong to the product and the
 * release being read, so a reader inside an archived release of TessariKV stays
 * inside it until they choose another release or another product.
 *
 * Rendered by each product's layout rather than worked out from the path: a
 * layout does not re-render on navigation, so a shell that read the path would
 * keep showing the engine's tree after a link into `/kv`. Each product being
 * its own route segment is what makes that navigation render this afresh.
 */
export async function Shell({
  project: id,
  archived,
  children,
}: {
  project: ProjectId;
  archived: string | null;
  children: React.ReactNode;
}) {
  // Per request, like every page: the tree and the releases are the store's,
  // and a shell rendered at build time would freeze them — the not-found page
  // included, which renders this shell too.
  await connection();
  const shown = project(id);
  const start = startOf(id, archived);
  const front = start || "/";
  const searchAt = `${start}/search`;

  // The tree comes from the store on every render of the shell. If that read
  // fails the site still serves the page — a reader who followed a link should
  // get what they came for even when the navigation cannot be built.
  let tree: TreeNode[];
  try {
    tree = await nav(id, archived);
  } catch (fault) {
    console.error("the tree could not be read", fault);
    tree = [];
  }

  // The picker without the archived releases is still a correct picker: it
  // shows the release being read and nothing else.
  let listed: Release[];
  try {
    listed = await releases(id);
  } catch (fault) {
    console.error("the releases could not be listed", fault);
    listed = [];
  }

  const picker = (
    <Releases
      latest={shown.latest}
      archived={listed.map((release) => release.label)}
      shown={archived}
    />
  );

  return (
    <NavProvider>
      <ScrollReset />
      <header className="header">
        <Projects shown={id} />
        {/* Named, because a reader arriving on a deep link from a search
            engine sees a page about a database and no indication that the
            rest of the site is its documentation rather than its marketing.
            The release sits with it: both answer "what am I reading". */}
        <span className="header-what">
          Docs
          {picker}
        </span>
        <div className="header-spacer" />
        <Search archived={archived} project={id} searchAt={searchAt} />
        {/* On a phone the live dropdown is the wrong shape — it covers the
            page it is searching, and the header has no room for a field
            worth typing into once the mark, "Docs" and two controls have
            had theirs. So the box gives way to this, and the results get a
            page of their own instead of a panel over the article. */}
        <Link href={searchAt} className="search-link" aria-label={`Search the ${shown.name} documentation`}>
          <SearchIcon size={18} />
        </Link>
        <ThemeToggle />
        <NavButton />
      </header>

      <NavBackdrop />

      <div className="layout">
        <Tree nodes={tree} archived={archived} picker={picker} />
        <main className="main">
          {archived === null || archived === shown.latest ? null : (
            <p className="release-note" role="note">
              This is the documentation for {shown.name}{" "}
              <strong>{archived}</strong>. The latest is{" "}
              <Link href={home(id)}>{shown.latest}</Link>.
            </p>
          )}
          {children}
        </main>
      </div>

      <Footer project={id} shown={archived ?? shown.latest} front={front} />
    </NavProvider>
  );
}

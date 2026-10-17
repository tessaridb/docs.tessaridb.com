import Link from "next/link";

import { ProjectMark } from "@/components/ProjectMark";
import { GitHub } from "@/components/icons";
import { type ProjectId, home, project, projects } from "@/lib/projects";

/**
 * The bottom of every page.
 *
 * Four things belong here and nothing else does: what this site is, the other
 * products it documents, where the public repositories are, and the licence —
 * each for the product being read. The licence in particular is not
 * decoration on a database — somebody evaluating one needs to know before they
 * build on it whether their use is free, and burying that costs them a
 * conversation later that neither side wanted.
 *
 * The engine's own repository is deliberately not linked. It is private, and a
 * link that answers `404` reads as a broken site rather than as a closed
 * source; the address to write to is in the licence line instead.
 */
export function Footer({
  project: id,
  shown,
  front,
}: {
  project: ProjectId;
  shown: string;
  /** This product's front page in the release being read. */
  front: string;
}) {
  const here = project(id);
  // The engine's own links point into its release; a product's live elsewhere.
  const base = id === "db" ? front.replace(/\/$/, "") : "";
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-about">
          <Link href={front} className="footer-brand">
            <ProjectMark id={id} size={20} />
            {here.name}
          </Link>
          <p>
            {id === "db"
              ? "The stack around the model, in one store: eleven engines under one language and one transaction."
              : here.blurb}
          </p>
          <p className="footer-note">
            This site is served out of TessariDB, and the search box is the
            engine&rsquo;s own index.
          </p>
        </div>

        <nav className="footer-links" aria-label="Products">
          <h2>Products</h2>
          <ul>
            {projects.map((each) => (
              <li key={each.id}>
                <Link href={home(each.id)}>{each.name}</Link>
              </li>
            ))}
          </ul>
        </nav>

        {id === "db" ? (
          <EngineLinks base={base} />
        ) : (
          <nav className="footer-links" aria-label={here.name}>
            <h2>{here.short}</h2>
            <ul>
              <li>
                <a href={here.site}>{here.site.replace("https://", "")}</a>
              </li>
              {here.source === null ? null : (
                <li>
                  <a className="footer-source" href={here.source}>
                    <GitHub size={14} />
                    Source on GitHub
                  </a>
                </li>
              )}
              <li>
                <Link href="/">TessariDB documentation</Link>
              </li>
            </ul>
          </nav>
        )}

        <nav className="footer-links" aria-label="Contact">
          <h2>Contact</h2>
          <ul>
            <li>
              <a href="mailto:hello@tessaridb.com">hello@tessaridb.com</a>
            </li>
            <li>
              <a href="mailto:licensing@tessaridb.com">
                licensing@tessaridb.com
              </a>
            </li>
            <li>
              <a href="mailto:security@tessaridb.com">security@tessaridb.com</a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="footer-legal">
        <p>
          <strong>
            {here.name} {shown}
          </strong>{" "}
          &middot; &copy; 2026 boogvar
        </p>
        <p>
          {here.licence} Licensing:{" "}
          <a href="mailto:licensing@tessaridb.com">licensing@tessaridb.com</a>.
        </p>
      </div>
    </footer>
  );
}

/** The engine's own columns: where to start, and the public parts of the project. */
function EngineLinks({ base }: { base: string }) {
  return (
    <>
      <nav className="footer-links" aria-label="Documentation">
        <h2>Documentation</h2>
        <ul>
          <li>
            <Link href={`${base}/start/install`}>Getting started</Link>
          </li>
          <li>
            <Link href={`${base}/query-language/records`}>TessariQL</Link>
          </li>
          <li>
            <Link href={`${base}/overview/engines`}>The engines</Link>
          </li>
          <li>
            <Link href={`${base}/reference/statements`}>Reference</Link>
          </li>
        </ul>
      </nav>

      <nav className="footer-links" aria-label="Project">
        <h2>Project</h2>
        <ul>
          <li>
            {/*
                  The engine itself, not the organisation. This pointed at the
                  organisation while the engine was private, because a link to a
                  private repository is a 404 for everybody who follows it. The
                  engine is public as of 0.2.2-beta, so the link now goes to the
                  thing a reader came for.
                */}
            <a
              className="footer-source"
              href="https://github.com/tessaridb/tessaridb"
            >
              <GitHub size={14} />
              Source on GitHub
            </a>
          </li>
          <li>
            <a href="https://github.com/tessaridb/tessaridb-protocol">
              Protocol specification
            </a>
          </li>
          <li>
            <a href="https://github.com/tessaridb/tessaridb-sdk-rust">
              Rust client
            </a>
          </li>
          <li>
            <Link href={`${base}/clients/protocol`}>Writing a client</Link>
          </li>
          <li>
            <Link href={`${base}/operations/serving`}>Running a node</Link>
          </li>
        </ul>
      </nav>
    </>
  );
}

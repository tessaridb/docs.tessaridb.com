import Link from "next/link";

/** What a path that holds nothing says, in whichever release it was asked of. */
export function Missing({ home }: { home: string }) {
  return (
    <article className="article">
      <h1>No such page</h1>
      <p className="summary">
        Nothing is stored at that path. It may have been renamed, or the link may
        predate this version of the documentation.
      </p>
      <p>
        Try the search box — it looks inside pages rather than at their titles,
        so a phrase you remember from the text will usually find it. Or start
        from <Link href={home}>the beginning</Link>.
      </p>
    </article>
  );
}

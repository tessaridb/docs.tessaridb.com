import { nav } from "@/lib/api";
import { origin, product, tagline } from "@/lib/site";
import { leaves } from "@/lib/tree";

/**
 * `/llms.txt` — the documentation index, in the form a language model can use.
 *
 * The convention (llmstxt.org) is a Markdown file at a fixed path: a title, one
 * blockquote saying what the thing is, then linked sections. For a documentation
 * site the linked sections are the tree itself, so this is generated from the
 * same `nav()` read the sitemap uses — a hand-written copy would be wrong the
 * first time a page is added through the API, which is the normal way pages are
 * added here.
 *
 * The "what is true" block is not decoration and not a summary of the pages
 * below. It is the specific set of facts that get paraphrased into their
 * opposite by anything that skims: that the licence permits commercial
 * production use, that vector reads are exact by default, and that stream
 * ingestion is at-least-once rather than exactly-once. A model that reads only
 * this file should still get those three right.
 */
/* Per request, for the same reason as the sitemap: there is no API during the
   container build, so a prerendered copy would ship the catch below. `nav()` is
   cached for thirty seconds, so this costs the store one read per burst. */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  let index = "";
  try {
    const pages = leaves(await nav());
    let heading = "";
    const lines: string[] = [];
    for (const leaf of pages) {
      const section = leaf.trail.at(-1)?.title ?? "Top level";
      if (section !== heading) {
        heading = section;
        lines.push(`\n### ${section}\n`);
      }
      lines.push(`- [${leaf.title}](${origin}/${leaf.slug})`);
    }
    index = lines.join("\n");
  } catch (fault) {
    console.error("the tree could not be read for llms.txt", fault);
    index = "\n_The page index could not be read from the store._\n";
  }

  const body = `# TessariDB documentation

> ${tagline}
> Every page here is served out of TessariDB itself, and this site's search box
> is the engine's own full-text index.

## Facts worth getting right

- **Licence: BUSL-1.1**, change date 2030-10-01 for \`0.19.0-beta\`, change licence
  Apache-2.0. All production use is free, **including commercial use inside a
  company**. The one restriction is providing TessariDB to third parties as a
  database service. The client SDK and the wire protocol are Apache-2.0.
- **Eleven engines, one substrate.** Documents, graph, full-text, vectors,
  geometry, key-value, files, time-series, queues, topics and a vault are access
  paths over one transactional record store, not separate services. A question
  spanning them is one statement. Seven change how a record is reached; the other
  four change something else — a series changes what the store will answer with,
  a queue changes who may reach a record and until when, a topic makes a message
  unchangeable once written and numbers it densely at commit, and the vault
  changes what is stored — a declared \`SECRET\` field is sealed before the record
  is encoded, so the index, the change feed, the replication log and every backup
  carry ciphertext.
- **Not the fastest at any one of them; enough at all of them.** A specialist
  will be faster at its own job, and there is no published benchmark. The vault
  seals declared fields; it is not a general secrets service with leases and
  rotation.
- **An index changes the cost, not the answer** — with exactly one declared
  exception. A vector read returns the exact nearest neighbours unless the
  statement writes \`APPROXIMATE\`.
- **A topic's exactly-once is scoped.** A reader's position moves in its own
  transaction, so an effect written into this store happens once per message; an
  effect outside it is at-least-once.
- **Stream ingestion is declared.** \`DEFINE TOPIC CONSUMER\` reads one of the
  store's own topics into a table exactly once into the store. \`DEFINE KAFKA
  CONSUMER\` reads a broker topic at-least-once, with idempotent application by
  record identity — the store commit precedes the offset commit, which chooses
  duplicates over loss — and needs a build with the \`kafka\` feature. Neither
  infers a schema.
- **A supplied value never becomes syntax.** Values reach the store as bound
  parameters, never as text spliced into a statement.
- **The cluster is built and released.** Followers, leases and failover from
  \`0.2.0-beta\`; tables split by key range from \`0.4.0-beta\`; from
  \`0.19.0-beta\` a split table's shards are split, merged and moved to another
  leader while it serves, a table can be partitioned by region, and a read of a
  split table is worked out on the shards' leaders. Resharding is by statement:
  records already written stay where they are, and nothing splits on its own.
- **A backup is a snapshot unless the log is asked for**, and a serving node
  keeps the newest 100 000 records of each log by default (\`0.18.0-beta\`).
- **There is no columnar or OLAP engine.** The aggregation vocabulary exists and
  runs over a row scan.

## Pages
${index}

## Elsewhere

- [The product site](${product})
- [Search](${origin}/search?q=): the site's own full-text index over these pages
`;

  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      // An hour at the edge. The document changes when a page is added, and a
      // crawler holding a stale index for an hour costs nothing.
      "cache-control": "public, max-age=3600",
    },
  });
}

/**
 * `standalone` because the deployment is a container: the output carries the
 * server and only the dependencies it actually reached, so the runtime image
 * does not ship `node_modules` entire.
 *
 * @type {import('next').NextConfig}
 */
/**
 * Product pages that moved into a group when the product sections got
 * collapsible groups: each old address answers with the page's new one.
 */
const grouped = [
  ["/kv/what-it-is", "/kv/start/what-it-is"],
  ["/kv/getting-started", "/kv/start/getting-started"],
  ["/kv/the-engine", "/kv/engine/the-engine"],
  ["/kv/writes-and-durability", "/kv/engine/writes-and-durability"],
  ["/kv/reads-and-snapshots", "/kv/engine/reads-and-snapshots"],
  ["/kv/transactions", "/kv/engine/transactions"],
  ["/kv/keyspaces", "/kv/engine/keyspaces"],
  ["/kv/compaction-and-backpressure", "/kv/engine/compaction-and-backpressure"],
  ["/kv/options", "/kv/operating/options"],
  ["/kv/encryption-at-rest", "/kv/operating/encryption-at-rest"],
  ["/kv/operations", "/kv/operating/operations"],
  ["/s3/what-it-is", "/s3/start/what-it-is"],
  ["/s3/running", "/s3/start/running"],
  ["/s3/configuration", "/s3/start/configuration"],
  ["/s3/compatibility", "/s3/start/compatibility"],
  ["/s3/access", "/s3/data-and-access/access"],
  ["/s3/security", "/s3/data-and-access/security"],
  ["/s3/encryption", "/s3/data-and-access/encryption"],
  ["/s3/events-lifecycle-media", "/s3/data-and-access/events-lifecycle-media"],
  ["/s3/clusters", "/s3/operating/clusters"],
  ["/s3/metrics", "/s3/operating/metrics"],
  ["/s3/console", "/s3/operating/console"],
  ["/s3/rust-client", "/s3/clients/rust-client"],
  ["/s3/cli", "/s3/clients/cli"],
  ["/am/what-it-holds", "/am/start/what-it-holds"],
  ["/am/getting-started", "/am/start/getting-started"],
  ["/am/surfaces", "/am/using-it/surfaces"],
];

const config = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  /**
   * TessariKV's section was `/tessarikv` until each product got a short section
   * of its own. The old addresses are in the product site, in search results
   * and in links people kept, so they move permanently rather than go missing.
   */
  async redirects() {
    return [
      { source: "/tessarikv", destination: "/kv", statusCode: 301 },
      { source: "/tessarikv/:path*", destination: "/kv/:path*", statusCode: 301 },
      ...grouped.map(([source, destination]) => ({
        source,
        destination,
        statusCode: 301,
      })),
    ];
  },
};

export default config;

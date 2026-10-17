/**
 * `standalone` because the deployment is a container: the output carries the
 * server and only the dependencies it actually reached, so the runtime image
 * does not ship `node_modules` entire.
 *
 * @type {import('next').NextConfig}
 */
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
    ];
  },
};

export default config;

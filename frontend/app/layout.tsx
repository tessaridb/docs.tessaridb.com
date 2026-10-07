import type { Metadata, Viewport } from "next";
import { connection } from "next/server";

import { BEFORE_PAINT } from "@/components/Theme";
import { origin, tagline } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  /*
   * Without this every relative URL in the metadata below resolves against
   * nothing and Next drops it. It cannot be taken from the request: this server
   * sits behind a TLS terminator and sees a loopback `Host` over plain http, so
   * a derived base would publish `http://127.0.0.1:3000` as the canonical origin
   * of the documentation.
   */
  metadataBase: new URL(origin),
  title: { default: "TessariDB", template: "%s — TessariDB" },
  description: tagline,
  applicationName: "TessariDB documentation",
  /*
   * `max-snippet: -1` matters more here than on a marketing site. These pages
   * answer questions, and a result truncated at the default length cuts the
   * answer off in the middle of the qualification that makes it correct —
   * "at-least-once, with idempotent application by…" is worse than no snippet.
   */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  openGraph: {
    type: "website",
    siteName: "TessariDB documentation",
    title: "TessariDB documentation",
    description: tagline,
    url: origin,
  },
  twitter: { card: "summary", title: "TessariDB documentation", description: tagline },
};

/**
 * Without this a phone lays the page out in a virtual viewport of about 980px
 * and then zooms out to fit, so a `max-width: 860px` rule never matches
 * anything and every narrow-screen style in `globals.css` is dead code. The
 * failure is quiet in exactly the wrong way: the site looks like it was never
 * made responsive rather than like it is missing one line.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Named so the browser's own chrome matches the theme rather than framing a
  // dark page in a light bar.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d13" },
  ],
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Nothing here is prerendered at build time, and that is the point of the
  // whole project rather than a configuration detail: the content lives in
  // TessariDB, so baking it into the image at build would make this the static
  // site it exists not to be — pages edited through the API would not appear
  // until somebody rebuilt and redeployed the front end.
  //
  // `connection()` marks the render as per-request without touching the fetch
  // cache, so the reads in `lib/api` still hold for their thirty seconds and
  // the store is not asked to verify a password for every reader.
  await connection();

  // The header, the tree and the footer are the release's — see `Shell`, which
  // the live site's layout and each archived release's layout render.
  return (
    // `suppressHydrationWarning` because the script below writes `data-theme`
    // onto this element before React sees it, which is the whole point of it.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BEFORE_PAINT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

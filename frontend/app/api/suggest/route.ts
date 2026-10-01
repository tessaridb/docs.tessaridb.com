import { NextResponse } from "next/server";

import { suggest } from "@/lib/api";

/**
 * The search box's type-ahead route — a proxy, for the same reason the search
 * route is one: the documentation API is not reachable from the browser.
 *
 * The words come from the store's `COMPLETE` over an unstemmed search, most
 * widely held first. Nothing here reorders or invents them.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const typed = new URL(request.url).searchParams.get("p") ?? "";
  if (typed.trim().length < 3) return NextResponse.json([]);

  try {
    return NextResponse.json(await suggest(typed.trim()));
  } catch (fault) {
    // No suggestions rather than an error: the box still searches without them.
    console.error("suggest failed", fault);
    return NextResponse.json([], { status: 200 });
  }
}

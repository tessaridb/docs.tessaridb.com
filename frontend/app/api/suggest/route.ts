import { NextResponse } from "next/server";

import { suggest } from "@/lib/api";
import { release } from "@/lib/version";

/**
 * The search box's type-ahead route — a proxy, for the same reason the search
 * route is one: the documentation API is not reachable from the browser.
 *
 * The words come from the store's `COMPLETE` over an unstemmed search, most
 * widely held first. Nothing here reorders or invents them.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const typed = params.get("p") ?? "";
  if (typed.trim().length < 3) return NextResponse.json([]);
  const archived = release(params.get("v"));
  if (archived === undefined) return NextResponse.json([]);

  try {
    return NextResponse.json(await suggest(typed.trim(), archived));
  } catch (fault) {
    // No suggestions rather than an error: the box still searches without them.
    console.error("suggest failed", fault);
    return NextResponse.json([], { status: 200 });
  }
}

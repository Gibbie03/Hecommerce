import { NextRequest, NextResponse } from "next/server";
import { findClaimableBusinesses } from "@/lib/business/queries";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`search-claimable:${ip}`, 30, 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many searches. Try again shortly." }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await findClaimableBusinesses(q);
  return NextResponse.json({ results });
}

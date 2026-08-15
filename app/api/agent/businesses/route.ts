import { NextRequest, NextResponse } from "next/server";
import { searchPublishedBusinesses } from "@/lib/business/queries";
import { serializeBusiness } from "@/lib/agent/serialize";
import { rateLimit, clientIp } from "@/lib/rateLimit";

/** searchBusinesses — read-only agent API. GET /api/agent/businesses?q=shawarma */
export async function GET(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`agent:${ip}`, 60, 60 * 1000).ok) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() || undefined;
  const businesses = await searchPublishedBusinesses(q);
  return NextResponse.json({ results: businesses.map(serializeBusiness) });
}

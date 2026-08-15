import { NextRequest, NextResponse } from "next/server";
import { getPublishedBusinessBySlug } from "@/lib/business/queries";
import { serializeBusiness } from "@/lib/agent/serialize";
import { rateLimit, clientIp } from "@/lib/rateLimit";

/** getBusiness — read-only agent API. GET /api/agent/businesses/:slug */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`agent:${ip}`, 60, 60 * 1000).ok) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const { slug } = await params;
  const business = await getPublishedBusinessBySlug(slug);
  if (!business) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json(serializeBusiness(business));
}

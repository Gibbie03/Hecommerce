import { NextRequest, NextResponse } from "next/server";
import { getPublishedBusinessBySlug, getPublishedReviews } from "@/lib/business/queries";
import { serializeReview } from "@/lib/agent/serialize";
import { rateLimit, clientIp } from "@/lib/rateLimit";

/** getReviews — read-only agent API. GET /api/agent/businesses/:slug/reviews */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`agent:${ip}`, 60, 60 * 1000).ok) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const { slug } = await params;
  const business = await getPublishedBusinessBySlug(slug);
  if (!business) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const reviews = await getPublishedReviews(business.id);
  return NextResponse.json({ results: reviews.map(serializeReview) });
}

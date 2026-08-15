import { NextRequest, NextResponse } from "next/server";
import { getPublishedProductById } from "@/lib/business/queries";
import { serializeProduct } from "@/lib/agent/serialize";
import { rateLimit, clientIp } from "@/lib/rateLimit";

/** getProduct / getOffer — read-only agent API. GET /api/agent/products/:id */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`agent:${ip}`, 60, 60 * 1000).ok) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const { id } = await params;
  const result = await getPublishedProductById(id);
  if (!result) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({
    ...serializeProduct(result.product),
    business: result.business,
  });
}

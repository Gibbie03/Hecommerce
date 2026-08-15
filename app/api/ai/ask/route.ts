import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getBusinessForMember, getMemberProducts } from "@/lib/business/queries";
import { answerQuestion } from "@/lib/ai/simulator";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  businessId: z.string().uuid(),
  question: z.string().trim().min(1).max(300),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const ip = clientIp(req.headers);
  if (!rateLimit(`ai-ask:${ip}`, 30, 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many questions. Try again shortly." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }

  const business = await getBusinessForMember(parsed.data.businessId, session.userId);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const products = await getMemberProducts(business.id, session.userId);
  const answer = answerQuestion(parsed.data.question, business, products);
  return NextResponse.json({ answer });
}

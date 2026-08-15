import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { scrapeWebsite } from "@/lib/import/scrape";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  url: z.string().trim().url().max(2048),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`import-website:${ip}`, 10, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many import attempts. Try again shortly." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid website URL." }, { status: 400 });
  }

  try {
    const result = await scrapeWebsite(parsed.data.url);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't import that website." },
      { status: 422 },
    );
  }
}

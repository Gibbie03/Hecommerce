import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { runAsUser } from "@/lib/db/withAuth";
import { isAllowedImageType, saveUploadedImage, deleteUploadedFile, MAX_UPLOAD_BYTES } from "@/lib/upload";

const metaSchema = z.object({
  businessId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  isPrimary: z.enum(["true", "false"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  const parsedMeta = metaSchema.safeParse({
    businessId: form.get("businessId"),
    productId: form.get("productId") || undefined,
    isPrimary: form.get("isPrimary") || undefined,
  });

  if (!(file instanceof File) || !parsedMeta.success) {
    return NextResponse.json({ error: "A file and businessId are required." }, { status: 400 });
  }

  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image must be under 5MB." }, { status: 400 });
  }

  if (!isAllowedImageType(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WEBP, or GIF images are allowed." }, { status: 400 });
  }

  const { businessId, productId, isPrimary } = parsedMeta.data;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { url, absolutePath } = await saveUploadedImage(businessId, file.type, bytes);

  try {
    const image = await runAsUser(session.userId, async (client) => {
      const { rows } = await client.query(
        `insert into business_images (business_id, product_id, url, is_primary)
         values ($1, $2, $3, $4)
         returning id, url`,
        [businessId, productId ?? null, url, isPrimary === "true"],
      );
      return rows[0];
    });
    return NextResponse.json({ ok: true, image });
  } catch (err: unknown) {
    await deleteUploadedFile(absolutePath);
    const code = (err as { code?: string })?.code;
    if (code === "42501") {
      return NextResponse.json({ error: "You don't have permission to add images to this business." }, { status: 403 });
    }
    console.error("Upload insert failed", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}

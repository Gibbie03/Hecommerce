import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "business-images";

export function isAllowedImageType(mimeType: string): boolean {
  return mimeType in ALLOWED_MIME_EXTENSIONS;
}

export interface SavedUpload {
  url: string;
  /** Deletes the just-written file — called if the follow-up DB insert fails. */
  cleanup: () => Promise<void>;
}

/**
 * Writes an uploaded image under a tenant-scoped path
 * ({businessId}/{filename}) with a server-generated filename — the
 * client-supplied filename and MIME type are never trusted for the name or
 * extension, only used to reject disallowed types.
 *
 * Against a real Supabase project (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
 * set), this uploads to the `business-images` Storage bucket. Serverless
 * functions don't have a writable/persistent public/ directory, so this
 * branch is required for Vercel, not just a style preference. Local dev
 * (no Supabase configured) keeps writing to public/uploads/ exactly as
 * before, served statically by Next. See docs/SUPABASE_MIGRATION.md.
 */
export async function saveUploadedImage(
  businessId: string,
  mimeType: string,
  bytes: Buffer,
): Promise<SavedUpload> {
  const extension = ALLOWED_MIME_EXTENSIONS[mimeType];
  if (!extension) {
    throw new Error("Unsupported image type");
  }

  const filename = `${randomUUID()}.${extension}`;

  const admin = getSupabaseAdmin();
  if (admin) {
    const objectPath = `${businessId}/${filename}`;
    const { error } = await admin.storage.from(STORAGE_BUCKET).upload(objectPath, bytes, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }
    const { data } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);
    return {
      url: data.publicUrl,
      cleanup: async () => {
        await admin.storage.from(STORAGE_BUCKET).remove([objectPath]).catch(() => undefined);
      },
    };
  }

  const dir = path.join(process.cwd(), "public", "uploads", businessId);
  await mkdir(dir, { recursive: true });
  const absolutePath = path.join(dir, filename);
  await writeFile(absolutePath, bytes);

  return {
    url: `/uploads/${businessId}/${filename}`,
    cleanup: async () => {
      await unlink(absolutePath).catch(() => undefined);
    },
  };
}

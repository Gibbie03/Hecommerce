import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function isAllowedImageType(mimeType: string): boolean {
  return mimeType in ALLOWED_MIME_EXTENSIONS;
}

/**
 * Writes an uploaded image under a tenant-scoped path
 * (public/uploads/{businessId}/...) with a server-generated filename — the
 * client-supplied filename and MIME type are never trusted for the name or
 * extension, only used to reject disallowed types. Mirrors the Supabase
 * Storage bucket layout described in docs/DATABASE_SECURITY.md so this
 * swaps cleanly to real Storage later (see docs/SUPABASE_MIGRATION.md).
 */
export async function saveUploadedImage(
  businessId: string,
  mimeType: string,
  bytes: Buffer,
): Promise<{ url: string; absolutePath: string }> {
  const extension = ALLOWED_MIME_EXTENSIONS[mimeType];
  if (!extension) {
    throw new Error("Unsupported image type");
  }

  const dir = path.join(process.cwd(), "public", "uploads", businessId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;
  const absolutePath = path.join(dir, filename);
  await writeFile(absolutePath, bytes);

  return { url: `/uploads/${businessId}/${filename}`, absolutePath };
}

export async function deleteUploadedFile(absolutePath: string): Promise<void> {
  await unlink(absolutePath).catch(() => undefined);
}

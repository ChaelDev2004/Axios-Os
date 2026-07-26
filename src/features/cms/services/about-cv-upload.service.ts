import { createClient } from "@/lib/supabase/client";
import { requireAdminId } from "@/features/cms/services/cms-auth";

const BUCKET = "site-media";
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function throwOnError(error: { message: string } | null): asserts error is null {
  if (error) {
    throw new Error(error.message);
  }
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 120);
}

export async function uploadAboutCvFile(file: File): Promise<{
  url: string;
  fileName: string;
}> {
  await requireAdminId();

  if (!file || file.size <= 0) {
    throw new Error("Choose a CV file to upload.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("CV file must be 10MB or smaller.");
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    throw new Error("Use PDF, Word, PNG, JPG, or WebP.");
  }

  const supabase = createClient();
  const stamp = Date.now();
  const path = `about/cv/${stamp}-${safeFileName(file.name || "cv.pdf")}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "application/pdf",
  });
  throwOnError(error);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Could not resolve CV public URL.");
  }

  return {
    url: data.publicUrl,
    fileName: file.name || "cv.pdf",
  };
}

export async function removeAboutCvFile(publicUrl: string): Promise<void> {
  if (!publicUrl.includes("/site-media/")) return;
  await requireAdminId();
  const supabase = createClient();
  const marker = "/object/public/site-media/";
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return;
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
  if (!path.startsWith("about/cv/")) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

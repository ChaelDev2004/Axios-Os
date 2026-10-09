import { createClient } from "@/lib/supabase/client";

const BUCKET = "receipts";
const MAX_BYTES = 2 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function uploadReceiptImage(blob: Blob): Promise<string> {
  if (blob.size <= 0) throw new Error("Receipt image is empty.");
  if (blob.size > MAX_BYTES) throw new Error("Receipt image is too large to upload.");

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Sign in again to attach receipt images.");

  const fileId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const path = `${user.id}/${fileId}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: "image/jpeg",
  });
  if (error) throw new Error("Could not upload the receipt image.");
  return path;
}

export async function getReceiptImageUrl(path: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) throw new Error("Could not load the receipt image.");
  return data.signedUrl;
}

export async function removeReceiptImage(path: string | null | undefined): Promise<void> {
  if (!path) return;
  try {
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    /* orphaned receipt images are harmless; never block the delete */
  }
}

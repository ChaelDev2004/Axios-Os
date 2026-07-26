"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/features/auth/types/database.types";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function createSessionForEmail(email: string) {
  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase().trim(),
    });

  if (linkError || !linkData.properties?.hashed_token) {
    throw new Error(linkError?.message ?? "Unable to create session");
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "email",
  });

  if (verifyError) {
    throw new Error(verifyError.message);
  }
}

export async function getPostLoginRedirect(): Promise<string> {
  const profile = await getProfile();
  if (!profile?.has_pin) return "/auth/setup-pin";
  return "/dashboard";
}

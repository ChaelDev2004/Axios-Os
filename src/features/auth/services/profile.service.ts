import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database, Profile } from "@/features/auth/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ApiCreateProfileInput,
  ApiPatchProfileInput,
} from "@/features/auth/schemas/auth.schemas";

type DbClient = SupabaseClient<Database>;

export interface ProfileDto {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  hasPin: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toProfileDto(profile: Profile): ProfileDto {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    role: profile.role,
    hasPin: profile.has_pin,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

function normalizeAvatarUrl(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function getProfileRecord(
  supabase: DbClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function syncAuthMetadata(
  supabase: DbClient,
  input: { fullName?: string; avatarUrl?: string | null }
) {
  const data: Record<string, string | null> = {};
  if (input.fullName !== undefined) data.full_name = input.fullName;
  if (input.avatarUrl !== undefined) data.avatar_url = input.avatarUrl;
  if (Object.keys(data).length === 0) return;
  await supabase.auth.updateUser({ data });
}

export async function createProfileRecord(
  supabase: DbClient,
  user: User,
  input: ApiCreateProfileInput
): Promise<Profile> {
  const existing = await getProfileRecord(supabase, user.id);
  if (existing) {
    throw new Error("Profile already exists.");
  }

  const avatarUrl = normalizeAvatarUrl(input.avatarUrl) ?? null;
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? "",
      full_name: input.fullName,
      avatar_url: avatarUrl,
      has_pin: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  await syncAuthMetadata(supabase, { fullName: input.fullName, avatarUrl });
  return data;
}

export async function updateProfileRecord(
  supabase: DbClient,
  userId: string,
  input: ApiPatchProfileInput
): Promise<Profile | null> {
  const existing = await getProfileRecord(supabase, userId);
  if (!existing) return null;

  const patch: {
    full_name?: string;
    avatar_url?: string | null;
  } = {};

  if (input.fullName !== undefined) patch.full_name = input.fullName;
  const avatarUrl = normalizeAvatarUrl(input.avatarUrl);
  if (avatarUrl !== undefined) patch.avatar_url = avatarUrl;

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  await syncAuthMetadata(supabase, {
    fullName: input.fullName,
    avatarUrl,
  });
  return data;
}

export async function replaceProfileRecord(
  supabase: DbClient,
  user: User,
  input: ApiCreateProfileInput
): Promise<Profile> {
  const existing = await getProfileRecord(supabase, user.id);
  if (!existing) return createProfileRecord(supabase, user, input);

  const updated = await updateProfileRecord(supabase, user.id, {
    fullName: input.fullName,
    avatarUrl: input.avatarUrl,
  });
  if (!updated) throw new Error("Profile not found.");
  return updated;
}

export async function deleteProfileAccount(
  supabase: DbClient,
  user: User,
  password: string
): Promise<void> {
  const email = user.email;
  if (!email) throw new Error("This account cannot be deleted.");

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (verifyError) throw new Error("Invalid password.");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Account deletion is not configured.");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error(error.message);

  await supabase.auth.signOut();
}

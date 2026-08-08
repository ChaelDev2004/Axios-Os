import { createClient } from "@/lib/supabase/client";
import { isBrowserOnline } from "@/features/offline/lib/offline-utils";
import {
  decryptOptional,
  encryptOptional,
  encryptText,
} from "@/features/vault/lib/crypto";
import { extractDomain, googleFaviconUrl, normalizeWebsiteUrl } from "@/features/vault/lib/url";
import type {
  DecryptedVaultCredential,
  VaultAutoLockMinutes,
  VaultCredentialInput,
  VaultCredentialType,
  VaultFolder,
  VaultSensitiveMeta,
  VaultSettings,
} from "@/features/vault/types";
import { MAX_VAULT_TAGS } from "@/features/vault/types";

type DbCredential = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  username: string | null;
  encrypted_secret: string | null;
  website: string | null;
  domain: string | null;
  icon_url: string | null;
  folder_id: string | null;
  favorite: boolean;
  tags: string[] | null;
  encrypted_notes: string | null;
  encrypted_meta: string | null;
  created_at: string;
  updated_at: string;
};

type DbFolder = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type DbSettings = {
  user_id: string;
  pin_hash: string;
  kdf_salt: string;
  auto_lock_minutes: number;
  created_at: string;
  updated_at: string;
};

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;
  } catch {
    /* fall through */
  }
  if (!isBrowserOnline()) {
    throw new Error("Not authenticated. Sign in while online to use the Vault.");
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!user) throw new Error("Not authenticated.");
  return user.id;
}

function normalizeTags(tags: string[] | undefined): string[] {
  const cleaned = (tags ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(cleaned)].slice(0, MAX_VAULT_TAGS);
}

function mapFolder(row: DbFolder): VaultFolder {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSettings(row: DbSettings): VaultSettings {
  return {
    userId: row.user_id,
    pinHash: row.pin_hash,
    kdfSalt: row.kdf_salt,
    autoLockMinutes: row.auto_lock_minutes as VaultAutoLockMinutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function decryptCredential(row: DbCredential): Promise<DecryptedVaultCredential> {
  const secret = await decryptOptional(row.encrypted_secret);
  const notes = await decryptOptional(row.encrypted_notes);
  let meta: VaultSensitiveMeta = {};
  const metaRaw = await decryptOptional(row.encrypted_meta);
  if (metaRaw) {
    try {
      meta = JSON.parse(metaRaw) as VaultSensitiveMeta;
    } catch {
      meta = {};
    }
  }

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type as VaultCredentialType,
    username: row.username,
    secret,
    website: row.website,
    domain: row.domain,
    iconUrl: row.icon_url,
    folderId: row.folder_id,
    favorite: row.favorite,
    tags: row.tags ?? [],
    notes,
    meta,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function buildEncryptedPayload(input: VaultCredentialInput) {
  const website = input.website?.trim()
    ? normalizeWebsiteUrl(input.website) ?? input.website.trim()
    : null;
  const domain = extractDomain(website);
  const iconUrl = domain ? googleFaviconUrl(domain) : null;
  const tags = normalizeTags(input.tags);
  const meta = input.meta ?? {};
  const hasMeta = Object.keys(meta).some((k) => {
    const v = meta[k as keyof VaultSensitiveMeta];
    if (typeof v === "string") return v.length > 0;
    if (v && typeof v === "object") return Object.keys(v).length > 0;
    return false;
  });

  return {
    name: input.name.trim(),
    type: input.type,
    username: input.username?.trim() || null,
    encrypted_secret: await encryptOptional(input.secret),
    website,
    domain,
    icon_url: iconUrl,
    folder_id: input.folderId || null,
    favorite: Boolean(input.favorite),
    tags,
    encrypted_notes: await encryptOptional(input.notes),
    encrypted_meta: hasMeta ? await encryptText(JSON.stringify(meta)) : null,
  };
}

export async function fetchVaultSettings(): Promise<VaultSettings | null> {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("vault_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapSettings(data as DbSettings) : null;
}

export async function setupVaultSettings(input: {
  pinHash: string;
  kdfSalt: string;
  autoLockMinutes?: VaultAutoLockMinutes;
}): Promise<VaultSettings> {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("vault_settings")
    .upsert({
      user_id: userId,
      pin_hash: input.pinHash,
      kdf_salt: input.kdfSalt,
      auto_lock_minutes: input.autoLockMinutes ?? 5,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapSettings(data as DbSettings);
}

export async function updateVaultAutoLock(
  minutes: VaultAutoLockMinutes
): Promise<void> {
  const supabase = createClient();
  const userId = await requireUserId();
  const { error } = await supabase
    .from("vault_settings")
    .update({ auto_lock_minutes: minutes })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function fetchVaultFolders(): Promise<VaultFolder[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vault_folders")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as DbFolder[]).map(mapFolder);
}

export async function createVaultFolder(name: string): Promise<VaultFolder> {
  const supabase = createClient();
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Folder name is required.");
  const { data, error } = await supabase
    .from("vault_folders")
    .insert({ user_id: userId, name: trimmed })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapFolder(data as DbFolder);
}

export async function renameVaultFolder(
  id: string,
  name: string
): Promise<VaultFolder> {
  const supabase = createClient();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Folder name is required.");
  const { data, error } = await supabase
    .from("vault_folders")
    .update({ name: trimmed })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapFolder(data as DbFolder);
}

export async function deleteVaultFolder(id: string): Promise<void> {
  const supabase = createClient();
  // folder_id on credentials is ON DELETE SET NULL
  const { error } = await supabase.from("vault_folders").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchVaultCredentials(): Promise<DecryptedVaultCredential[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vault_credentials")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as DbCredential[];
  return Promise.all(rows.map(decryptCredential));
}

export async function createVaultCredential(
  input: VaultCredentialInput
): Promise<DecryptedVaultCredential> {
  if (!input.name.trim()) throw new Error("Name is required.");
  const supabase = createClient();
  const userId = await requireUserId();
  const payload = await buildEncryptedPayload(input);
  const { data, error } = await supabase
    .from("vault_credentials")
    .insert({ ...payload, user_id: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return decryptCredential(data as DbCredential);
}

export async function updateVaultCredential(
  id: string,
  input: VaultCredentialInput
): Promise<DecryptedVaultCredential> {
  if (!input.name.trim()) throw new Error("Name is required.");
  const supabase = createClient();
  const payload = await buildEncryptedPayload(input);
  const { data, error } = await supabase
    .from("vault_credentials")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return decryptCredential(data as DbCredential);
}

export async function toggleVaultFavorite(
  id: string,
  favorite: boolean
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("vault_credentials")
    .update({ favorite })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteVaultCredential(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("vault_credentials").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

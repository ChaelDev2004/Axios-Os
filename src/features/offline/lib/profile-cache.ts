import type { Profile } from "@/features/auth/types/database.types";
import type { User } from "@supabase/supabase-js";

const PROFILE_CACHE_KEY = "axion-os-profile-cache";

export function readCachedProfile(userId?: string): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw) as Profile;
    if (userId && profile.id !== userId) return null;
    return profile;
  } catch {
    return null;
  }
}

export function writeCachedProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // quota / private mode
  }
}

export function clearCachedProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // ignore
  }
}

/** Minimal profile so the dashboard can render when Supabase is unreachable. */
export function buildOfflineProfileStub(user: User): Profile {
  const cached = readCachedProfile(user.id);
  if (cached) return cached;

  const email = user.email ?? "";
  const fullName =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name.trim()) ||
    email.split("@")[0] ||
    "User";
  const stamp = new Date().toISOString();

  return {
    id: user.id,
    full_name: fullName,
    email,
    avatar_url:
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null,
    role: "member",
    pin_hash: null,
    has_pin: false,
    pin_attempts: 0,
    pin_locked_until: null,
    pin_lock_level: 0,
    password_attempts: 0,
    password_locked_until: null,
    password_lock_level: 0,
    created_at: stamp,
    updated_at: stamp,
  };
}

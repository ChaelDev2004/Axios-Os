import "server-only";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isIpAllowedForAdmin,
  parseAdminIpAllowlist,
} from "@/features/auth/lib/admin-ip";
import type { Json } from "@/features/auth/types/database.types";

export { isIpAllowedForAdmin, parseAdminIpAllowlist };

/** Max failed attempts before a lockout starts */
export const MAX_AUTH_ATTEMPTS = 5;

/** Sliding window for IP/email rate limiting */
export const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_RATE_MAX_ATTEMPTS = 20;

const COMMON_PASSWORDS = new Set(
  [
    "password",
    "password1",
    "password123",
    "12345678",
    "123456789",
    "qwerty123",
    "letmein1",
    "welcome1",
    "admin123",
    "iloveyou",
    "abc12345",
    "monkey12",
    "dragon12",
    "master12",
    "login123",
    "passw0rd",
    "changeme",
    "axios123",
    "axiosos1",
  ].map((p) => p.toLowerCase())
);

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

/** Progressive lock: 30s → 2m → 5m → 15m → 1h */
export function getProgressiveLockMs(lockLevel: number): number {
  const tiers = [30_000, 120_000, 300_000, 900_000, 3_600_000];
  const index = Math.max(0, Math.min(lockLevel - 1, tiers.length - 1));
  return tiers[index] ?? 3_600_000;
}

export function isLocked(lockedUntil: string | null | undefined): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > Date.now();
}

export function getRemainingLockSeconds(
  lockedUntil: string | null | undefined
): number {
  if (!lockedUntil) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000)
  );
}

export async function getRequestClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    h.get("x-real-ip")?.trim() ||
    h.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

export type AuthEventKind =
  | "password_fail"
  | "password_success"
  | "password_lock"
  | "pin_fail"
  | "pin_success"
  | "pin_lock"
  | "register_fail"
  | "rate_limited"
  | "admin_ip_blocked";

export async function logAuthEvent(input: {
  kind: AuthEventKind;
  email?: string | null;
  userId?: string | null;
  ip?: string | null;
  meta?: Json;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("auth_security_events").insert({
      kind: input.kind,
      email: input.email?.toLowerCase().trim() || null,
      user_id: input.userId || null,
      ip: input.ip || null,
      meta: input.meta ?? {},
    });
  } catch {
    // Never block auth on logging failure
  }
}

/**
 * Returns true when this email or IP exceeded the rate window.
 */
export async function isAuthRateLimited(input: {
  email: string;
  ip: string;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - AUTH_RATE_WINDOW_MS).toISOString();
    const email = input.email.toLowerCase().trim();
    const failKinds = [
      "password_fail",
      "pin_fail",
      "register_fail",
      "rate_limited",
    ] as const;

    const [byEmail, byIp] = await Promise.all([
      admin
        .from("auth_security_events")
        .select("id", { count: "exact", head: true })
        .in("kind", [...failKinds])
        .eq("email", email)
        .gte("created_at", since),
      admin
        .from("auth_security_events")
        .select("id", { count: "exact", head: true })
        .in("kind", [...failKinds])
        .eq("ip", input.ip)
        .gte("created_at", since),
    ]);

    return (
      (byEmail.count ?? 0) >= AUTH_RATE_MAX_ATTEMPTS ||
      (byIp.count ?? 0) >= AUTH_RATE_MAX_ATTEMPTS
    );
  } catch {
    return false;
  }
}

export type LockState = {
  attempts: number;
  lockLevel: number;
  lockedUntil: string | null;
};

export function nextLockState(current: LockState): LockState {
  const attempts = current.attempts + 1;
  if (attempts < MAX_AUTH_ATTEMPTS) {
    return {
      attempts,
      lockLevel: current.lockLevel,
      lockedUntil: null,
    };
  }
  const lockLevel = Math.max(1, current.lockLevel + 1);
  return {
    attempts: 0,
    lockLevel,
    lockedUntil: new Date(
      Date.now() + getProgressiveLockMs(lockLevel)
    ).toISOString(),
  };
}

export function clearLockState(): LockState {
  return { attempts: 0, lockLevel: 0, lockedUntil: null };
}

export function formatLockMessage(lockedUntil: string): string {
  const seconds = getRemainingLockSeconds(lockedUntil);
  if (seconds >= 60) {
    const mins = Math.ceil(seconds / 60);
    return `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
  }
  return `Too many failed attempts. Try again in ${seconds}s.`;
}

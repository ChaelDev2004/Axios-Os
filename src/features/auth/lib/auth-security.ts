/**
 * Client-safe auth security helpers (no next/headers).
 * Server-only helpers live in auth-security.server.ts.
 */

export const MAX_AUTH_ATTEMPTS = 5;

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

import bcrypt from "bcryptjs";
import {
  getProgressiveLockMs,
  getRemainingLockSeconds,
  isLocked,
  MAX_AUTH_ATTEMPTS,
} from "@/features/auth/lib/auth-security";

const PIN_SALT_ROUNDS = 12;

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, PIN_SALT_ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export const MAX_PIN_ATTEMPTS = MAX_AUTH_ATTEMPTS;

/** @deprecated Prefer getProgressiveLockMs(lockLevel) */
export const PIN_LOCK_DURATION_MS = 30_000;

export function getLockExpiry(attempts: number, lockLevel = 1): Date | null {
  if (attempts < MAX_PIN_ATTEMPTS) return null;
  return new Date(Date.now() + getProgressiveLockMs(Math.max(1, lockLevel)));
}

export { isLocked, getRemainingLockSeconds, getProgressiveLockMs };

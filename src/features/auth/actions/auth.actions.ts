"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  registerSchema,
  loginSchema,
  pinLoginSchema,
  forgotPinSchema,
} from "@/features/auth/schemas/auth.schemas";
import {
  hashPin,
  verifyPin,
  MAX_PIN_ATTEMPTS,
  isLocked,
} from "@/features/auth/lib/pin.utils";
import {
  clearLockState,
  formatLockMessage,
  getRequestClientIp,
  isAuthRateLimited,
  logAuthEvent,
  nextLockState,
} from "@/features/auth/lib/auth-security.server";
import {
  createSessionForEmail,
  getProfileByEmail,
} from "@/features/auth/services/auth.service";
import {
  loginWithPassword,
  registerWithPassword,
} from "@/features/auth/services/password-auth.service";
import type { AuthActionResult } from "@/features/auth/types/database.types";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function registerAction(
  input: unknown
): Promise<AuthActionResult<{ redirectTo: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await registerWithPassword(parsed.data);
  if (!result.success) {
    return { success: false, error: result.error, lockedUntil: result.lockedUntil };
  }

  return {
    success: true,
    data: { redirectTo: result.data.redirectTo },
    message: result.message,
  };
}

export async function loginAction(
  input: unknown
): Promise<AuthActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await loginWithPassword(parsed.data);
  if (!result.success) {
    return { success: false, error: result.error, lockedUntil: result.lockedUntil };
  }

  return { success: true, data: { redirectTo: result.data.redirectTo } };
}

export async function pinLoginAction(
  input: unknown
): Promise<AuthActionResult<{ redirectTo: string }>> {
  const parsed = pinLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, pin } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const ip = await getRequestClientIp();
  const profile = await getProfileByEmail(normalizedEmail);

  if (await isAuthRateLimited({ email: normalizedEmail, ip })) {
    await logAuthEvent({
      kind: "rate_limited",
      email: normalizedEmail,
      ip,
      meta: { flow: "pin" },
    });
    return {
      success: false,
      error: "Too many login attempts. Please wait and try again.",
    };
  }

  if (!profile) {
    await logAuthEvent({
      kind: "pin_fail",
      email: normalizedEmail,
      ip,
      meta: { reason: "unknown_user" },
    });
    return { success: false, error: "Invalid email or PIN." };
  }

  if (!profile.has_pin || !profile.pin_hash) {
    return {
      success: false,
      error: "PIN login is not enabled. Use email and password instead.",
    };
  }

  if (isLocked(profile.pin_locked_until)) {
    return {
      success: false,
      error: formatLockMessage(profile.pin_locked_until!),
      lockedUntil: profile.pin_locked_until ?? undefined,
    };
  }

  const valid = await verifyPin(pin, profile.pin_hash);
  const admin = createAdminClient();

  if (!valid) {
    const next = nextLockState({
      attempts: profile.pin_attempts ?? 0,
      lockLevel: profile.pin_lock_level ?? 0,
      lockedUntil: profile.pin_locked_until,
    });

    await admin
      .from("profiles")
      .update({
        pin_attempts: next.attempts,
        pin_lock_level: next.lockLevel,
        pin_locked_until: next.lockedUntil,
      })
      .eq("id", profile.id);

    await logAuthEvent({
      kind: next.lockedUntil ? "pin_lock" : "pin_fail",
      email: normalizedEmail,
      userId: profile.id,
      ip,
      meta: {
        attempts: next.attempts,
        lockLevel: next.lockLevel,
      },
    });

    if (next.lockedUntil) {
      return {
        success: false,
        error: formatLockMessage(next.lockedUntil),
        lockedUntil: next.lockedUntil,
      };
    }

    const remaining = MAX_PIN_ATTEMPTS - next.attempts;
    return {
      success: false,
      error: `Invalid PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  const cleared = clearLockState();
  await admin
    .from("profiles")
    .update({
      pin_attempts: cleared.attempts,
      pin_lock_level: cleared.lockLevel,
      pin_locked_until: cleared.lockedUntil,
    })
    .eq("id", profile.id);

  try {
    await createSessionForEmail(normalizedEmail);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return { success: false, error: message };
  }

  await logAuthEvent({
    kind: "pin_success",
    email: normalizedEmail,
    userId: profile.id,
    ip,
  });

  return { success: true, data: { redirectTo: "/dashboard" } };
}

export async function setupPinAction(
  input: unknown
): Promise<AuthActionResult> {
  const { setupPinSchema } = await import("@/features/auth/schemas/auth.schemas");
  const parsed = setupPinSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to set a PIN." };
  }

  const pinHash = await hashPin(parsed.data.pin);

  const { error } = await supabase
    .from("profiles")
    .update({
      pin_hash: pinHash,
      has_pin: true,
      pin_attempts: 0,
      pin_locked_until: null,
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: undefined, message: "PIN saved successfully." };
}

export async function forgotPinAction(
  input: unknown
): Promise<AuthActionResult> {
  const parsed = forgotPinSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const email = parsed.data.email.toLowerCase().trim();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=/auth/reset-pin`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: undefined,
    message: "Check your email for a secure link to reset your PIN.",
  };
}

export async function resetPinAction(
  input: unknown
): Promise<AuthActionResult> {
  const { setupPinSchema } = await import("@/features/auth/schemas/auth.schemas");
  const parsed = setupPinSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Verify your email before resetting your PIN." };
  }

  const pinHash = await hashPin(parsed.data.pin);

  const { error } = await supabase
    .from("profiles")
    .update({
      pin_hash: pinHash,
      has_pin: true,
      pin_attempts: 0,
      pin_locked_until: null,
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: undefined, message: "PIN reset successfully." };
}

export async function changePinAction(
  input: unknown
): Promise<AuthActionResult> {
  const { changePinSchema } = await import("@/features/auth/schemas/auth.schemas");
  const parsed = changePinSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("pin_hash, has_pin")
    .eq("id", user.id)
    .single();

  if (fetchError || !profile?.pin_hash) {
    return { success: false, error: "No PIN configured." };
  }

  const valid = await verifyPin(parsed.data.currentPin, profile.pin_hash);
  if (!valid) {
    return { success: false, error: "Current PIN is incorrect." };
  }

  const pinHash = await hashPin(parsed.data.newPin);
  const { error } = await supabase
    .from("profiles")
    .update({ pin_hash: pinHash, has_pin: true })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: undefined, message: "PIN updated successfully." };
}

export async function disablePinAction(): Promise<AuthActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      pin_hash: null,
      has_pin: false,
      pin_attempts: 0,
      pin_locked_until: null,
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: undefined, message: "PIN login disabled." };
}

export async function updateProfileAction(
  input: unknown
): Promise<AuthActionResult> {
  const { updateProfileSchema } = await import("@/features/auth/schemas/auth.schemas");
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      avatar_url: parsed.data.avatarUrl?.trim() || null,
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.auth.updateUser({
    data: {
      full_name: parsed.data.fullName,
      avatar_url: parsed.data.avatarUrl?.trim() || null,
    },
  });

  return { success: true, data: undefined, message: "Profile updated." };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

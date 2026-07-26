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
  isCommonPassword,
  logAuthEvent,
  nextLockState,
} from "@/features/auth/lib/auth-security.server";
import {
  createSessionForEmail,
  getProfileByEmail,
  getPostLoginRedirect,
} from "@/features/auth/services/auth.service";
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

  const { fullName, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const ip = await getRequestClientIp();

  if (isCommonPassword(password)) {
    await logAuthEvent({
      kind: "register_fail",
      email: normalizedEmail,
      ip,
      meta: { reason: "common_password" },
    });
    return {
      success: false,
      error: "Choose a stronger, unique password that is not commonly used.",
    };
  }

  if (await isAuthRateLimited({ email: normalizedEmail, ip })) {
    await logAuthEvent({
      kind: "rate_limited",
      email: normalizedEmail,
      ip,
      meta: { flow: "register" },
    });
    return {
      success: false,
      error: "Too many attempts from this network. Please wait and try again.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${getAppUrl()}/auth/callback`,
    },
  });

  if (error) {
    await logAuthEvent({
      kind: "register_fail",
      email: normalizedEmail,
      ip,
      meta: { reason: error.message },
    });
    return { success: false, error: error.message };
  }

  if (!data.user) {
    return { success: false, error: "Registration failed. Please try again." };
  }

  const admin = createAdminClient();
  await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: fullName,
    email: normalizedEmail,
    has_pin: false,
  });

  if (!data.session) {
    return {
      success: true,
      data: { redirectTo: "/auth/login" },
      message: "Check your email to confirm your account, then sign in.",
    };
  }

  return {
    success: true,
    data: { redirectTo: "/auth/setup-pin" },
    message: "Account created successfully.",
  };
}

export async function loginAction(
  input: unknown
): Promise<AuthActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const ip = await getRequestClientIp();
  const admin = createAdminClient();
  const profile = await getProfileByEmail(normalizedEmail);

  if (await isAuthRateLimited({ email: normalizedEmail, ip })) {
    await logAuthEvent({
      kind: "rate_limited",
      email: normalizedEmail,
      ip,
      meta: { flow: "password" },
    });
    return {
      success: false,
      error: "Too many login attempts. Please wait and try again.",
    };
  }

  if (profile && isLocked(profile.password_locked_until)) {
    const lockedUntil = profile.password_locked_until!;
    return {
      success: false,
      error: formatLockMessage(lockedUntil),
      lockedUntil,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    if (profile) {
      const next = nextLockState({
        attempts: profile.password_attempts ?? 0,
        lockLevel: profile.password_lock_level ?? 0,
        lockedUntil: profile.password_locked_until,
      });

      await admin
        .from("profiles")
        .update({
          password_attempts: next.attempts,
          password_lock_level: next.lockLevel,
          password_locked_until: next.lockedUntil,
        })
        .eq("id", profile.id);

      await logAuthEvent({
        kind: next.lockedUntil ? "password_lock" : "password_fail",
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
        error: `Invalid email or password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      };
    }

    await logAuthEvent({
      kind: "password_fail",
      email: normalizedEmail,
      ip,
      meta: { reason: "unknown_user_or_invalid" },
    });
    return { success: false, error: "Invalid email or password." };
  }

  if (profile) {
    const cleared = clearLockState();
    await admin
      .from("profiles")
      .update({
        password_attempts: cleared.attempts,
        password_lock_level: cleared.lockLevel,
        password_locked_until: cleared.lockedUntil,
      })
      .eq("id", profile.id);
  }

  await logAuthEvent({
    kind: "password_success",
    email: normalizedEmail,
    userId: profile?.id,
    ip,
  });

  // If MFA is enrolled, Supabase keeps AAL1 until verified
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal1" && aal.nextLevel === "aal2") {
    return { success: true, data: { redirectTo: "/auth/mfa" } };
  }

  const redirectTo = await getPostLoginRedirect();
  return { success: true, data: { redirectTo } };
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

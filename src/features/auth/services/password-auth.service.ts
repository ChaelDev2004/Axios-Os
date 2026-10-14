import "server-only";

import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocked, MAX_PIN_ATTEMPTS } from "@/features/auth/lib/pin.utils";
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
  getPostLoginRedirect,
  getProfileByEmail,
} from "@/features/auth/services/auth.service";

export interface AuthUserDto {
  id: string;
  email: string;
  fullName: string | null;
}

export interface AuthSessionDto {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  expiresIn: number | null;
  tokenType: string;
}

export type PasswordAuthFailureCode =
  | "validation_error"
  | "common_password"
  | "rate_limited"
  | "locked"
  | "invalid_credentials"
  | "registration_failed"
  | "auth_error";

export type PasswordAuthSuccess = {
  success: true;
  message?: string;
  data: {
    user: AuthUserDto;
    session: AuthSessionDto | null;
    requiresEmailConfirmation: boolean;
    requiresMfa: boolean;
    redirectTo: string;
  };
};

export type PasswordAuthFailure = {
  success: false;
  error: string;
  code: PasswordAuthFailureCode;
  lockedUntil?: string;
};

export type PasswordAuthResult = PasswordAuthSuccess | PasswordAuthFailure;

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function toUserDto(user: User, fullName?: string | null): AuthUserDto {
  const metaName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: fullName ?? metaName,
  };
}

function toSessionDto(session: Session | null): AuthSessionDto | null {
  if (!session) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
    expiresIn: session.expires_in ?? null,
    tokenType: session.token_type,
  };
}

export function passwordAuthHttpStatus(result: PasswordAuthResult): number {
  if (result.success) {
    return result.data.requiresEmailConfirmation ? 201 : 200;
  }

  switch (result.code) {
    case "validation_error":
    case "common_password":
    case "registration_failed":
      return 400;
    case "invalid_credentials":
      return 401;
    case "auth_error":
      return 400;
    case "rate_limited":
    case "locked":
      return 429;
  }
}

export async function registerWithPassword(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<PasswordAuthResult> {
  const { fullName, password } = input;
  const normalizedEmail = input.email.toLowerCase().trim();
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
      code: "common_password",
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
      code: "rate_limited",
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
    return {
      success: false,
      code: "registration_failed",
      error: error.message,
    };
  }

  if (!data.user) {
    return {
      success: false,
      code: "registration_failed",
      error: "Registration failed. Please try again.",
    };
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
      message: "Check your email to confirm your account, then sign in.",
      data: {
        user: toUserDto(data.user, fullName),
        session: null,
        requiresEmailConfirmation: true,
        requiresMfa: false,
        redirectTo: "/auth/login",
      },
    };
  }

  return {
    success: true,
    message: "Account created successfully.",
    data: {
      user: toUserDto(data.user, fullName),
      session: toSessionDto(data.session),
      requiresEmailConfirmation: false,
      requiresMfa: false,
      redirectTo: "/auth/setup-pin",
    },
  };
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
}): Promise<PasswordAuthResult> {
  const { password } = input;
  const normalizedEmail = input.email.toLowerCase().trim();
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
      code: "rate_limited",
      error: "Too many login attempts. Please wait and try again.",
    };
  }

  if (profile && isLocked(profile.password_locked_until)) {
    const lockedUntil = profile.password_locked_until!;
    return {
      success: false,
      code: "locked",
      error: formatLockMessage(lockedUntil),
      lockedUntil,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.user) {
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
          code: "locked",
          error: formatLockMessage(next.lockedUntil),
          lockedUntil: next.lockedUntil,
        };
      }

      const remaining = MAX_PIN_ATTEMPTS - next.attempts;
      return {
        success: false,
        code: "invalid_credentials",
        error: `Invalid email or password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      };
    }

    await logAuthEvent({
      kind: "password_fail",
      email: normalizedEmail,
      ip,
      meta: { reason: "unknown_user_or_invalid" },
    });
    return {
      success: false,
      code: "invalid_credentials",
      error: "Invalid email or password.",
    };
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
    userId: profile?.id ?? data.user.id,
    ip,
  });

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const requiresMfa =
    aal?.currentLevel === "aal1" && aal.nextLevel === "aal2";

  const redirectTo = requiresMfa ? "/auth/mfa" : await getPostLoginRedirect();

  return {
    success: true,
    data: {
      user: toUserDto(data.user, profile?.full_name),
      session: toSessionDto(data.session),
      requiresEmailConfirmation: false,
      requiresMfa,
      redirectTo,
    },
  };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import type { AuthActionResult } from "@/features/auth/types/database.types";
import { getPostLoginRedirect } from "@/features/auth/services/auth.service";
import { z } from "zod";

const totpSchema = z
  .string()
  .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app");

export async function enrollMfaAction(): Promise<
  AuthActionResult<{ factorId: string; qrCode: string; secret: string }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator app",
  });

  if (error || !data) {
    return { success: false, error: error?.message ?? "Unable to start MFA enrollment." };
  }

  return {
    success: true,
    data: {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    },
  };
}

export async function verifyMfaEnrollmentAction(
  input: unknown
): Promise<AuthActionResult> {
  const parsed = z
    .object({ factorId: z.string().min(1), code: totpSchema })
    .safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const challenge = await supabase.auth.mfa.challenge({
    factorId: parsed.data.factorId,
  });
  if (challenge.error || !challenge.data) {
    return {
      success: false,
      error: challenge.error?.message ?? "Unable to create MFA challenge.",
    };
  }

  const verified = await supabase.auth.mfa.verify({
    factorId: parsed.data.factorId,
    challengeId: challenge.data.id,
    code: parsed.data.code,
  });

  if (verified.error) {
    return { success: false, error: verified.error.message };
  }

  return { success: true, data: undefined, message: "MFA enabled." };
}

export async function verifyMfaLoginAction(
  input: unknown
): Promise<AuthActionResult<{ redirectTo: string }>> {
  const parsed = z.object({ code: totpSchema }).safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const factors = await supabase.auth.mfa.listFactors();
  const totp = factors.data?.totp?.[0];
  if (!totp) {
    return { success: false, error: "No authenticator factor found." };
  }

  const challenge = await supabase.auth.mfa.challenge({ factorId: totp.id });
  if (challenge.error || !challenge.data) {
    return {
      success: false,
      error: challenge.error?.message ?? "Unable to create MFA challenge.",
    };
  }

  const verified = await supabase.auth.mfa.verify({
    factorId: totp.id,
    challengeId: challenge.data.id,
    code: parsed.data.code,
  });

  if (verified.error) {
    return { success: false, error: verified.error.message };
  }

  const redirectTo = await getPostLoginRedirect();
  return { success: true, data: { redirectTo } };
}

export async function unenrollMfaAction(
  factorId: string
): Promise<AuthActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined, message: "MFA removed." };
}

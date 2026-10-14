import { NextResponse } from "next/server";
import type { z } from "zod";
import { apiRegisterSchema, loginSchema } from "@/features/auth/schemas/auth.schemas";
import {
  loginWithPassword,
  passwordAuthHttpStatus,
  registerWithPassword,
  type PasswordAuthResult,
} from "@/features/auth/services/password-auth.service";

export const AUTH_API_JSON_HEADERS = {
  "Cache-Control": "no-store",
} as const;

export async function readJsonBody(
  request: Request
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  try {
    const body: unknown = await request.json();
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Request body must be valid JSON." },
        { status: 400, headers: AUTH_API_JSON_HEADERS }
      ),
    };
  }
}

export function jsonAuthResponse(result: PasswordAuthResult): NextResponse {
  if (result.success) {
    return NextResponse.json(
      {
        success: true,
        message: result.message,
        data: result.data,
      },
      { status: passwordAuthHttpStatus(result), headers: AUTH_API_JSON_HEADERS }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: result.error,
      code: result.code,
      lockedUntil: result.lockedUntil,
    },
    { status: passwordAuthHttpStatus(result), headers: AUTH_API_JSON_HEADERS }
  );
}

export function parseAuthBody<T>(
  schema: z.ZodType<T>,
  body: unknown
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const parsed = schema.safeParse(body);
  if (parsed.success) return { ok: true, data: parsed.data };

  return {
    ok: false,
    response: NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
        code: "validation_error",
      },
      { status: 400, headers: AUTH_API_JSON_HEADERS }
    ),
  };
}

export function methodNotAllowed(allowed: string): NextResponse {
  return NextResponse.json(
    { success: false, error: `Method not allowed. Use ${allowed}.` },
    { status: 405, headers: { ...AUTH_API_JSON_HEADERS, Allow: allowed } }
  );
}

function serverError(message: string): NextResponse {
  return NextResponse.json(
    { success: false, error: message, code: "auth_error" },
    { status: 500, headers: AUTH_API_JSON_HEADERS }
  );
}

export function handleAuthGet() {
  return methodNotAllowed("POST");
}

export async function handleLoginPost(request: Request): Promise<NextResponse> {
  const json = await readJsonBody(request);
  if (!json.ok) return json.response;

  const parsed = parseAuthBody(loginSchema, json.body);
  if (!parsed.ok) return parsed.response;

  try {
    return jsonAuthResponse(await loginWithPassword(parsed.data));
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Login failed.");
  }
}

export async function handleSignupPost(request: Request): Promise<NextResponse> {
  const json = await readJsonBody(request);
  if (!json.ok) return json.response;

  const parsed = parseAuthBody(apiRegisterSchema, json.body);
  if (!parsed.ok) return parsed.response;

  try {
    return jsonAuthResponse(await registerWithPassword(parsed.data));
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Sign up failed.");
  }
}

import { NextResponse } from "next/server";
import type { z } from "zod";

export const API_JSON_HEADERS = {
  "Cache-Control": "no-store",
} as const;

export function jsonOk<T>(
  data: T,
  status = 200,
  message?: string
): NextResponse {
  return NextResponse.json(
    { success: true, message, data },
    { status, headers: API_JSON_HEADERS }
  );
}

export function jsonError(
  error: string,
  status: number,
  code?: string,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    { success: false, error, code, ...extra },
    { status, headers: API_JSON_HEADERS }
  );
}

export async function readJsonBody(
  request: Request
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  try {
    const body: unknown = await request.json();
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      response: jsonError("Request body must be valid JSON.", 400, "validation_error"),
    };
  }
}

export function parseJsonSchema<T>(
  schema: z.ZodType<T>,
  body: unknown
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const parsed = schema.safeParse(body);
  if (parsed.success) return { ok: true, data: parsed.data };

  return {
    ok: false,
    response: jsonError(
      parsed.error.issues[0]?.message ?? "Invalid input",
      400,
      "validation_error"
    ),
  };
}

export function methodNotAllowed(allowed: string): NextResponse {
  return NextResponse.json(
    { success: false, error: `Method not allowed. Use ${allowed}.` },
    { status: 405, headers: { ...API_JSON_HEADERS, Allow: allowed } }
  );
}

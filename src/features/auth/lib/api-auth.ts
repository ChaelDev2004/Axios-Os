import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/features/auth/types/database.types";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api-http";

export type AuthedApi = {
  user: User;
  supabase: SupabaseClient<Database>;
};

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(\S+)/i);
  return match?.[1] ?? null;
}

export async function requireApiUser(
  request: Request
): Promise<{ ok: true; auth: AuthedApi } | { ok: false; response: NextResponse }> {
  const token = bearerToken(request);

  if (token) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const supabase = createSupabaseClient<Database>(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return {
        ok: false,
        response: jsonError("Not authenticated.", 401, "unauthenticated"),
      };
    }
    return { ok: true, auth: { user, supabase } };
  }

  const supabase = await createCookieClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: jsonError("Not authenticated.", 401, "unauthenticated"),
    };
  }
  return { ok: true, auth: { user, supabase } };
}

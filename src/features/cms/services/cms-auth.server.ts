import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getRequestClientIp,
  isIpAllowedForAdmin,
  logAuthEvent,
  parseAdminIpAllowlist,
} from "@/features/auth/lib/auth-security.server";

function throwOnError(error: { message: string } | null): asserts error is null {
  if (error) {
    throw new Error(error.message);
  }
}

/** Server-side admin gate with optional IP allowlist. */
export async function requireAdminIdServer(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  if (!user) throw new Error("Not authenticated.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  throwOnError(profileError);
  if (profile?.role !== "admin") {
    throw new Error("Admin access required.");
  }

  const allowlist = parseAdminIpAllowlist();
  if (allowlist.length > 0) {
    const ip = await getRequestClientIp();
    if (!isIpAllowedForAdmin(ip, allowlist)) {
      await logAuthEvent({
        kind: "admin_ip_blocked",
        userId: user.id,
        email: user.email,
        ip,
      });
      throw new Error("Admin access is not allowed from this network.");
    }
  }

  return user.id;
}

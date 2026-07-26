import { createClient } from "@/lib/supabase/client";

function throwOnError(error: { message: string } | null): asserts error is null {
  if (error) {
    throw new Error(error.message);
  }
}

/** Client-safe admin role check (no next/headers). */
export async function requireAdminId(): Promise<string> {
  const supabase = createClient();
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

  return user.id;
}

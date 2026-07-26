import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/features/auth/types/database.types";
import {
  isIpAllowedForAdmin,
  parseAdminIpAllowlist,
} from "@/features/auth/lib/admin-ip";

const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-pin",
] as const;

const PROTECTED_ROUTES = [
  "/dashboard",
  "/auth/setup-pin",
  "/auth/reset-pin",
  "/auth/mfa",
] as const;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

type AuthLookup = {
  user: User | null;
  /** True when Auth server was unreachable and we trusted the cookie session. */
  networkUnavailable: boolean;
};

/**
 * Prefer validated getUser(); if the Auth API is unreachable (offline / DNS /
 * timeout), fall back to the JWT in cookies so protected routes keep working.
 */
async function resolveAuthUser(
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<AuthLookup> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (!error && user) {
      return { user, networkUnavailable: false };
    }
  } catch {
    // fetch failed — continue to session fallback
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      return { user: session.user, networkUnavailable: true };
    }
  } catch {
    // ignore
  }

  return { user: null, networkUnavailable: false };
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { user, networkUnavailable } = await resolveAuthUser(supabase);

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isMfaRoute = pathname.startsWith("/auth/mfa");

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Skip network-bound checks when Auth/DB cannot be reached.
  if (user && pathname.startsWith("/dashboard") && !networkUnavailable) {
    try {
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal1" && aal.nextLevel === "aal2") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/auth/mfa";
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }
    } catch {
      // MFA APIs may be unavailable; allow through
    }

    const allowlist = parseAdminIpAllowlist();
    if (allowlist.length > 0) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.role === "admin") {
          const ip = getClientIp(request);
          if (!isIpAllowedForAdmin(ip, allowlist)) {
            const redirectUrl = request.nextUrl.clone();
            redirectUrl.pathname = "/auth/login";
            redirectUrl.searchParams.set("error", "admin_ip_blocked");
            const response = NextResponse.redirect(redirectUrl);
            try {
              await supabase.auth.signOut();
            } catch {
              // ignore offline sign-out failures
            }
            return response;
          }
        }
      } catch {
        // Profile lookup failed — allow through rather than blocking the app
      }
    }
  }

  if (user && isMfaRoute && !networkUnavailable) {
    try {
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2" || aal?.nextLevel !== "aal2") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/dashboard";
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }
    } catch {
      /* ignore */
    }
  }

  return supabaseResponse;
}

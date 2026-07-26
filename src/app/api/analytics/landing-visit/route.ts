import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type VisitBody = {
  path?: string;
  referrer?: string;
  sessionId?: string;
};

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Visit tracking is not configured." },
        { status: 503 }
      );
    }

    let body: VisitBody = {};
    try {
      body = (await request.json()) as VisitBody;
    } catch {
      body = {};
    }

    const path =
      typeof body.path === "string" && body.path.trim()
        ? body.path.trim().slice(0, 200)
        : "/";
    const referrer =
      typeof body.referrer === "string" ? body.referrer.trim().slice(0, 500) : "";
    const sessionId =
      typeof body.sessionId === "string"
        ? body.sessionId.trim().slice(0, 120)
        : "";
    const userAgent = (request.headers.get("user-agent") || "").slice(0, 400);

    const supabase = createAdminClient();
    const { error } = await supabase.from("landing_page_visits").insert({
      path,
      referrer,
      session_id: sessionId,
      user_agent: userAgent,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record visit";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

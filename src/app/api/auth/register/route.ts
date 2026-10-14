import { handleAuthGet, handleSignupPost } from "@/features/auth/lib/auth-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return handleAuthGet();
}

export async function POST(request: Request) {
  return handleSignupPost(request);
}

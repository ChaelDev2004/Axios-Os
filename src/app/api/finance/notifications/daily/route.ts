import { handleCreateDailyFinanceNotification } from "@/features/finance/lib/finance-notification-http";
import { methodNotAllowed } from "@/lib/api-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleCreateDailyFinanceNotification(request);
}

export function GET() {
  return methodNotAllowed("POST");
}

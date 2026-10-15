import {
  handleGetFinanceNotification,
  handleNotificationItemMethods,
  handleUpdateFinanceNotification,
} from "@/features/finance/lib/finance-notification-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleGetFinanceNotification(request, id);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleUpdateFinanceNotification(request, id);
}

export function POST() {
  return handleNotificationItemMethods();
}

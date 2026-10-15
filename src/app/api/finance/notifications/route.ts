import {
  handleCreateFinanceNotification,
  handleListFinanceNotifications,
  handleNotificationCollectionMethods,
} from "@/features/finance/lib/finance-notification-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleListFinanceNotifications(request);
}

export async function POST(request: Request) {
  return handleCreateFinanceNotification(request);
}

export function PUT() {
  return handleNotificationCollectionMethods();
}

import { requireApiUser } from "@/features/auth/lib/api-auth";
import {
  createFinanceNotificationSchema,
  financeNotificationIdSchema,
  listFinanceNotificationsQuerySchema,
  updateFinanceNotificationSchema,
} from "@/features/finance/schemas/notification.schema";
import {
  createDailyFinanceNotification,
  createFinanceNotificationFromInput,
  getFinanceNotification,
  listFinanceNotifications,
  markAllFinanceNotificationsRead,
  markFinanceNotificationRead,
} from "@/features/finance/services/finance-notification.service";
import {
  jsonError,
  jsonOk,
  methodNotAllowed,
  parseJsonSchema,
  readJsonBody,
} from "@/lib/api-http";

function searchParamsObject(request: Request): Record<string, string> {
  const params = new URL(request.url).searchParams;
  const out: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (value !== "") out[key] = value;
  }
  return out;
}

export function handleNotificationCollectionMethods() {
  return methodNotAllowed("GET, POST");
}

export function handleNotificationItemMethods() {
  return methodNotAllowed("GET, PATCH");
}

export async function handleListFinanceNotifications(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const parsed = parseJsonSchema(
    listFinanceNotificationsQuerySchema,
    searchParamsObject(request)
  );
  if (!parsed.ok) return parsed.response;

  try {
    const { notifications, total, unreadCount } = await listFinanceNotifications(
      auth.auth.supabase,
      parsed.data
    );
    return jsonOk({
      notifications,
      unreadCount,
      pagination: {
        limit: parsed.data.limit,
        offset: parsed.data.offset,
        total,
      },
    });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to load notifications.",
      500,
      "notification_error"
    );
  }
}

export async function handleCreateFinanceNotification(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;

  const parsed = parseJsonSchema(createFinanceNotificationSchema, json.body);
  if (!parsed.ok) return parsed.response;

  try {
    const notification = await createFinanceNotificationFromInput(
      auth.auth.supabase,
      auth.auth.user.id,
      parsed.data
    );
    return jsonOk(notification, 201, "Notification created.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create notification.";
    const status = message === "Transaction not found." ? 404 : 400;
    return jsonError(
      message,
      status,
      status === 404 ? "not_found" : "validation_error"
    );
  }
}

export async function handleGetFinanceNotification(request: Request, id: string) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const parsedId = financeNotificationIdSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonError("Invalid notification id.", 400, "validation_error");
  }

  try {
    const notification = await getFinanceNotification(auth.auth.supabase, parsedId.data);
    if (!notification) return jsonError("Notification not found.", 404, "not_found");
    return jsonOk(notification);
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to load notification.",
      500,
      "notification_error"
    );
  }
}

export async function handleUpdateFinanceNotification(request: Request, id: string) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const parsedId = financeNotificationIdSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonError("Invalid notification id.", 400, "validation_error");
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;

  const parsed = parseJsonSchema(updateFinanceNotificationSchema, json.body);
  if (!parsed.ok) return parsed.response;

  try {
    const notification = await markFinanceNotificationRead(
      auth.auth.supabase,
      parsedId.data,
      parsed.data.read
    );
    if (!notification) return jsonError("Notification not found.", 404, "not_found");
    return jsonOk(notification, 200, parsed.data.read ? "Marked as read." : "Marked as unread.");
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to update notification.",
      500,
      "notification_error"
    );
  }
}

export async function handleMarkAllFinanceNotificationsRead(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  try {
    const result = await markAllFinanceNotificationsRead(auth.auth.supabase);
    return jsonOk(result, 200, "All finance notifications marked as read.");
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to mark notifications as read.",
      500,
      "notification_error"
    );
  }
}

export async function handleCreateDailyFinanceNotification(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  try {
    const result = await createDailyFinanceNotification(
      auth.auth.supabase,
      auth.auth.user.id
    );
    return jsonOk(
      result,
      result.alreadySent ? 200 : 201,
      result.alreadySent
        ? "Daily finance summary was already sent today."
        : "Daily finance summary created."
    );
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to create daily summary.",
      500,
      "notification_error"
    );
  }
}

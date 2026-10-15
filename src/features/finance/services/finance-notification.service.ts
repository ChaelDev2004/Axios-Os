import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Notification, Transaction } from "@/features/auth/types/database.types";
import {
  buildDailyFinanceNotification,
  buildTransactionNotification,
  FINANCE_NOTIFICATION_TYPES,
  isFinanceNotificationType,
  type FinanceNotificationType,
} from "@/features/finance/lib/finance-notifications";
import type {
  CreateFinanceNotificationInput,
  ListFinanceNotificationsQuery,
} from "@/features/finance/schemas/notification.schema";
import { getFinanceSummary, getTransaction } from "@/features/finance/services/finance.service";

type DbClient = SupabaseClient<Database>;

function startOfUtcDayIso(date = new Date()): string {
  return `${date.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

export async function listFinanceNotifications(
  supabase: DbClient,
  filters: ListFinanceNotificationsQuery
): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
  const types = filters.type ? [filters.type] : [...FINANCE_NOTIFICATION_TYPES];

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .in("type", types)
    .order("created_at", { ascending: false });

  if (filters.unread === true) query = query.eq("read", false);
  if (filters.unread === false) query = query.eq("read", true);

  const to = filters.offset + filters.limit - 1;
  const [{ data, error, count }, unread] = await Promise.all([
    query.range(filters.offset, to),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .in("type", types)
      .eq("read", false),
  ]);

  if (error) throw new Error(error.message);

  return {
    notifications: data ?? [],
    total: count ?? 0,
    unreadCount: unread.count ?? 0,
  };
}

export async function getFinanceNotification(
  supabase: DbClient,
  id: string
): Promise<Notification | null> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || !isFinanceNotificationType(data.type)) return null;
  return data;
}

export async function insertFinanceNotification(
  supabase: DbClient,
  userId: string,
  input: {
    title: string;
    message: string;
    type: FinanceNotificationType;
  }
): Promise<Notification> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      title: input.title,
      message: input.message,
      type: input.type,
      read: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function notifyFinanceTransaction(
  supabase: DbClient,
  userId: string,
  tx: Transaction
): Promise<Notification | null> {
  try {
    const payload = buildTransactionNotification(tx);
    return await insertFinanceNotification(supabase, userId, payload);
  } catch {
    return null;
  }
}

export async function getTodaysDailyFinanceNotification(
  supabase: DbClient
): Promise<Notification | null> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("type", "finance_daily")
    .gte("created_at", startOfUtcDayIso())
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function createDailyFinanceNotification(
  supabase: DbClient,
  userId: string
): Promise<{ notification: Notification; alreadySent: boolean }> {
  const existing = await getTodaysDailyFinanceNotification(supabase);
  if (existing) return { notification: existing, alreadySent: true };

  const summary = await getFinanceSummary(supabase, {});
  const payload = buildDailyFinanceNotification(summary);
  const notification = await insertFinanceNotification(supabase, userId, payload);
  return { notification, alreadySent: false };
}

export async function createFinanceNotificationFromInput(
  supabase: DbClient,
  userId: string,
  input: CreateFinanceNotificationInput
): Promise<Notification> {
  if (input.transactionId) {
    const tx = await getTransaction(supabase, input.transactionId);
    if (!tx) throw new Error("Transaction not found.");
    const payload = buildTransactionNotification(tx);
    return insertFinanceNotification(supabase, userId, {
      title: input.title ?? payload.title,
      message: input.message ?? payload.message,
      type: input.type && input.type !== "finance_daily" ? input.type : payload.type,
    });
  }

  if (input.type === "finance_daily" && (!input.title || !input.message)) {
    const created = await createDailyFinanceNotification(supabase, userId);
    return created.notification;
  }

  if (!input.title || !input.message) {
    throw new Error("Provide title, message, and type.");
  }

  return insertFinanceNotification(supabase, userId, {
    title: input.title,
    message: input.message,
    type: input.type ?? "finance_reminder",
  });
}

export async function markFinanceNotificationRead(
  supabase: DbClient,
  id: string,
  read: boolean
): Promise<Notification | null> {
  const existing = await getFinanceNotification(supabase, id);
  if (!existing) return null;

  const { data, error } = await supabase
    .from("notifications")
    .update({ read })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function markAllFinanceNotificationsRead(
  supabase: DbClient
): Promise<{ updated: number }> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false)
    .in("type", [...FINANCE_NOTIFICATION_TYPES])
    .select("id");

  if (error) throw new Error(error.message);
  return { updated: data?.length ?? 0 };
}

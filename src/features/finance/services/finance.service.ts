import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Transaction } from "@/features/auth/types/database.types";
import {
  balance,
  groupCashflowByDay,
  monthlyExpense,
  monthlyIncome,
  sumExpense,
  sumIncome,
} from "@/features/dashboard/lib/analytics";
import { CATEGORY_META } from "@/features/finance/lib/categories-data";
import type {
  CreateTransactionInput,
  FinanceSummaryQuery,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from "@/features/finance/schemas/transaction.schema";

type DbClient = SupabaseClient<Database>;

export const RECEIPT_BUCKET = "receipts";
export const RECEIPT_SIGNED_URL_TTL_SECONDS = 60 * 60;
export const RECEIPT_MAX_STORAGE_BYTES = 2 * 1024 * 1024;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isOwnedReceiptPath(userId: string, path: string | null | undefined): boolean {
  if (!path) return true;
  return path.startsWith(`${userId}/`) && !path.includes("..");
}

async function removeReceipt(supabase: DbClient, path: string | null | undefined) {
  if (!path) return;
  try {
    await supabase.storage.from(RECEIPT_BUCKET).remove([path]);
  } catch {
    /* orphaned receipt images must not block finance mutations */
  }
}

export async function listTransactions(
  supabase: DbClient,
  filters: ListTransactionsQuery
): Promise<{ transactions: Transaction[]; total: number }> {
  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.from) query = query.gte("transaction_date", filters.from);
  if (filters.to) query = query.lte("transaction_date", filters.to);
  if (filters.category) query = query.eq("category", filters.category);

  const to = filters.offset + filters.limit - 1;
  const { data, error, count } = await query.range(filters.offset, to);
  if (error) throw new Error(error.message);

  return { transactions: data ?? [], total: count ?? 0 };
}

export async function getTransaction(
  supabase: DbClient,
  id: string
): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function createTransactionRecord(
  supabase: DbClient,
  userId: string,
  input: CreateTransactionInput
): Promise<Transaction> {
  if (!isOwnedReceiptPath(userId, input.receipt_image_path)) {
    throw new Error("Invalid receipt image path.");
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      type: input.type,
      amount: input.amount,
      category: input.category,
      description: input.description ?? null,
      transaction_date: input.transaction_date ?? todayIso(),
      merchant: input.merchant ?? null,
      payment_method: input.payment_method ?? null,
      scan_source: input.scan_source ?? "manual",
      receipt_image_path: input.receipt_image_path ?? null,
      ocr_text: input.ocr_text ?? null,
      ocr_confidence: input.ocr_confidence ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { notifyFinanceTransaction } = await import(
    "@/features/finance/services/finance-notification.service"
  );
  void notifyFinanceTransaction(supabase, userId, data);

  return data;
}

export async function updateTransactionRecord(
  supabase: DbClient,
  userId: string,
  id: string,
  input: UpdateTransactionInput
): Promise<Transaction | null> {
  if (input.receipt_image_path !== undefined && !isOwnedReceiptPath(userId, input.receipt_image_path)) {
    throw new Error("Invalid receipt image path.");
  }

  const existing = await getTransaction(supabase, id);
  if (!existing) return null;

  const { data, error } = await supabase
    .from("transactions")
    .update({
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.transaction_date !== undefined
        ? { transaction_date: input.transaction_date }
        : {}),
      ...(input.merchant !== undefined ? { merchant: input.merchant } : {}),
      ...(input.payment_method !== undefined
        ? { payment_method: input.payment_method }
        : {}),
      ...(input.scan_source !== undefined ? { scan_source: input.scan_source } : {}),
      ...(input.receipt_image_path !== undefined
        ? { receipt_image_path: input.receipt_image_path }
        : {}),
      ...(input.ocr_text !== undefined ? { ocr_text: input.ocr_text } : {}),
      ...(input.ocr_confidence !== undefined
        ? { ocr_confidence: input.ocr_confidence }
        : {}),
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  if (
    input.receipt_image_path !== undefined &&
    existing.receipt_image_path &&
    existing.receipt_image_path !== input.receipt_image_path
  ) {
    await removeReceipt(supabase, existing.receipt_image_path);
  }

  return data;
}

export async function deleteTransactionRecord(
  supabase: DbClient,
  id: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .select("receipt_image_path");

  if (error) throw new Error(error.message);
  if (!data?.length) return false;

  await removeReceipt(supabase, data[0]?.receipt_image_path);
  return true;
}

export async function getFinanceSummary(
  supabase: DbClient,
  filters: FinanceSummaryQuery
) {
  let query = supabase.from("transactions").select("*");
  if (filters.from) query = query.gte("transaction_date", filters.from);
  if (filters.to) query = query.lte("transaction_date", filters.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const transactions = data ?? [];
  const income = sumIncome(transactions);
  const expense = sumExpense(transactions);

  return {
    income,
    expense,
    balance: balance(transactions),
    savings: Math.max(0, income - expense),
    monthlyIncome: monthlyIncome(transactions),
    monthlyExpense: monthlyExpense(transactions),
    cashflowByDay: groupCashflowByDay(transactions, 7),
    count: transactions.length,
  };
}

export function listFinanceCategories() {
  return CATEGORY_META;
}

export async function uploadReceiptBytes(
  supabase: DbClient,
  userId: string,
  bytes: Uint8Array,
  contentType: string
): Promise<string> {
  if (bytes.byteLength <= 0) throw new Error("Receipt image is empty.");
  if (bytes.byteLength > RECEIPT_MAX_STORAGE_BYTES) {
    throw new Error("Receipt image is too large to upload.");
  }

  const fileId = crypto.randomUUID();
  const path = `${userId}/${fileId}.jpg`;
  const { error } = await supabase.storage.from(RECEIPT_BUCKET).upload(path, Buffer.from(bytes), {
    cacheControl: "3600",
    upsert: false,
    contentType: contentType || "image/jpeg",
  });
  if (error) throw new Error("Could not upload the receipt image.");
  return path;
}

export async function getTransactionReceiptUrl(
  supabase: DbClient,
  id: string
): Promise<{ path: string; url: string } | null> {
  const transaction = await getTransaction(supabase, id);
  if (!transaction?.receipt_image_path) return null;

  const { data, error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(transaction.receipt_image_path, RECEIPT_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error("Could not load the receipt image.");
  }

  return { path: transaction.receipt_image_path, url: data.signedUrl };
}

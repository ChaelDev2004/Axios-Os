import type { TransactionType } from "@/features/auth/types/database.types";
import { requireApiUser } from "@/features/auth/lib/api-auth";
import { firstCategoryFor } from "@/features/finance/lib/categories-data";
import {
  createFinanceEntrySchema,
  createTransactionSchema,
  financeSummaryQuerySchema,
  listTransactionsQuerySchema,
  listTypedTransactionsQuerySchema,
  transactionIdSchema,
  updateFinanceEntrySchema,
  updateTransactionSchema,
  type CreateFinanceEntryInput,
  type CreateTransactionInput,
  type UpdateFinanceEntryInput,
  type UpdateTransactionInput,
} from "@/features/finance/schemas/transaction.schema";
import {
  createTransactionRecord,
  deleteTransactionRecord,
  getFinanceSummary,
  getTransaction,
  getTransactionReceiptUrl,
  listFinanceCategories,
  listTransactions,
  updateTransactionRecord,
} from "@/features/finance/services/finance.service";
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

function isInvalidReceiptPath(message: string): boolean {
  return message === "Invalid receipt image path.";
}

export function handleFinanceCollectionGetMethods() {
  return methodNotAllowed("GET, POST");
}

export function handleFinanceItemGetMethods() {
  return methodNotAllowed("GET, PATCH, DELETE");
}

function toCreateInput(
  type: TransactionType,
  data: CreateFinanceEntryInput
): CreateTransactionInput {
  const notes =
    data.notes !== undefined ? data.notes.trim() || null : undefined;
  return {
    type,
    amount: data.amount,
    category: data.category ?? firstCategoryFor(type),
    description: data.description ?? notes ?? null,
    transaction_date: data.transaction_date ?? data.date,
    merchant: data.merchant,
    payment_method: data.payment_method,
    scan_source: data.scan_source ?? "manual",
    receipt_image_path: data.receipt_image_path,
    ocr_text: data.ocr_text,
    ocr_confidence: data.ocr_confidence,
  };
}

function toUpdateInput(data: UpdateFinanceEntryInput): UpdateTransactionInput {
  const notes =
    data.notes !== undefined ? data.notes.trim() || null : undefined;
  return {
    amount: data.amount,
    category: data.category,
    description: data.description ?? notes,
    transaction_date: data.transaction_date ?? data.date,
    merchant: data.merchant,
    payment_method: data.payment_method,
    scan_source: data.scan_source,
    receipt_image_path: data.receipt_image_path,
    ocr_text: data.ocr_text,
    ocr_confidence: data.ocr_confidence,
  };
}

export async function handleListTransactions(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const parsed = parseJsonSchema(listTransactionsQuerySchema, searchParamsObject(request));
  if (!parsed.ok) return parsed.response;

  try {
    const { transactions, total } = await listTransactions(auth.auth.supabase, parsed.data);
    return jsonOk({
      transactions,
      pagination: {
        limit: parsed.data.limit,
        offset: parsed.data.offset,
        total,
      },
    });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to load transactions.",
      500,
      "finance_error"
    );
  }
}

export async function handleCreateTransaction(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;

  const parsed = parseJsonSchema(createTransactionSchema, json.body);
  if (!parsed.ok) return parsed.response;

  try {
    const transaction = await createTransactionRecord(
      auth.auth.supabase,
      auth.auth.user.id,
      parsed.data
    );
    return jsonOk(transaction, 201, "Transaction created.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create transaction.";
    return jsonError(
      message,
      isInvalidReceiptPath(message) ? 400 : 500,
      isInvalidReceiptPath(message) ? "validation_error" : "finance_error"
    );
  }
}

export async function handleGetTransaction(request: Request, id: string) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const parsedId = transactionIdSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonError("Invalid transaction id.", 400, "validation_error");
  }

  try {
    const transaction = await getTransaction(auth.auth.supabase, parsedId.data);
    if (!transaction) return jsonError("Transaction not found.", 404, "not_found");
    return jsonOk(transaction);
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to load transaction.",
      500,
      "finance_error"
    );
  }
}

export async function handleUpdateTransaction(request: Request, id: string) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const parsedId = transactionIdSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonError("Invalid transaction id.", 400, "validation_error");
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;

  const parsed = parseJsonSchema(updateTransactionSchema, json.body);
  if (!parsed.ok) return parsed.response;

  try {
    const transaction = await updateTransactionRecord(
      auth.auth.supabase,
      auth.auth.user.id,
      parsedId.data,
      parsed.data
    );
    if (!transaction) return jsonError("Transaction not found.", 404, "not_found");
    return jsonOk(transaction, 200, "Transaction updated.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update transaction.";
    return jsonError(
      message,
      isInvalidReceiptPath(message) ? 400 : 500,
      isInvalidReceiptPath(message) ? "validation_error" : "finance_error"
    );
  }
}

export async function handleDeleteTransaction(request: Request, id: string) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const parsedId = transactionIdSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonError("Invalid transaction id.", 400, "validation_error");
  }

  try {
    const deleted = await deleteTransactionRecord(auth.auth.supabase, parsedId.data);
    if (!deleted) return jsonError("Transaction not found.", 404, "not_found");
    return jsonOk({ id: parsedId.data }, 200, "Transaction deleted.");
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to delete transaction.",
      500,
      "finance_error"
    );
  }
}

export async function handleFinanceSummary(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const parsed = parseJsonSchema(financeSummaryQuerySchema, searchParamsObject(request));
  if (!parsed.ok) return parsed.response;

  try {
    const summary = await getFinanceSummary(auth.auth.supabase, parsed.data);
    return jsonOk(summary);
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to load finance summary.",
      500,
      "finance_error"
    );
  }
}

export async function handleFinanceCategories(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  return jsonOk({ categories: listFinanceCategories() });
}

export async function handleListTypedTransactions(
  request: Request,
  type: TransactionType
) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const parsed = parseJsonSchema(
    listTypedTransactionsQuerySchema,
    searchParamsObject(request)
  );
  if (!parsed.ok) return parsed.response;

  try {
    const { transactions, total } = await listTransactions(auth.auth.supabase, {
      ...parsed.data,
      type,
    });
    return jsonOk({
      transactions,
      pagination: {
        limit: parsed.data.limit,
        offset: parsed.data.offset,
        total,
      },
    });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to load transactions.",
      500,
      "finance_error"
    );
  }
}

export async function handleCreateTypedTransaction(
  request: Request,
  type: TransactionType
) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;

  const parsed = parseJsonSchema(createFinanceEntrySchema, json.body);
  if (!parsed.ok) return parsed.response;

  try {
    const transaction = await createTransactionRecord(
      auth.auth.supabase,
      auth.auth.user.id,
      toCreateInput(type, parsed.data)
    );
    return jsonOk(
      transaction,
      201,
      type === "expense" ? "Expense added." : "Income added."
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save entry.";
    return jsonError(
      message,
      isInvalidReceiptPath(message) ? 400 : 500,
      isInvalidReceiptPath(message) ? "validation_error" : "finance_error"
    );
  }
}

export async function handleGetTypedTransaction(
  request: Request,
  id: string,
  type: TransactionType
) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const parsedId = transactionIdSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonError("Invalid transaction id.", 400, "validation_error");
  }

  try {
    const transaction = await getTransaction(auth.auth.supabase, parsedId.data);
    if (!transaction || transaction.type !== type) {
      return jsonError(
        type === "expense" ? "Expense not found." : "Income not found.",
        404,
        "not_found"
      );
    }
    return jsonOk(transaction);
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to load entry.",
      500,
      "finance_error"
    );
  }
}

export async function handleUpdateTypedTransaction(
  request: Request,
  id: string,
  type: TransactionType
) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const parsedId = transactionIdSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonError("Invalid transaction id.", 400, "validation_error");
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;

  const parsed = parseJsonSchema(updateFinanceEntrySchema, json.body);
  if (!parsed.ok) return parsed.response;

  try {
    const existing = await getTransaction(auth.auth.supabase, parsedId.data);
    if (!existing || existing.type !== type) {
      return jsonError(
        type === "expense" ? "Expense not found." : "Income not found.",
        404,
        "not_found"
      );
    }

    const transaction = await updateTransactionRecord(
      auth.auth.supabase,
      auth.auth.user.id,
      parsedId.data,
      toUpdateInput(parsed.data)
    );
    if (!transaction) {
      return jsonError(
        type === "expense" ? "Expense not found." : "Income not found.",
        404,
        "not_found"
      );
    }
    return jsonOk(
      transaction,
      200,
      type === "expense" ? "Expense updated." : "Income updated."
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update entry.";
    return jsonError(
      message,
      isInvalidReceiptPath(message) ? 400 : 500,
      isInvalidReceiptPath(message) ? "validation_error" : "finance_error"
    );
  }
}

export async function handleDeleteTypedTransaction(
  request: Request,
  id: string,
  type: TransactionType
) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const parsedId = transactionIdSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonError("Invalid transaction id.", 400, "validation_error");
  }

  try {
    const existing = await getTransaction(auth.auth.supabase, parsedId.data);
    if (!existing || existing.type !== type) {
      return jsonError(
        type === "expense" ? "Expense not found." : "Income not found.",
        404,
        "not_found"
      );
    }

    const deleted = await deleteTransactionRecord(auth.auth.supabase, parsedId.data);
    if (!deleted) {
      return jsonError(
        type === "expense" ? "Expense not found." : "Income not found.",
        404,
        "not_found"
      );
    }
    return jsonOk(
      { id: parsedId.data },
      200,
      type === "expense" ? "Expense deleted." : "Income deleted."
    );
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to delete entry.",
      500,
      "finance_error"
    );
  }
}

export async function handleFinanceOverview(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const parsed = parseJsonSchema(financeSummaryQuerySchema, searchParamsObject(request));
  if (!parsed.ok) return parsed.response;

  try {
    const [summary, expenses, income] = await Promise.all([
      getFinanceSummary(auth.auth.supabase, parsed.data),
      listTransactions(auth.auth.supabase, {
        type: "expense",
        from: parsed.data.from,
        to: parsed.data.to,
        limit: 10,
        offset: 0,
      }),
      listTransactions(auth.auth.supabase, {
        type: "income",
        from: parsed.data.from,
        to: parsed.data.to,
        limit: 10,
        offset: 0,
      }),
    ]);

    return jsonOk({
      summary,
      recentExpenses: expenses.transactions,
      recentIncome: income.transactions,
      categories: listFinanceCategories(),
    });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to load finance data.",
      500,
      "finance_error"
    );
  }
}

export async function handleTransactionReceipt(request: Request, id: string) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const parsedId = transactionIdSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonError("Invalid transaction id.", 400, "validation_error");
  }

  try {
    const receipt = await getTransactionReceiptUrl(auth.auth.supabase, parsedId.data);
    if (!receipt) return jsonError("Receipt image not found.", 404, "not_found");
    return jsonOk(receipt);
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to load receipt image.",
      500,
      "finance_error"
    );
  }
}

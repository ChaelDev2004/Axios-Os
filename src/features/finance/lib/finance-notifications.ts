import type { Transaction } from "@/features/auth/types/database.types";
import { formatPhp } from "@/features/dashboard/lib/format";

export const FINANCE_NOTIFICATION_TYPES = [
  "finance_income",
  "finance_expense",
  "finance_daily",
  "finance_reminder",
] as const;

export type FinanceNotificationType = (typeof FINANCE_NOTIFICATION_TYPES)[number];

export function isFinanceNotificationType(
  value: string | null | undefined
): value is FinanceNotificationType {
  return FINANCE_NOTIFICATION_TYPES.includes(value as FinanceNotificationType);
}

export function buildTransactionNotification(tx: Transaction): {
  title: string;
  message: string;
  type: Extract<FinanceNotificationType, "finance_income" | "finance_expense">;
} {
  const amountLabel = formatPhp(Number(tx.amount) || 0);
  const category = tx.category?.trim() || "Uncategorized";
  const isIncome = tx.type === "income";

  return {
    title: isIncome ? "Income added" : "Expense added",
    message: isIncome
      ? `+${amountLabel} logged under ${category}.`
      : `−${amountLabel} logged under ${category}.`,
    type: isIncome ? "finance_income" : "finance_expense",
  };
}

export function buildDailyFinanceNotification(input: {
  income: number;
  expense: number;
  balance: number;
}): {
  title: string;
  message: string;
  type: Extract<FinanceNotificationType, "finance_daily">;
} {
  const savings = Math.max(0, input.income - input.expense);
  return {
    title: "Daily finance summary",
    message: `Cash balance ${formatPhp(input.balance)} · Income ${formatPhp(input.income)} · Savings ${formatPhp(savings)}`,
    type: "finance_daily",
  };
}

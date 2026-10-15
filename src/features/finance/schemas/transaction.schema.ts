import { z } from "zod";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/features/auth/types/database.types";
import { MAX_TRANSACTION_AMOUNT } from "@/features/finance/schemas/receipt-scan.schema";

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as [
  PaymentMethod,
  ...PaymentMethod[],
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const transactionIdSchema = z.string().uuid("Invalid transaction id");

const amountSchema = z
  .union([z.number(), z.string()])
  .transform((value, ctx) => {
    const raw = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
    if (!Number.isFinite(raw) || raw <= 0) {
      ctx.addIssue({ code: "custom", message: "Amount must be greater than 0" });
      return z.NEVER;
    }
    if (raw > MAX_TRANSACTION_AMOUNT) {
      ctx.addIssue({ code: "custom", message: "Amount is too large" });
      return z.NEVER;
    }
    return Math.round(raw * 100) / 100;
  });

const nullableText = (max: number, label: string) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value == null) return null;
      const trimmed = value.trim();
      return trimmed ? trimmed.slice(0, max) : null;
    })
    .refine((value) => value === null || value.length <= max, {
      message: `${label} must be ${max} characters or less`,
    });

export const createTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: amountSchema,
  category: z.string().trim().min(1, "Pick a category").max(60),
  description: nullableText(500, "Description"),
  transaction_date: z
    .string()
    .regex(ISO_DATE, "Date must be YYYY-MM-DD")
    .optional(),
  merchant: nullableText(120, "Merchant"),
  payment_method: z.enum(PAYMENT_METHODS).nullable().optional(),
  scan_source: z.enum(["manual", "scanner"]).optional(),
  receipt_image_path: z.string().trim().max(500).nullable().optional(),
  ocr_text: z.string().max(20_000).nullable().optional(),
  ocr_confidence: z.number().min(0).max(100).nullable().optional(),
});

export const createFinanceEntrySchema = createTransactionSchema
  .omit({ type: true })
  .extend({
    category: z.string().trim().min(1).max(60).optional(),
    date: z.string().regex(ISO_DATE, "Date must be YYYY-MM-DD").optional(),
    notes: z.string().trim().max(500).optional(),
  });

export const updateFinanceEntrySchema = createFinanceEntrySchema
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update",
  });

export const updateTransactionSchema = createTransactionSchema
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update",
  });

export const listTransactionsQuerySchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
  from: z.string().regex(ISO_DATE, "from must be YYYY-MM-DD").optional(),
  to: z.string().regex(ISO_DATE, "to must be YYYY-MM-DD").optional(),
  category: z.string().trim().min(1).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const listTypedTransactionsQuerySchema = listTransactionsQuerySchema.omit({
  type: true,
});

export const financeSummaryQuerySchema = z.object({
  from: z.string().regex(ISO_DATE, "from must be YYYY-MM-DD").optional(),
  to: z.string().regex(ISO_DATE, "to must be YYYY-MM-DD").optional(),
});

export type CreateTransactionInput = z.output<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.output<typeof updateTransactionSchema>;
export type CreateFinanceEntryInput = z.output<typeof createFinanceEntrySchema>;
export type UpdateFinanceEntryInput = z.output<typeof updateFinanceEntrySchema>;
export type ListTransactionsQuery = z.output<typeof listTransactionsQuerySchema>;
export type FinanceSummaryQuery = z.output<typeof financeSummaryQuerySchema>;

import { z } from "zod";

import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/features/auth/types/database.types";

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as [PaymentMethod, ...PaymentMethod[]];

export const MAX_TRANSACTION_AMOUNT = 999_999_999_999.99;

export const receiptScanSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Enter an amount")
    .transform((value) => Number(value.replace(/,/g, "")))
    .pipe(
      z
        .number({ error: "Enter a valid amount" })
        .finite("Enter a valid amount")
        .positive("Amount must be greater than 0")
        .max(MAX_TRANSACTION_AMOUNT, "Amount is too large")
        .transform((value) => Math.round(value * 100) / 100)
    ),
  type: z.enum(["income", "expense"]),
  category: z.string().trim().min(1, "Pick a category").max(60),
  merchant: z
    .string()
    .trim()
    .max(120, "Merchant must be 120 characters or less")
    .transform((value) => value || null),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must be 500 characters or less")
    .transform((value) => value || null),
});

export type ReceiptScanFormInput = z.input<typeof receiptScanSchema>;
export type ReceiptScanFormValues = z.output<typeof receiptScanSchema>;

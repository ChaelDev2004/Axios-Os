import { z } from "zod";
import { createTransactionSchema } from "@/features/finance/schemas/transaction.schema";

export const scannerSaveFieldsSchema = createTransactionSchema
  .omit({
    scan_source: true,
    receipt_image_path: true,
    ocr_text: true,
    ocr_confidence: true,
  })
  .partial()
  .extend({
    notes: z.string().trim().max(500).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
      .optional(),
    paymentMethod: z
      .enum(["cash", "card", "gcash", "maya", "bank_transfer", "other"])
      .nullable()
      .optional(),
    attachImage: z.boolean().optional(),
  });

export const scannerJsonSchema = scannerSaveFieldsSchema.extend({
  imageBase64: z.string().min(1, "Receipt image is required"),
  mimeType: z.string().trim().optional(),
  save: z.boolean().optional(),
});

export type ScannerSaveFields = z.output<typeof scannerSaveFieldsSchema>;
export type ScannerJsonInput = z.output<typeof scannerJsonSchema>;

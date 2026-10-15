import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Transaction } from "@/features/auth/types/database.types";
import type { OcrResult } from "@/features/finance/lib/receipt-ocr";
import { recognizeReceiptImage } from "@/features/finance/lib/receipt-ocr.server";
import { parseReceipt, type ParsedReceipt } from "@/features/finance/lib/receipt-parser";
import { buildScanWarnings } from "@/features/finance/lib/scan-warnings";
import type { ScannerSaveFields } from "@/features/finance/schemas/scanner.schema";
import {
  createTransactionRecord,
  RECEIPT_MAX_STORAGE_BYTES,
  uploadReceiptBytes,
} from "@/features/finance/services/finance.service";

const MIN_TEXT_LENGTH = 8;
const MAX_OCR_TEXT = 20_000;
export const SCANNER_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

type DbClient = SupabaseClient<Database>;

export type ScannerErrorCode =
  | "unsupported_file"
  | "too_large"
  | "no_text"
  | "no_amount"
  | "scan_failed";

export class ScannerError extends Error {
  constructor(
    public code: ScannerErrorCode,
    message: string,
    public scan: ScannerScanResult | null = null
  ) {
    super(message);
    this.name = "ScannerError";
  }
}

export interface ScannerScanResult {
  parsed: ParsedReceipt;
  ocr: OcrResult;
  warnings: string[];
  suggested: {
    type: ParsedReceipt["type"];
    amount: number | null;
    category: string;
    merchant: string | null;
    transaction_date: string;
    payment_method: "cash";
    description: string | null;
  };
}

function inferMimeType(fileName: string, type: string): string {
  if (type && type !== "application/octet-stream") return type.toLowerCase();
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";
  return type.toLowerCase();
}

function defaultNotes(category: string, merchant: string | null): string | null {
  return merchant ? `${category} from ${merchant}` : null;
}

export function toScannerResult(ocr: OcrResult, parsed: ParsedReceipt): ScannerScanResult {
  return {
    parsed,
    ocr: {
      ...ocr,
      text: ocr.text.slice(0, MAX_OCR_TEXT),
    },
    warnings: buildScanWarnings({
      parsed,
      ocrConfidence: ocr.confidence,
    }),
    suggested: {
      type: parsed.type,
      amount: parsed.amount,
      category: parsed.category,
      merchant: parsed.merchant,
      transaction_date: parsed.date,
      payment_method: "cash",
      description: defaultNotes(parsed.category, parsed.merchant),
    },
  };
}

export async function scanReceiptImage(input: {
  bytes: Uint8Array;
  fileName?: string;
  mimeType?: string;
}): Promise<ScannerScanResult> {
  const mimeType = inferMimeType(input.fileName ?? "", input.mimeType ?? "");
  if (mimeType && !ALLOWED_TYPES.has(mimeType)) {
    throw new ScannerError(
      "unsupported_file",
      "Choose a photo of your receipt (JPG, PNG, WebP or HEIC)."
    );
  }
  if (input.bytes.byteLength > SCANNER_MAX_UPLOAD_BYTES) {
    throw new ScannerError("too_large", "Choose a photo smaller than 25 MB.");
  }
  if (input.bytes.byteLength <= 0) {
    throw new ScannerError("unsupported_file", "Receipt image is empty.");
  }

  let ocr: OcrResult;
  try {
    ocr = await recognizeReceiptImage(input.bytes);
  } catch (err) {
    throw new ScannerError(
      "scan_failed",
      err instanceof Error ? err.message : "Something went wrong while reading the receipt."
    );
  }

  if (ocr.text.replace(/\s/g, "").length < MIN_TEXT_LENGTH) {
    throw new ScannerError(
      "no_text",
      "We couldn't read any text. Make sure the whole receipt is inside the frame and in focus."
    );
  }

  const parsed = parseReceipt(ocr.text, ocr.lines, ocr.confidence);
  const scan = toScannerResult(ocr, parsed);

  if (parsed.amount === null) {
    throw new ScannerError(
      "no_amount",
      "Unable to detect a clear total amount. Please retake the photo with the receipt fully visible.",
      scan
    );
  }

  return scan;
}

export async function saveScannedTransaction(input: {
  supabase: DbClient;
  userId: string;
  bytes: Uint8Array;
  mimeType?: string;
  fileName?: string;
  fields: ScannerSaveFields;
}): Promise<{ transaction: Transaction; scan: ScannerScanResult; imageAttached: boolean }> {
  const scan = await scanReceiptImage({
    bytes: input.bytes,
    mimeType: input.mimeType,
    fileName: input.fileName,
  }).catch((err) => {
    if (err instanceof ScannerError && err.code === "no_amount" && err.scan) {
      return err.scan;
    }
    throw err;
  });

  const amount = input.fields.amount ?? scan.suggested.amount;
  if (amount == null) {
    throw new ScannerError(
      "no_amount",
      "Unable to detect a clear total amount. Provide amount to save.",
      scan
    );
  }

  const type = input.fields.type ?? scan.suggested.type;
  const category = input.fields.category ?? scan.suggested.category;
  const merchant =
    input.fields.merchant !== undefined ? input.fields.merchant : scan.suggested.merchant;
  const description =
    input.fields.description !== undefined
      ? input.fields.description
      : input.fields.notes !== undefined
        ? input.fields.notes.trim() || null
        : scan.suggested.description;
  const transactionDate =
    input.fields.transaction_date ?? input.fields.date ?? scan.suggested.transaction_date;
  const paymentMethod =
    input.fields.payment_method !== undefined
      ? input.fields.payment_method
      : input.fields.paymentMethod !== undefined
        ? input.fields.paymentMethod
        : scan.suggested.payment_method;

  const attachImage = input.fields.attachImage !== false;
  let receiptPath: string | null = null;
  const warnings = [...scan.warnings];

  if (attachImage) {
    try {
      if (input.bytes.byteLength > RECEIPT_MAX_STORAGE_BYTES) {
        warnings.push("The receipt image is too large to store. The transaction was saved without it.");
      } else {
        receiptPath = await uploadReceiptBytes(
          input.supabase,
          input.userId,
          input.bytes,
          input.mimeType || "image/jpeg"
        );
      }
    } catch {
      warnings.push("The receipt image couldn't be uploaded. The transaction was saved without it.");
    }
  }

  const transaction = await createTransactionRecord(input.supabase, input.userId, {
    type,
    amount,
    category,
    description,
    transaction_date: transactionDate,
    merchant,
    payment_method: paymentMethod,
    scan_source: "scanner",
    receipt_image_path: receiptPath,
    ocr_text: scan.ocr.text,
    ocr_confidence: scan.parsed.confidence,
  });

  return {
    transaction,
    scan: { ...scan, warnings },
    imageAttached: Boolean(receiptPath),
  };
}

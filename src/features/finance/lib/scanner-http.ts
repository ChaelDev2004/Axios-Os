import { requireApiUser } from "@/features/auth/lib/api-auth";
import {
  scannerJsonSchema,
  scannerSaveFieldsSchema,
  type ScannerSaveFields,
} from "@/features/finance/schemas/scanner.schema";
import {
  saveScannedTransaction,
  scanReceiptImage,
  ScannerError,
  SCANNER_MAX_UPLOAD_BYTES,
} from "@/features/finance/services/scanner.service";
import {
  jsonError,
  jsonOk,
  methodNotAllowed,
  parseJsonSchema,
  readJsonBody,
} from "@/lib/api-http";

function scannerStatus(code: ScannerError["code"]): number {
  if (code === "scan_failed") return 500;
  if (code === "no_text" || code === "no_amount") return 422;
  return 400;
}

function scannerErrorResponse(err: unknown) {
  if (err instanceof ScannerError) {
    return jsonError(err.message, scannerStatus(err.code), err.code, {
      data: err.scan,
    });
  }
  return jsonError(
    err instanceof Error ? err.message : "Something went wrong while reading the receipt.",
    500,
    "scan_failed"
  );
}

function decodeImageBase64(value: string): Uint8Array {
  const trimmed = value.trim();
  const comma = trimmed.indexOf(",");
  const payload =
    trimmed.startsWith("data:") && comma !== -1 ? trimmed.slice(comma + 1) : trimmed;
  return new Uint8Array(Buffer.from(payload, "base64"));
}

function formBoolean(value: FormDataEntryValue | null): boolean | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function formString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function fieldsFromForm(form: FormData): unknown {
  const fields: Record<string, unknown> = {
    type: formString(form.get("type")),
    amount: formString(form.get("amount")),
    category: formString(form.get("category")),
    description: formString(form.get("description")),
    notes: formString(form.get("notes")),
    transaction_date: formString(form.get("transaction_date")) ?? formString(form.get("date")),
    date: formString(form.get("date")),
    merchant: form.get("merchant") === "" ? null : formString(form.get("merchant")),
    payment_method:
      formString(form.get("payment_method")) ?? formString(form.get("paymentMethod")),
    paymentMethod: formString(form.get("paymentMethod")),
    attachImage: formBoolean(form.get("attachImage")),
  };

  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  );
}

function getFormImage(form: FormData): File | null {
  const value = form.get("image") ?? form.get("file") ?? form.get("receipt");
  return value instanceof File ? value : null;
}

async function readScannerRequest(request: Request): Promise<
  | {
      ok: true;
      bytes: Uint8Array;
      mimeType: string;
      fileName: string;
      save: boolean;
      fields: ScannerSaveFields;
    }
  | { ok: false; response: ReturnType<typeof jsonError> }
> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return {
        ok: false,
        response: jsonError("Could not read the uploaded receipt.", 400, "validation_error"),
      };
    }

    const file = getFormImage(form);
    if (!file) {
      return {
        ok: false,
        response: jsonError(
          "Upload a receipt image as `image` (multipart/form-data).",
          400,
          "validation_error"
        ),
      };
    }
    if (file.size > SCANNER_MAX_UPLOAD_BYTES) {
      return {
        ok: false,
        response: jsonError("Choose a photo smaller than 25 MB.", 400, "too_large"),
      };
    }

    const parsedFields = parseJsonSchema(scannerSaveFieldsSchema, fieldsFromForm(form));
    if (!parsedFields.ok) return parsedFields;

    return {
      ok: true,
      bytes: new Uint8Array(await file.arrayBuffer()),
      mimeType: file.type,
      fileName: file.name,
      save: formBoolean(form.get("save")) === true,
      fields: parsedFields.data,
    };
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json;

  const parsed = parseJsonSchema(scannerJsonSchema, json.body);
  if (!parsed.ok) return parsed;

  const bytes = decodeImageBase64(parsed.data.imageBase64);
  if (bytes.byteLength > SCANNER_MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      response: jsonError("Choose a photo smaller than 25 MB.", 400, "too_large"),
    };
  }

  return {
    ok: true,
    bytes,
    mimeType: parsed.data.mimeType ?? "image/jpeg",
    fileName: "receipt",
    save: parsed.data.save === true,
    fields: parsed.data,
  };
}

export function handleScannerGet() {
  return methodNotAllowed("POST");
}

export async function handleScanReceipt(request: Request, forceSave = false) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const payload = await readScannerRequest(request);
  if (!payload.ok) return payload.response;

  const shouldSave = forceSave || payload.save;

  try {
    if (!shouldSave) {
      const scan = await scanReceiptImage({
        bytes: payload.bytes,
        mimeType: payload.mimeType,
        fileName: payload.fileName,
      });
      return jsonOk(scan, 200, "Receipt scanned.");
    }

    const saved = await saveScannedTransaction({
      supabase: auth.auth.supabase,
      userId: auth.auth.user.id,
      bytes: payload.bytes,
      mimeType: payload.mimeType,
      fileName: payload.fileName,
      fields: payload.fields,
    });

    return jsonOk(
      {
        transaction: saved.transaction,
        scan: saved.scan,
        imageAttached: saved.imageAttached,
      },
      201,
      "Scanned transaction saved."
    );
  } catch (err) {
    return scannerErrorResponse(err);
  }
}

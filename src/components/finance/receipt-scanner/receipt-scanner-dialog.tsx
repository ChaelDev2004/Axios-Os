"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { useLatestCallback } from "@/hooks/use-latest-callback";
import { CameraCapture } from "@/components/finance/receipt-scanner/camera-capture";
import { ScanError } from "@/components/finance/receipt-scanner/scan-error";
import { ScanProcessing } from "@/components/finance/receipt-scanner/scan-processing";
import { ScanResultForm } from "@/components/finance/receipt-scanner/scan-result-form";
import { ScanSuccess } from "@/components/finance/receipt-scanner/scan-success";
import { useReceiptScanner } from "@/components/finance/receipt-scanner/use-receipt-scanner";
import { compressForStorage } from "@/features/finance/lib/receipt-image";
import type { ReceiptScanFormValues } from "@/features/finance/schemas/receipt-scan.schema";
import {
  removeReceiptImage,
  uploadReceiptImage,
} from "@/features/finance/services/receipt-storage.service";
import { useConnectivityStore } from "@/features/offline/stores/connectivity.store";
import type { Database, Transaction } from "@/features/auth/types/database.types";

export type ScannedTransactionInput = Omit<
  Database["public"]["Tables"]["transactions"]["Insert"],
  "user_id" | "id"
>;

interface ReceiptScannerDialogProps {
  onClose: () => void;
  onSave: (input: ScannedTransactionInput) => Promise<Transaction>;
}

const MAX_OCR_TEXT = 20_000;

export function ReceiptScannerDialog({ onClose, onSave }: ReceiptScannerDialogProps) {
  const scanner = useReceiptScanner();
  const isOnline = useConnectivityStore((s) => s.online);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const requestClose = useLatestCallback(() => {
    if (!isSavingRef.current) onClose();
  });

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [requestClose]);

  async function save(values: ReceiptScanFormValues, shouldAttachImage: boolean) {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);

    let receiptPath: string | null = null;
    try {
      if (shouldAttachImage && scanner.image) {
        try {
          const compressed = await compressForStorage(scanner.image.blob, scanner.image.crop);
          receiptPath = await uploadReceiptImage(compressed);
        } catch {
          toast.warning("The receipt image couldn't be uploaded. Saving the transaction without it.");
        }
      }

      const transaction = await onSave({
        type: values.type,
        amount: values.amount,
        category: values.category,
        description: values.notes,
        transaction_date: values.date,
        merchant: values.merchant,
        payment_method: values.paymentMethod,
        scan_source: scanner.ocr ? "scanner" : "manual",
        receipt_image_path: receiptPath,
        ocr_text: scanner.ocr ? scanner.ocr.text.slice(0, MAX_OCR_TEXT) : null,
        ocr_confidence: scanner.parsed ? scanner.parsed.confidence : null,
      });
      scanner.complete(transaction);
    } catch {
      void removeReceiptImage(receiptPath);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Scan receipt"
      tabIndex={-1}
      className="fixed inset-0 z-[80] flex flex-col bg-black text-white outline-none"
      style={{ height: "100dvh" }}
    >
      {scanner.step === "camera" ? (
        <CameraCapture onCapture={scanner.processImage} onClose={onClose} onManual={scanner.enterManually} />
      ) : null}

      {scanner.step === "processing" ? (
        <ScanProcessing previewUrl={scanner.image?.previewUrl ?? null} label={scanner.processingLabel} />
      ) : null}

      {scanner.step === "error" && scanner.error ? (
        <ScanError
          error={scanner.error}
          previewUrl={scanner.image?.previewUrl ?? null}
          onClose={onClose}
          onRetake={scanner.retake}
          onManual={scanner.enterManually}
        />
      ) : null}

      {scanner.step === "result" || scanner.step === "manual" ? (
        <div className="h-full bg-[color-mix(in_srgb,var(--background)_94%,#0f1220)] text-foreground">
          <ScanResultForm
            key={scanner.scanId}
            previewUrl={scanner.step === "result" ? scanner.image?.previewUrl ?? null : null}
            parsed={scanner.step === "result" ? scanner.parsed : null}
            warnings={scanner.step === "result" ? scanner.warnings : []}
            isOnline={isOnline}
            isSaving={isSaving}
            onBack={() => !isSaving && onClose()}
            onRetake={scanner.retake}
            onSubmit={(values, shouldAttachImage) => void save(values, shouldAttachImage)}
          />
        </div>
      ) : null}

      {scanner.step === "success" && scanner.saved ? (
        <ScanSuccess transaction={scanner.saved} onDone={onClose} />
      ) : null}
    </div>,
    document.body
  );
}

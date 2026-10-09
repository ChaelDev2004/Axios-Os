"use client";

import { useEffect, useRef, useState } from "react";

import { preprocessForOcr, type CropRect, type ImageQuality } from "@/features/finance/lib/receipt-image";
import { recognizeReceipt, terminateOcr, type OcrResult } from "@/features/finance/lib/receipt-ocr";
import { parseReceipt, type ParsedReceipt } from "@/features/finance/lib/receipt-parser";
import type { Transaction } from "@/features/auth/types/database.types";

export type ScannerStep = "camera" | "processing" | "result" | "error" | "manual" | "success";

export interface CapturedImage {
  blob: Blob;
  previewUrl: string;
  crop?: CropRect;
}

export interface ScanError {
  title: string;
  message: string;
}

const MIN_TEXT_LENGTH = 8;
const LOW_CONFIDENCE = 60;
const DETECTED_PAUSE_MS = 450;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function qualityHint(quality: ImageQuality): string | null {
  if (quality.isTooDark) return "The photo looks too dark. Turn on the flash or move to better light.";
  if (quality.isTooBright) return "The photo looks too bright. Avoid glare and direct light on the receipt.";
  if (quality.isBlurry) return "The photo looks blurry. Hold the phone steady and tap to focus.";
  return null;
}

function buildWarnings(parsed: ParsedReceipt, ocr: OcrResult, quality: ImageQuality): string[] {
  const warnings: string[] = [];
  const hint = qualityHint(quality);
  if (hint) warnings.push(hint);
  if (parsed.confidence < LOW_CONFIDENCE || ocr.confidence < LOW_CONFIDENCE) {
    warnings.push("Low scan confidence. Please double-check the detected details.");
  }
  if (parsed.alternatives.length) {
    warnings.push("Multiple possible totals were found. Pick the correct amount below.");
  }
  if (parsed.currency !== "PHP") {
    warnings.push(`The receipt appears to be in ${parsed.currency}. Amounts are saved in PHP.`);
  }
  if (!parsed.isDateDetected) warnings.push("No date was found, so today's date is used.");
  return warnings;
}

export function useReceiptScanner() {
  const [step, setStep] = useState<ScannerStep>("camera");
  const [image, setImage] = useState<CapturedImage | null>(null);
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<ScanError | null>(null);
  const [processingLabel, setProcessingLabel] = useState("Scanning receipt...");
  const [saved, setSaved] = useState<Transaction | null>(null);
  const [scanId, setScanId] = useState(0);
  const runRef = useRef(0);
  const previewRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      runRef.current++;
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      void terminateOcr();
    },
    []
  );

  function replaceImage(next: CapturedImage | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next?.previewUrl ?? null;
    setImage(next);
  }

  function fail(title: string, message: string) {
    setError({ title, message });
    setStep("error");
  }

  async function processImage(blob: Blob, crop?: CropRect) {
    if (blob.type && !blob.type.startsWith("image/")) {
      fail("Unsupported file", "Choose a photo of your receipt (JPG, PNG, WebP or HEIC).");
      return;
    }
    if (blob.size > MAX_UPLOAD_BYTES) {
      fail("Photo too large", "Choose a photo smaller than 25 MB.");
      return;
    }

    const run = ++runRef.current;
    replaceImage({ blob, previewUrl: URL.createObjectURL(blob), crop });
    setOcr(null);
    setParsed(null);
    setWarnings([]);
    setError(null);
    setProcessingLabel("Scanning receipt...");
    setStep("processing");

    try {
      const prepared = await preprocessForOcr(blob, crop);
      if (run !== runRef.current) return;
      const result = await recognizeReceipt(prepared.canvas);
      if (run !== runRef.current) return;

      const hint = qualityHint(prepared.quality);
      if (result.text.replace(/\s/g, "").length < MIN_TEXT_LENGTH) {
        fail("No text detected", hint ?? "We couldn't read any text. Make sure the whole receipt is inside the frame and in focus.");
        return;
      }

      const receipt = parseReceipt(result.text, result.lines, result.confidence);
      setOcr(result);
      setParsed(receipt);
      setWarnings(buildWarnings(receipt, result, prepared.quality));

      if (receipt.amount === null) {
        fail(
          "No amount detected",
          "Unable to detect a clear total amount. Please retake the photo with the receipt fully visible."
        );
        return;
      }

      setProcessingLabel("Amount detected");
      await wait(DETECTED_PAUSE_MS);
      if (run !== runRef.current) return;
      setScanId((id) => id + 1);
      setStep("result");
    } catch (e) {
      if (run !== runRef.current) return;
      fail("Scan failed", e instanceof Error ? e.message : "Something went wrong while reading the receipt.");
    }
  }

  function retake() {
    runRef.current++;
    replaceImage(null);
    setOcr(null);
    setParsed(null);
    setWarnings([]);
    setError(null);
    setStep("camera");
  }

  function enterManually() {
    runRef.current++;
    setScanId((id) => id + 1);
    setStep(image ? "result" : "manual");
  }

  function complete(tx: Transaction) {
    setSaved(tx);
    setStep("success");
  }

  return {
    step,
    image,
    ocr,
    parsed,
    warnings,
    error,
    processingLabel,
    saved,
    scanId,
    processImage,
    retake,
    enterManually,
    complete,
  };
}

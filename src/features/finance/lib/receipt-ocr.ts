import type { Worker } from "tesseract.js";

import { rotateCanvas180 } from "@/features/finance/lib/receipt-image";

export interface OcrResult {
  text: string;
  lines: string[];
  confidence: number;
}

const LOW_CONFIDENCE = 50;

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, PSM } = await import("tesseract.js");
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_COLUMN,
        preserve_interword_spaces: "1",
      });
      return worker;
    })().catch((error: unknown) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

async function recognize(worker: Worker, canvas: HTMLCanvasElement): Promise<OcrResult> {
  const { data } = await worker.recognize(canvas, { rotateAuto: true });
  const text = data.text ?? "";
  return {
    text,
    lines: text
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean),
    confidence: Math.max(0, Math.min(100, data.confidence ?? 0)),
  };
}

export async function recognizeReceipt(canvas: HTMLCanvasElement): Promise<OcrResult> {
  let worker: Worker;
  try {
    worker = await getWorker();
  } catch {
    throw new Error(
      "The text scanner could not be loaded. Check your internet connection for the first scan, or enter the amount manually."
    );
  }

  const first = await recognize(worker, canvas);
  if (first.confidence >= LOW_CONFIDENCE) return first;

  const flipped = await recognize(worker, rotateCanvas180(canvas));
  return flipped.confidence > first.confidence ? flipped : first;
}

export async function terminateOcr(): Promise<void> {
  const pending = workerPromise;
  workerPromise = null;
  if (!pending) return;
  try {
    await (await pending).terminate();
  } catch {
    /* worker already gone */
  }
}

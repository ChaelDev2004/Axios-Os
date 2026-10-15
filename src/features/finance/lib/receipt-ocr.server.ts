import "server-only";

import type { OcrResult } from "@/features/finance/lib/receipt-ocr";

type TesseractWorker = Awaited<ReturnType<typeof import("tesseract.js").createWorker>>;

let workerPromise: Promise<TesseractWorker> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function getWorker(): Promise<TesseractWorker> {
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

function toOcrResult(text: string, confidence: number): OcrResult {
  return {
    text,
    lines: text
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean),
    confidence: Math.max(0, Math.min(100, confidence)),
  };
}

export async function recognizeReceiptImage(bytes: Uint8Array): Promise<OcrResult> {
  try {
    return await enqueue(async () => {
      const worker = await getWorker();
      const { data } = await worker.recognize(Buffer.from(bytes), { rotateAuto: true });
      return toOcrResult(data.text ?? "", data.confidence ?? 0);
    });
  } catch {
    throw new Error(
      "The text scanner could not be loaded. Check your internet connection for the first scan, or enter the amount manually."
    );
  }
}

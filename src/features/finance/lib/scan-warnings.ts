import type { ParsedReceipt } from "@/features/finance/lib/receipt-parser";

const LOW_CONFIDENCE = 60;

export function buildScanWarnings(input: {
  parsed: ParsedReceipt;
  ocrConfidence: number;
}): string[] {
  const warnings: string[] = [];
  if (input.parsed.confidence < LOW_CONFIDENCE || input.ocrConfidence < LOW_CONFIDENCE) {
    warnings.push("Low scan confidence. Please double-check the detected details.");
  }
  if (input.parsed.alternatives.length) {
    warnings.push("Multiple possible totals were found. Pick the correct amount below.");
  }
  if (input.parsed.currency !== "PHP") {
    warnings.push(
      `The receipt appears to be in ${input.parsed.currency}. Amounts are saved in PHP.`
    );
  }
  if (!input.parsed.isDateDetected) {
    warnings.push("No date was found, so today's date is used.");
  }
  return warnings;
}

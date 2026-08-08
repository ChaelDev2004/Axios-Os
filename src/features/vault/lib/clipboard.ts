import { toast } from "sonner";

const DEFAULT_CLEAR_MS = 45_000;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Copy a value securely. Never include the secret in toast text.
 * Optionally clears the clipboard after a delay.
 */
export async function copySecure(
  value: string,
  label: string,
  options?: { clearAfterMs?: number | null }
): Promise<void> {
  if (!value) {
    toast.error(`Nothing to copy`);
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
  } catch {
    toast.error("Could not copy to clipboard");
    return;
  }

  toast.success(`${label} copied`);

  const clearAfter =
    options?.clearAfterMs === undefined ? DEFAULT_CLEAR_MS : options.clearAfterMs;

  if (clearAfter == null || clearAfter <= 0) return;

  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    void navigator.clipboard.writeText("").catch(() => {
      /* ignore */
    });
  }, clearAfter);
}

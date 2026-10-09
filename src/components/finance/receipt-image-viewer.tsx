"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";

import { useLatestCallback } from "@/hooks/use-latest-callback";
import { getReceiptImageUrl } from "@/features/finance/services/receipt-storage.service";

interface ReceiptImageViewerProps {
  path: string;
  onClose: () => void;
}

const SIGNED_URL_STALE_MS = 50 * 60 * 1000;

export function ReceiptImageViewer({ path, onClose }: ReceiptImageViewerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { data: url, isLoading, isError } = useQuery({
    queryKey: ["receipt-image", path],
    queryFn: () => getReceiptImageUrl(path),
    staleTime: SIGNED_URL_STALE_MS,
    retry: 1,
  });

  const close = useLatestCallback(onClose);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus?.();
    };
  }, [close]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Receipt image"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close receipt"
        className="absolute right-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
        style={{ top: "max(16px, env(safe-area-inset-top))" }}
      >
        <X className="size-5" />
      </button>
      {isLoading ? (
        <Loader2 className="size-8 animate-spin text-white motion-reduce:animate-none" aria-label="Loading receipt" />
      ) : isError || !url ? (
        <p className="text-sm text-white/80" role="alert">
          The receipt image could not be loaded.
        </p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed storage URL
        <img src={url} alt="Receipt" className="max-h-[85dvh] max-w-full rounded-xl object-contain" />
      )}
    </div>,
    document.body
  );
}

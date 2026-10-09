"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

interface ScanProcessingProps {
  previewUrl: string | null;
  label: string;
}

export function ScanProcessing({ previewUrl, label }: ScanProcessingProps) {
  const prefersReducedMotion = useReducedMotion();
  const isDetected = label === "Amount detected";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-black px-6 text-white">
      <div className="relative w-[min(72vw,340px)] overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img src={previewUrl} alt="Captured receipt" className="block max-h-[56vh] w-full object-contain" />
        ) : (
          <div className="aspect-[3/4]" />
        )}
        {!isDetected && !prefersReducedMotion ? (
          <motion.span
            aria-hidden
            className="absolute inset-x-0 h-0.5 bg-indigo-400"
            style={{ boxShadow: "0 0 16px 4px rgba(129,140,248,0.6)" }}
            initial={{ top: "0%" }}
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
          />
        ) : null}
      </div>
      <motion.p
        key={label}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 text-base font-medium"
        role="status"
        aria-live="polite"
      >
        {isDetected ? (
          <CheckCircle2 className="size-5 text-emerald-400" aria-hidden />
        ) : (
          <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
        )}
        {label}
      </motion.p>
    </div>
  );
}

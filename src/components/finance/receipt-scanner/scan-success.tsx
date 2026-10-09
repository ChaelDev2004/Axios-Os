"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { useLatestCallback } from "@/hooks/use-latest-callback";
import { formatPhp } from "@/features/dashboard/lib/format";
import type { Transaction } from "@/features/auth/types/database.types";

interface ScanSuccessProps {
  transaction: Transaction;
  onDone: () => void;
}

const AUTO_CLOSE_MS = 1600;

export function ScanSuccess({ transaction, onDone }: ScanSuccessProps) {
  const prefersReducedMotion = useReducedMotion();

  const finish = useLatestCallback(onDone);

  useEffect(() => {
    const timer = setTimeout(finish, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [finish]);

  const typeLabel = transaction.type === "income" ? "Income" : "Expense";

  return (
    <button
      type="button"
      onClick={onDone}
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-black px-6! text-center text-white focus-visible:outline-none"
      aria-label="Transaction added. Return to dashboard"
    >
      <motion.span
        initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <CheckCircle2 className="size-16 text-emerald-400" aria-hidden />
      </motion.span>
      <p className="mt-2! text-lg font-semibold" role="status">
        Transaction Added
      </p>
      <p className="text-3xl font-semibold tabular-nums">{formatPhp(Number(transaction.amount))}</p>
      {transaction.merchant ? <p className="text-base text-white/80">{transaction.merchant}</p> : null}
      <p className="text-sm text-white/60">
        {typeLabel}
        {transaction.category ? ` · ${transaction.category}` : ""}
      </p>
    </button>
  );
}

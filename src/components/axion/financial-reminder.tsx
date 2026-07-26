"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  useCreateNotification,
  useTransactions,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import {
  balance,
  sumExpense,
  sumIncome,
} from "@/features/dashboard/lib/analytics";
import { formatPhp } from "@/features/dashboard/lib/format";
import type { Transaction } from "@/features/auth/types/database.types";
import { APP_LOGO_URL } from "@/lib/site-branding-defaults";

const FIRST_DELAY_MS = 45 * 1000;
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const DAILY_KEY_PREFIX = "axion-financial-daily-";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function dailyStorageKey(day = todayKey()) {
  return `${DAILY_KEY_PREFIX}${day}`;
}

function wasDailySummarySent(day = todayKey()) {
  try {
    return localStorage.getItem(dailyStorageKey(day)) === "1";
  } catch {
    return false;
  }
}

function markDailySummarySent(day = todayKey()) {
  try {
    localStorage.setItem(dailyStorageKey(day), "1");
  } catch {
    /* ignore */
  }
}

function buildDailySummary(transactions: Transaction[]) {
  const income = sumIncome(transactions);
  const expense = sumExpense(transactions);
  const cashBalance = balance(transactions);
  const savings = Math.max(0, income - expense);

  return {
    title: "Daily finance summary",
    message: `Cash balance ${formatPhp(cashBalance)} · Income ${formatPhp(income)} · Savings ${formatPhp(savings)}`,
    cashBalance,
    income,
    savings,
    expense,
  };
}

function ensureBrowserNotifyPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

function showBrowserNotify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: APP_LOGO_URL,
      tag: "axion-financial-daily",
    });
  } catch {
    /* ignore */
  }
}

/**
 * Once per day while the dashboard is open, sends a finance summary
 * with cash balance, income, and savings (browser + in-app notification).
 */
export function FinancialReminder() {
  const { data: transactions = [] } = useTransactions();
  const createNotification = useCreateNotification();
  const transactionsRef = useRef(transactions);
  const createRef = useRef(createNotification);

  transactionsRef.current = transactions;
  createRef.current = createNotification;

  useEffect(() => {
    ensureBrowserNotifyPermission();

    const pushDailySummary = async () => {
      const day = todayKey();
      if (wasDailySummarySent(day)) return;

      const summary = buildDailySummary(transactionsRef.current);
      markDailySummarySent(day);
      showBrowserNotify(summary.title, summary.message);
      toast.message(summary.title, { description: summary.message });

      try {
        await createRef.current.mutateAsync({
          title: summary.title,
          message: summary.message,
          type: "finance_daily",
          read: false,
        });
      } catch {
        /* non-blocking */
      }
    };

    const firstTimer = window.setTimeout(() => {
      void pushDailySummary();
    }, FIRST_DELAY_MS);

    const intervalId = window.setInterval(() => {
      void pushDailySummary();
    }, CHECK_INTERVAL_MS);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}

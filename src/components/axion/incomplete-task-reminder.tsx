"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  useCreateNotification,
  useTasks,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import { taskColumn } from "@/components/axion/views/shared";
import type { Task } from "@/features/auth/types/database.types";
import { APP_LOGO_URL } from "@/lib/site-branding-defaults";

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const FIRST_DELAY_MS = 60 * 1000; // first nudge after 1 minute on dashboard
const STORAGE_KEY = "axion-incomplete-task-reminder-at";

function isIncomplete(task: Task) {
  return taskColumn(task) !== "done";
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
      tag: "axion-incomplete-tasks",
    });
  } catch {
    /* ignore */
  }
}

function canSendNow() {
  try {
    const last = Number(localStorage.getItem(STORAGE_KEY) ?? "0");
    if (!Number.isFinite(last) || last <= 0) return true;
    return Date.now() - last >= INTERVAL_MS;
  } catch {
    return true;
  }
}

function markSent() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * While the dashboard is open, reminds the user every 30 minutes
 * if they still have incomplete tasks (browser + in-app notification).
 */
export function IncompleteTaskReminder() {
  const { data: tasks = [] } = useTasks();
  const createNotification = useCreateNotification();
  const tasksRef = useRef(tasks);
  const createRef = useRef(createNotification);

  tasksRef.current = tasks;
  createRef.current = createNotification;

  useEffect(() => {
    ensureBrowserNotifyPermission();

    const pushReminder = async () => {
      const incomplete = tasksRef.current.filter(isIncomplete);
      if (incomplete.length === 0) return;
      if (!canSendNow()) return;

      const count = incomplete.length;
      const sample = incomplete
        .slice(0, 3)
        .map((t) => t.title)
        .join(", ");
      const title = "Incomplete tasks reminder";
      const message =
        count === 1
          ? `You still have 1 open task: ${incomplete[0]?.title ?? "Untitled"}`
          : `You have ${count} incomplete tasks${sample ? ` — ${sample}${count > 3 ? "…" : ""}` : ""}.`;

      markSent();
      showBrowserNotify(title, message);
      toast.message(title, { description: message });

      try {
        await createRef.current.mutateAsync({
          title,
          message,
          type: "task_reminder",
          read: false,
        });
      } catch {
        /* non-blocking */
      }
    };

    const firstTimer = window.setTimeout(() => {
      void pushReminder();
    }, FIRST_DELAY_MS);

    const intervalId = window.setInterval(() => {
      void pushReminder();
    }, INTERVAL_MS);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}

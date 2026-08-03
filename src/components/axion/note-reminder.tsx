"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  useCreateNotification,
  useNotes,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import type { Note } from "@/features/auth/types/database.types";
import { APP_LOGO_URL } from "@/lib/site-branding-defaults";

const FIRST_DELAY_MS = 20 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;
const STORAGE_PREFIX = "axion-note-reminder-";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function parseRemindTime(time: string | null | undefined): number {
  const raw = (time ?? "09:00").trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!match) return 9 * 60;
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  return h * 60 + m;
}

function storageKey(noteId: string, day = todayKey()) {
  return `${STORAGE_PREFIX}${noteId}-${day}`;
}

function wasSent(noteId: string, day = todayKey()) {
  try {
    return localStorage.getItem(storageKey(noteId, day)) === "1";
  } catch {
    return false;
  }
}

function markSent(noteId: string, day = todayKey()) {
  try {
    localStorage.setItem(storageKey(noteId, day), "1");
  } catch {
    /* ignore */
  }
}

function ensureBrowserNotifyPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

function showBrowserNotify(title: string, body: string, tag: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: APP_LOGO_URL,
      tag,
      requireInteraction: true,
    });
  } catch {
    /* ignore */
  }
}

function isDueToday(note: Note, weekday: number, minutesNow: number): boolean {
  if (!note.remind_enabled) return false;
  if (note.remind_weekday != null && note.remind_weekday !== weekday) return false;
  return minutesNow >= parseRemindTime(note.remind_time);
}

function snippet(body: string | null): string {
  const text = (body ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "Open Axion Notes for details.";
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

/**
 * While the dashboard is open, fires forced browser + in-app notifications
 * for notes with remind_enabled on the matching weekday/time (once per day).
 */
export function NoteReminder() {
  const { data: notes = [] } = useNotes();
  const createNotification = useCreateNotification();
  const notesRef = useRef(notes);
  const createRef = useRef(createNotification);

  notesRef.current = notes;
  createRef.current = createNotification;

  useEffect(() => {
    ensureBrowserNotifyPermission();

    const pushDueReminders = async () => {
      const weekday = new Date().getDay();
      const minutesNow = nowMinutes();
      const day = todayKey();
      const due = notesRef.current.filter((n) => isDueToday(n, weekday, minutesNow));

      for (const note of due) {
        if (wasSent(note.id, day)) continue;

        const title = `Note reminder · ${note.title}`;
        const message = snippet(note.body);

        markSent(note.id, day);
        showBrowserNotify(title, message, `axion-note-${note.id}`);
        toast.message(title, { description: message });

        try {
          await createRef.current.mutateAsync({
            title,
            message,
            type: "note_reminder",
            read: false,
          });
        } catch {
          /* non-blocking */
        }
      }
    };

    const firstTimer = window.setTimeout(() => {
      void pushDueReminders();
    }, FIRST_DELAY_MS);

    const intervalId = window.setInterval(() => {
      void pushDueReminders();
    }, CHECK_INTERVAL_MS);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}

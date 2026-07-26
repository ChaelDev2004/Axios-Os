"use client";

import { useEffect } from "react";

const SESSION_KEY = "axios-landing-visit-session";
const SENT_KEY = "axios-landing-visit-sent";

function getOrCreateSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `s-${Date.now()}`;
  }
}

/** One record per browser tab session (avoids refresh spam; new visits still count). */
function shouldRecordVisit(): boolean {
  try {
    if (window.sessionStorage.getItem(SENT_KEY) === "1") return false;
    window.sessionStorage.setItem(SENT_KEY, "1");
    return true;
  } catch {
    return true;
  }
}

/** Records a public landing-page visit for admin dashboard analytics. */
export function LandingVisitTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!shouldRecordVisit()) return;

    const sessionId = getOrCreateSessionId();
    const payload = {
      path: window.location.pathname || "/",
      referrer: document.referrer || "",
      sessionId,
    };

    void fetch("/api/analytics/landing-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* ignore analytics failures */
    });
  }, []);

  return null;
}

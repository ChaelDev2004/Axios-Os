"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Sparkles, X } from "lucide-react";
import { useTheme } from "next-themes";

import {
  getDailyQuote,
  markDailyReminderSeen,
  wasDailyReminderSeen,
  type MotivationalQuote,
} from "@/lib/motivational-quotes";

export function DailyReminderAlert() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState<MotivationalQuote | null>(null);

  const isDark = resolvedTheme !== "light";
  const colors = isDark
    ? {
        surface: "#0b0e16",
        text: "#fafafa",
        muted: "#a1a1aa",
        faint: "#71717a",
        border: "rgba(255,255,255,0.1)",
        panel: "rgba(255,255,255,0.03)",
        closeBg: "rgba(255,255,255,0.05)",
      }
    : {
        surface: "#ffffff",
        text: "#0f172a",
        muted: "#475569",
        faint: "#64748b",
        border: "rgba(15,23,42,0.14)",
        panel: "rgba(15,23,42,0.035)",
        closeBg: "rgba(15,23,42,0.04)",
      };

  const s: Record<string, CSSProperties> = {
    overlay: {
      position: "fixed",
      inset: 0,
      zIndex: 10040,
      background: "rgba(5,6,10,0.7)",
      backdropFilter: "blur(12px)",
      border: "none",
      padding: 0,
      cursor: "default",
    },
    wrap: {
      pointerEvents: "none",
      position: "fixed",
      inset: 0,
      zIndex: 10050,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    dialog: {
      position: "relative",
      pointerEvents: "auto",
      display: "flex",
      maxHeight: "calc(100dvh - 2rem)",
      width: "100%",
      maxWidth: "min(36rem, 94vw)",
      flexDirection: "column",
      overflow: "hidden",
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: colors.border,
      background: colors.surface,
      color: colors.text,
      boxShadow: "0 28px 90px rgba(0,0,0,0.65)",
    },
    glow: {
      pointerEvents: "none",
      position: "absolute",
      insetInline: 0,
      top: 0,
      height: 112,
      background:
        "radial-gradient(ellipse at top, rgba(251,191,36,0.2), transparent 70%)",
    },
    header: {
      position: "relative",
      display: "flex",
      flexShrink: 0,
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
      borderBottomWidth: 1,
      borderBottomStyle: "solid",
      borderBottomColor: colors.border,
      padding: "20px 28px",
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      borderRadius: "9999px",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "rgba(251,191,36,0.25)",
      background: "rgba(245,158,11,0.1)",
      padding: "4px 10px",
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.16em",
      color: isDark ? "#fde68a" : "#b45309",
      textTransform: "uppercase",
    },
    title: {
      marginTop: 12,
      fontSize: 22,
      lineHeight: 1.2,
      fontWeight: 600,
      letterSpacing: "-0.01em",
      color: colors.text,
    },
    subtitle: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 1.6,
      color: colors.muted,
    },
    closeBtn: {
      display: "flex",
      height: 36,
      width: 36,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "9999px",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: colors.border,
      background: colors.closeBg,
      color: colors.muted,
      cursor: "pointer",
    },
    body: {
      position: "relative",
      minHeight: 0,
      flex: 1,
      overflowY: "auto",
      padding: "20px 28px",
    },
    quoteCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: colors.border,
      background: colors.panel,
      padding: 24,
    },
    quoteIcon: {
      marginBottom: 16,
      height: 20,
      width: 20,
      color: isDark ? "rgba(252,211,77,0.8)" : "#d97706",
    },
    blockquote: {
      margin: 0,
      overflowWrap: "break-word",
      fontSize: 18,
      lineHeight: 1.75,
      fontWeight: 500,
      color: colors.text,
    },
    author: {
      marginTop: 16,
      fontSize: 15,
      lineHeight: 1.5,
      fontWeight: 600,
      color: isDark ? "rgba(253,230,138,0.9)" : "#b45309",
    },
    attribution: {
      marginTop: 16,
      fontSize: 12,
      lineHeight: 1.4,
      color: colors.faint,
    },
    link: {
      color: colors.muted,
      textUnderlineOffset: 2,
    },
    footer: {
      position: "relative",
      display: "flex",
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "flex-end",
      borderTopWidth: 1,
      borderTopStyle: "solid",
      borderTopColor: colors.border,
      padding: "16px 28px",
    },
    ctaBtn: {
      display: "inline-flex",
      height: 44,
      minWidth: 112,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "9999px",
      background: "#f59e0b",
      padding: "0 24px",
      fontSize: 14,
      fontWeight: 600,
      whiteSpace: "nowrap",
      color: "#09090b",
      border: "none",
      cursor: "pointer",
    },
  };

  useEffect(() => {
    setMounted(true);
    if (wasDailyReminderSeen()) return;

    const timer = window.setTimeout(() => {
      setQuote(getDailyQuote());
      setOpen(true);
    }, 700);

    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    markDailyReminderSeen();
    setOpen(false);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && quote ? (
        <>
          <motion.button
            type="button"
            aria-label="Dismiss daily reminder"
            style={s.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
          />
          <div style={s.wrap}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="daily-reminder-title"
              style={s.dialog}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <div style={s.glow} aria-hidden />

              <div style={s.header}>
                <div style={{ minWidth: 0 }}>
                  <div style={s.badge}>
                    <Flame style={{ height: 12, width: 12 }} />
                    Daily reminder
                  </div>
                  <h2 id="daily-reminder-title" style={s.title}>
                    Your spark for today
                  </h2>
                  <p style={s.subtitle}>A fresh motivational quote each day.</p>
                </div>
                <button type="button" onClick={dismiss} style={s.closeBtn}>
                  <X style={{ height: 16, width: 16 }} />
                </button>
              </div>

              <div style={s.body}>
                <div style={s.quoteCard}>
                  <Sparkles style={s.quoteIcon} />
                  <blockquote style={s.blockquote}>“{quote.text}”</blockquote>
                  <p style={s.author}>— {quote.author}</p>
                </div>

                <p style={s.attribution}>
                  Quotes curated from{" "}
                  <a
                    href="https://www.futurefit.co.uk/blog/gym-motivational-quotes/"
                    target="_blank"
                    rel="noreferrer"
                    style={s.link}
                  >
                    Future Fit motivational gym quotes
                  </a>
                  .
                </p>
              </div>

              <div style={s.footer}>
                <button type="button" onClick={dismiss} style={s.ctaBtn}>
                  Let&apos;s go
                </button>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

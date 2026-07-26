"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Mic, MicOff, Radio, Search, Trash2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateAiInsightAction } from "@/features/dashboard/actions/dashboard.actions";
import {
  useAiConversations,
  useDeleteAiConversation,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import { dashboardKeys } from "@/features/dashboard/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/axion/views/empty-state";

const SUGGESTIONS = [
  "Daily Summary",
  "Plan my day",
  "Suggest next task",
  "Write project update",
];

const GLOW = "#22d3ee";

/* Minimal ambient typing for the Web Speech API — not consistently present
   across TS DOM lib versions, so we type just what we use. */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => /en-GB|en-US/.test(v.lang) && /male/i.test(v.name));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* ignore */
  }
}

const s: Record<string, CSSProperties> = {
  layout: {
    display: "grid",
    gap: 24,
  },
  chatCard: {
    position: "relative",
    display: "flex",
    minHeight: "28rem",
    minWidth: 0,
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(34,211,238,0.18)",
    background:
      "radial-gradient(circle at 50% -10%, rgba(34,211,238,0.08), transparent 60%), #05070c",
    padding: 24,
  },
  scanline: {
    pointerEvents: "none",
    position: "absolute",
    inset: 0,
    background:
      "repeating-linear-gradient(0deg, rgba(34,211,238,0.025) 0px, rgba(34,211,238,0.025) 1px, transparent 1px, transparent 3px)",
    mixBlendMode: "overlay",
  },
  chatHeader: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    zIndex: 1,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  kicker: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: GLOW,
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
  },
  title: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: "0.02em",
    color: "#e6fbff",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  iconToggle: {
    display: "flex",
    height: 30,
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "1px solid rgba(34,211,238,0.25)",
    background: "rgba(34,211,238,0.06)",
    color: GLOW,
    cursor: "pointer",
  },
  statusPill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    borderRadius: "9999px",
    border: "1px solid rgba(34,211,238,0.3)",
    background: "rgba(34,211,238,0.08)",
    padding: "5px 12px",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: GLOW,
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
  },
  coreZone: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 0 8px",
  },
  coreOuter: {
    position: "relative",
    height: 96,
    width: 96,
  },
  ring1: {
    position: "absolute",
    inset: 0,
    borderRadius: "9999px",
    border: `1px solid rgba(34,211,238,0.35)`,
    borderTopColor: "rgba(34,211,238,0.9)",
  },
  ring2: {
    position: "absolute",
    inset: 12,
    borderRadius: "9999px",
    border: `1px solid rgba(34,211,238,0.2)`,
    borderBottomColor: "rgba(34,211,238,0.75)",
  },
  coreDot: {
    position: "absolute",
    inset: 32,
    borderRadius: "9999px",
    boxShadow: `0 0 18px 4px rgba(34,211,238,0.55)`,
  },
  coreLabel: {
    marginTop: 12,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "rgba(165,243,252,0.6)",
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
  },
  messages: {
    position: "relative",
    zIndex: 1,
    marginTop: 20,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    overflowY: "auto",
    paddingRight: 4,
  },
  promptPanel: {
    marginLeft: "auto",
    maxWidth: "90%",
    borderRadius: 4,
    borderLeft: "2px solid rgba(34,211,238,0.6)",
    background: "rgba(34,211,238,0.06)",
    padding: "10px 14px",
    fontSize: 13,
    lineHeight: 1.6,
    color: "#e6fbff",
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
  },
  responsePanel: {
    maxWidth: "90%",
    whiteSpace: "pre-wrap",
    borderRadius: 4,
    borderLeft: "2px solid rgba(148,163,184,0.35)",
    background: "rgba(148,163,184,0.05)",
    padding: "10px 14px",
    fontSize: 13,
    lineHeight: 1.7,
    color: "rgba(226,232,240,0.85)",
  },
  inputRow: {
    position: "relative",
    zIndex: 1,
    marginTop: 16,
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderTop: "1px solid rgba(34,211,238,0.15)",
    paddingTop: 14,
  },
  prompt: {
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
    color: GLOW,
    fontSize: 14,
  },
  inputBase: {
    flex: 1,
    minWidth: 0,
    width: "auto",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(34,211,238,0.25)",
    background: "rgba(34,211,238,0.05)",
    color: "#e6fbff",
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
  },
  micBtn: {
    display: "inline-flex",
    height: 40,
    width: 40,
    minWidth: 40,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(34,211,238,0.55)",
    background: "rgba(34,211,238,0.14)",
    color: "#67e8f9",
    cursor: "pointer",
    boxShadow: "0 0 0 1px rgba(34,211,238,0.12), 0 0 18px rgba(34,211,238,0.18)",
  },
  micBtnListening: {
    background: "rgba(239,68,68,0.2)",
    borderColor: "rgba(248,113,113,0.7)",
    color: "#fca5a5",
    boxShadow: "0 0 0 1px rgba(248,113,113,0.2), 0 0 18px rgba(248,113,113,0.25)",
  },
  sendBtn: {
    flexShrink: 0,
    borderRadius: 6,
    background: GLOW,
    color: "#04222a",
    fontWeight: 700,
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
    letterSpacing: "0.05em",
  },
  searchWrap: {
    position: "relative",
  },
  searchIcon: {
    pointerEvents: "none",
    position: "absolute",
    left: 12,
    top: "50%",
    height: 16,
    width: 16,
    transform: "translateY(-50%)",
    color: "var(--muted-foreground)",
  },
  searchInput: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    paddingLeft: 36,
  },
  suggestionBtn: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    textAlign: "left",
    fontSize: 13,
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
    letterSpacing: "0.01em",
    color: "var(--foreground)",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
  historyList: {
    marginTop: 12,
    maxHeight: 288,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto",
  },
  historyRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  historyBtn: {
    minWidth: 0,
    flex: 1,
    textAlign: "left",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  historyPrompt: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 14,
    fontWeight: 500,
    color: "var(--foreground)",
  },
  historyDate: {
    marginTop: 2,
    fontSize: 10,
    color: "var(--muted-foreground)",
  },
  deleteBtn: {
    flexShrink: 0,
    borderRadius: 6,
    padding: 4,
    color: "var(--muted-foreground)",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
};

export function AiView() {
  const queryClient = useQueryClient();
  const { data: conversations = [], isLoading } = useAiConversations();
  const deleteConversation = useDeleteAiConversation({
    onSuccess: () => toast.success("Conversation deleted"),
    onError: (e) => toast.error(e.message),
  });
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("");
  const [pending, setPending] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.prompt.toLowerCase().includes(q) ||
        c.response.toLowerCase().includes(q)
    );
  }, [conversations, filter]);

  const active = conversations.find((c) => c.id === activeId) ?? filtered[0] ?? null;

  const send = (text?: string) => {
    const next = (text ?? input).trim();
    if (!next) return;
    setInput("");
    setPending(true);
    void (async () => {
      const result = await generateAiInsightAction(next);
      setPending(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Insight generated");
      setActiveId(result.data.id);
      if (voiceOutput && result.data.response) {
        speak(result.data.response);
      }
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.ai.all() });
    })();
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error("Voice input isn't supported in this browser");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript as string | undefined;
      if (transcript?.trim()) {
        setInput(transcript.trim());
        send(transcript.trim());
      }
    };
    recognition.onerror = () => {
      setListening(false);
      toast.error("Didn't catch that. Try again.");
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" style={s.layout}>
      <style>{`
        @keyframes ax-spin-cw { to { transform: rotate(360deg); } }
        @keyframes ax-spin-ccw { to { transform: rotate(-360deg); } }
        @keyframes ax-pulse-core {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes ax-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes ax-mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(248,113,113,0); }
        }
        .ax-ring1 { animation: ax-spin-cw 3.2s linear infinite; }
        .ax-ring2 { animation: ax-spin-ccw 4.6s linear infinite; }
        .ax-core-idle { animation: ax-pulse-core 2.6s ease-in-out infinite; }
        .ax-core-busy { animation: ax-pulse-core 0.7s ease-in-out infinite; }
        .ax-status-dot { animation: ax-blink 1.4s ease-in-out infinite; }
        .ax-mic-listening { animation: ax-mic-pulse 1.2s ease-in-out infinite; }
      `}</style>

      <div style={s.chatCard}>
        <div style={s.scanline} aria-hidden />

        <div style={s.chatHeader}>
          <div style={s.headerLeft}>
            <Radio style={{ height: 16, width: 16, color: GLOW }} />
            <div>
              <div style={s.kicker}>Axion Core</div>
              <div style={s.title}>AI Workspace</div>
            </div>
          </div>
          <div style={s.headerRight}>
            <button
              type="button"
              aria-label={voiceOutput ? "Disable spoken responses" : "Enable spoken responses"}
              onClick={() => setVoiceOutput((v) => !v)}
              style={s.iconToggle}
            >
              {voiceOutput ? (
                <Volume2 style={{ height: 15, width: 15 }} />
              ) : (
                <VolumeX style={{ height: 15, width: 15 }} />
              )}
            </button>
            <div style={s.statusPill}>
              <span
                className="ax-status-dot"
                style={{
                  height: 6,
                  width: 6,
                  borderRadius: "9999px",
                  background: listening ? "#f87171" : pending ? "#fbbf24" : "#4ade80",
                }}
              />
              {listening ? "listening" : pending ? "processing" : "online"}
            </div>
          </div>
        </div>

        <div style={s.coreZone}>
          <div style={s.coreOuter}>
            <div className="ax-ring1" style={s.ring1} />
            <div className="ax-ring2" style={s.ring2} />
            <div
              className={listening ? "ax-core-busy" : pending ? "ax-core-busy" : "ax-core-idle"}
              style={{
                ...s.coreDot,
                background: listening
                  ? "radial-gradient(circle at 35% 30%, #fecaca, #f87171 45%, #7f1d1d 100%)"
                  : `radial-gradient(circle at 35% 30%, #a5f3fc, ${GLOW} 45%, #0e7490 100%)`,
              }}
            />
          </div>
          <div style={s.coreLabel}>
            {listening ? "listening…" : pending ? "analyzing input" : "awaiting command"}
          </div>
        </div>

        <div style={s.messages}>
          {!active ? (
            <EmptyState description="Ask for a daily summary, task plan, or productivity insight." />
          ) : (
            <>
              <div style={s.promptPanel}>&gt; {active.prompt}</div>
              <div style={s.responsePanel}>{active.response}</div>
            </>
          )}
        </div>

        <div style={s.inputRow}>
          <span style={s.prompt}>&gt;</span>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? "Listening…" : "Enter command…"}
            className="min-w-0 w-auto! flex-1"
            style={s.inputBase}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={pending || listening}
          />
          <button
            type="button"
            aria-label={listening ? "Stop voice input" : "Start voice input"}
            title={
              voiceSupported
                ? listening
                  ? "Stop voice input"
                  : "Start voice input"
                : "Voice input not supported in this browser"
            }
            onClick={toggleListening}
            disabled={!voiceSupported || pending}
            className={listening ? "ax-mic-listening" : undefined}
            style={{
              ...s.micBtn,
              ...(listening ? s.micBtnListening : null),
              opacity: voiceSupported ? 1 : 0.55,
              cursor: voiceSupported && !pending ? "pointer" : "not-allowed",
            }}
          >
            {listening ? (
              <MicOff style={{ height: 18, width: 18 }} aria-hidden />
            ) : (
              <Mic style={{ height: 18, width: 18 }} aria-hidden />
            )}
          </button>
          <Button style={s.sendBtn} onClick={() => send()} disabled={pending || listening}>
            {pending ? "…" : "SEND"}
          </Button>
        </div>
      </div>

      <div className="axion-stack">
        <div className="axion-card">
          <div style={s.searchWrap}>
            <Search style={s.searchIcon} />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search history…"
              style={s.searchInput}
            />
          </div>
        </div>

        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => send(suggestion)}
            disabled={pending}
            className="axion-card axion-card-glow"
            style={s.suggestionBtn}
          >
            {suggestion}
            <ArrowUpRight style={{ height: 16, width: 16, color: "var(--muted-foreground)" }} />
          </button>
        ))}

        <div className="axion-card">
          <div className="axion-kicker">History</div>
          <div style={s.historyList}>
            {isLoading ? (
              <EmptyState title="Loading…" />
            ) : filtered.length === 0 ? (
              <EmptyState />
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  className="axion-soft"
                  style={{
                    ...s.historyRow,
                    boxShadow: active?.id === c.id ? `0 0 0 1px ${GLOW}55` : "none",
                  }}
                >
                  <button
                    type="button"
                    style={s.historyBtn}
                    onClick={() => setActiveId(c.id)}
                  >
                    <div style={s.historyPrompt}>{c.prompt}</div>
                    <div style={s.historyDate}>
                      {new Date(c.created_at).toLocaleString("en-PH")}
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label="Delete conversation"
                    style={s.deleteBtn}
                    onClick={() => deleteConversation.mutate(c.id)}
                  >
                    <Trash2 style={{ height: 14, width: 14 }} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
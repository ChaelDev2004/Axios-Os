"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Focus, Music2, Pause, Play, SkipForward, TimerReset, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  useCompletePomodoroSession,
  useCreateNotification,
  usePomodoroSessions,
  useStartPomodoroSession,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import { formatHours } from "@/features/dashboard/lib/format";
import { isSameDay } from "@/components/axion/views/shared";
import { EmptyState } from "@/components/axion/views/empty-state";
import { APP_LOGO_URL } from "@/lib/site-branding-defaults";
import {
  getDownloadedFocusTrackObjectUrl,
  listDownloadedFocusTracks,
} from "@/features/dashboard/lib/focus-music-library";

const FOCUS_SECONDS = 25 * 60;

type MusicGenre = "ambient" | "phonk" | "mine";

type FocusMusicTrack = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  url: string;
  loop: boolean;
};
const COMPLETE_VIBRATE_MS = 20_000;
const STORAGE_KEY = "axion-pomodoro-timer";

type PersistedTimer = {
  sessionId: string;
  targetSeconds: number;
  endsAt: number | null;
  remainingSeconds: number;
  running: boolean;
};

function readPersisted(): PersistedTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTimer;
    if (!parsed?.sessionId || typeof parsed.targetSeconds !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(state: PersistedTimer | null) {
  if (typeof window === "undefined") return;
  if (!state) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function remainingFromPersist(p: PersistedTimer, now = Date.now()): number {
  if (p.running && p.endsAt != null) {
    return Math.max(0, Math.ceil((p.endsAt - now) / 1000));
  }
  return Math.max(0, Math.min(p.targetSeconds, Math.floor(p.remainingSeconds)));
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
      tag: "axion-focus",
    });
  } catch {
    /* ignore */
  }
}

function startCompleteVibration(): () => void {
  if (typeof window === "undefined") return () => undefined;

  let stopped = false;
  let timerId: number | undefined;
  let pulseId: number | undefined;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (timerId != null) window.clearTimeout(timerId);
    if (pulseId != null) window.clearInterval(pulseId);
    try {
      navigator.vibrate?.(0);
    } catch {
      /* ignore */
    }
  };

  void Promise.all([import("@capacitor/haptics"), import("@capacitor/core")])
    .then(([{ Haptics }, { Capacitor }]) => {
      if (stopped) return;

      if (Capacitor.isNativePlatform()) {
        const pulse = () => {
          if (stopped) return;
          void Haptics.vibrate({ duration: 900 }).catch(() => undefined);
        };
        pulse();
        pulseId = window.setInterval(pulse, 1200);
        return;
      }

      try {
        navigator.vibrate?.(COMPLETE_VIBRATE_MS);
      } catch {
        /* ignore */
      }
    })
    .catch(() => {
      if (stopped) return;
      try {
        navigator.vibrate?.(COMPLETE_VIBRATE_MS);
      } catch {
        /* ignore */
      }
    });

  timerId = window.setTimeout(stop, COMPLETE_VIBRATE_MS);
  return stop;
}

/* ---------------------------------- style tokens ---------------------------------- */

const s: Record<string, CSSProperties> = {
  headerRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sessionsBadge: {
    borderRadius: "9999px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.05)",
    padding: "0.55rem 0.9rem",
    fontSize: 12,
    lineHeight: 1.35,
    color: "var(--muted-foreground)",
    whiteSpace: "nowrap",
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  ringSection: {
    marginTop: 32,
    display: "flex",
    width: "100%",
    flexDirection: "column",
    alignItems: "center",
    gap: 32,
  },
  ringWrap: {
    position: "relative",
    display: "flex",
    height: 180,
    width: 180,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  ringSvg: {
    pointerEvents: "none",
    position: "absolute",
    inset: 0,
  },
  ringLabelWrap: {
    position: "absolute",
    inset: 0,
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 16px",
    textAlign: "center",
  },
  timeValue: {
    marginTop: 4,
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1,
    color: "var(--foreground)",
  },
  controlsCol: {
    width: "100%",
    maxWidth: "28rem",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  btnRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  statsGrid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  },
  statValue: {
    color: "var(--foreground)",
  },
  historyRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 20,
    fontSize: 14,
  },
  historyDate: {
    color: "var(--muted-foreground)",
  },
  historyDuration: {
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
    color: "var(--foreground)",
  },
  musicPanel: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "0.85rem 1rem",
    borderRadius: "1rem",
    border: "1px solid rgba(255,255,255,0.08)",
    background:
      "linear-gradient(180deg, rgba(99,102,241,0.12) 0%, rgba(255,255,255,0.03) 100%)",
  },
  musicMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minWidth: 0,
  },
  musicTitle: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.875rem",
    fontWeight: 650,
    color: "var(--foreground)",
  },
  musicArtist: {
    marginTop: 2,
    fontSize: "0.72rem",
    color: "var(--muted-foreground)",
  },
  musicControls: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  volumeRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
};

export function FocusHub({ compact = false }: { compact?: boolean }) {
  const { data: sessions = [] } = usePomodoroSessions();
  const startSession = useStartPomodoroSession({
    onError: (e) => toast.error(e.message),
  });
  const completeSession = useCompletePomodoroSession({
    onError: (e) => toast.error(e.message),
  });
  const createNotification = useCreateNotification();

  const [hydrated, setHydrated] = useState(false);
  const [remaining, setRemaining] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [targetSeconds, setTargetSeconds] = useState(FOCUS_SECONDS);
  const [hasSession, setHasSession] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [tracks, setTracks] = useState<FocusMusicTrack[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);
  const [volume, setVolume] = useState(0.45);
  const [musicGenre, setMusicGenre] = useState<MusicGenre>("ambient");
  const musicGenreRef = useRef<MusicGenre>("ambient");
  const objectUrlsRef = useRef<string[]>([]);

  const sessionIdRef = useRef<string | null>(null);
  const endsAtRef = useRef<number | null>(null);
  const finishingRef = useRef(false);
  const stopVibrateRef = useRef<(() => void) | null>(null);
  const restoredRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(0.45);
  const playRequestRef = useRef(0);
  const tracksRef = useRef<FocusMusicTrack[]>([]);
  const trackIndexRef = useRef(0);

  const pushAlert = useCallback(
    async (
      title: string,
      message: string,
      opts?: { toast?: "success" | "message" | "info"; browser?: boolean }
    ) => {
      const mode = opts?.toast ?? "message";
      if (mode === "success") toast.success(message);
      else toast.message(title, { description: message });

      if (opts?.browser !== false) {
        showBrowserNotify(title, message);
      }

      try {
        await createNotification.mutateAsync({
          title,
          message,
          type: "focus",
          read: false,
        });
      } catch {
        /* non-blocking */
      }
    },
    [createNotification]
  );

  const persist = useCallback(() => {
    const id = sessionIdRef.current;
    if (!id) {
      writePersisted(null);
      return;
    }
    const now = Date.now();
    const rem =
      running && endsAtRef.current != null
        ? Math.max(0, Math.ceil((endsAtRef.current - now) / 1000))
        : remaining;
    writePersisted({
      sessionId: id,
      targetSeconds,
      endsAt: running ? endsAtRef.current : null,
      remainingSeconds: rem,
      running,
    });
  }, [remaining, running, targetSeconds]);

  const finishSession = useCallback(
    async (durationSeconds: number) => {
      if (finishingRef.current) return;
      finishingRef.current = true;

      const id = sessionIdRef.current;
      sessionIdRef.current = null;
      endsAtRef.current = null;
      setHasSession(false);
      setRunning(false);
      setRemaining(FOCUS_SECONDS);
      setTargetSeconds(FOCUS_SECONDS);
      writePersisted(null);
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 1800);

      stopVibrateRef.current?.();
      stopVibrateRef.current = startCompleteVibration();

      const mins = Math.max(1, Math.round(durationSeconds / 60));
      const title = "Focus session complete";
      const message = `You finished a ${mins}-minute focus session. Nice work.`;

      if (!id) {
        toast.success(message);
        showBrowserNotify(title, message);
        finishingRef.current = false;
        return;
      }

      try {
        await completeSession.mutateAsync({ id, durationSeconds });
        await pushAlert(title, message, { toast: "success", browser: true });
      } catch {
        toast.success(message);
        showBrowserNotify(title, message);
      } finally {
        finishingRef.current = false;
      }
    },
    [completeSession, pushAlert]
  );

  useEffect(() => {
    return () => {
      stopVibrateRef.current?.();
      stopVibrateRef.current = null;
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    trackIndexRef.current = trackIndex;
  }, [trackIndex]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audioRef.current = null;
      }
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    volumeRef.current = volume;
    if (audioRef.current) {
      // Clamp only — never reload/recreate audio when changing volume
      audioRef.current.volume = Math.min(1, Math.max(0, volume));
    }
  }, [volume]);

  const currentTrack = tracks[trackIndex] ?? null;

  const revokeObjectUrls = useCallback(() => {
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current = [];
  }, []);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.volume = volumeRef.current;
      audio.addEventListener("ended", () => {
        if (!audio.loop) setMusicPlaying(false);
      });
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const loadTracks = useCallback(async (genre?: MusicGenre, force = false) => {
    const nextGenre = genre ?? musicGenreRef.current;
    if (!force && tracks.length > 0 && musicGenreRef.current === nextGenre) {
      return tracks;
    }
    setMusicLoading(true);
    try {
      if (nextGenre === "mine") {
        const saved = await listDownloadedFocusTracks();
        if (!saved.length) {
          throw new Error("No downloaded tracks yet. Add music in Settings.");
        }
        revokeObjectUrls();
        const mined: FocusMusicTrack[] = [];
        for (const row of saved) {
          const loaded = await getDownloadedFocusTrackObjectUrl(row.id);
          if (!loaded) continue;
          objectUrlsRef.current.push(loaded.url);
          mined.push({
            id: row.id,
            title: row.title,
            artist: "Downloaded",
            genre: "Mine",
            url: loaded.url,
            loop: true,
          });
        }
        if (!mined.length) {
          throw new Error("Could not open downloaded tracks.");
        }
        musicGenreRef.current = nextGenre;
        setMusicGenre(nextGenre);
        setTracks(mined);
        setTrackIndex(0);
        return mined;
      }

      const res = await fetch(`/api/focus/music?genre=${nextGenre}`);
      const data = (await res.json()) as {
        ok?: boolean;
        tracks?: FocusMusicTrack[];
        error?: string;
      };
      if (!res.ok || !data.ok || !data.tracks?.length) {
        throw new Error(data.error || "No focus tracks available");
      }
      revokeObjectUrls();
      musicGenreRef.current = nextGenre;
      setMusicGenre(nextGenre);
      setTracks(data.tracks);
      setTrackIndex(0);
      return data.tracks;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load music";
      toast.error(message);
      return [] as FocusMusicTrack[];
    } finally {
      setMusicLoading(false);
    }
  }, [revokeObjectUrls, tracks]);

  const playTrack = useCallback(async (track: FocusMusicTrack, attempt = 0) => {
    const audio = ensureAudio();
    const playId = ++playRequestRef.current;

    audio.pause();
    audio.loop = Boolean(track.loop);
    audio.volume = Math.min(1, Math.max(0, volumeRef.current));
    audio.src = track.url;
    audio.load();

    const ready = await new Promise<boolean>((resolve) => {
      if (audio.readyState >= 3) {
        resolve(true);
        return;
      }

      const timeout = window.setTimeout(() => {
        cleanup();
        resolve(audio.readyState >= 2);
      }, 15000);

      const onReady = () => {
        cleanup();
        resolve(true);
      };
      const onError = () => {
        cleanup();
        resolve(false);
      };
      const cleanup = () => {
        window.clearTimeout(timeout);
        audio.removeEventListener("canplay", onReady);
        audio.removeEventListener("loadeddata", onReady);
        audio.removeEventListener("error", onError);
      };

      audio.addEventListener("canplay", onReady);
      audio.addEventListener("loadeddata", onReady);
      audio.addEventListener("error", onError);
    });

    if (playId !== playRequestRef.current) return;

    if (!ready) {
      setMusicPlaying(false);
      const list = tracksRef.current;
      if (list.length > 1 && attempt < Math.min(3, list.length)) {
        const next = (trackIndexRef.current + 1) % list.length;
        setTrackIndex(next);
        trackIndexRef.current = next;
        const nextTrack = list[next];
        if (nextTrack) {
          toast.message("Skipping unavailable track…");
          await playTrack(nextTrack, attempt + 1);
          return;
        }
      }
      toast.error("Could not load this track. Try Next or Calm mode.");
      return;
    }

    try {
      await audio.play();
      if (playId !== playRequestRef.current) return;
      setMusicPlaying(true);
      setMusicPanelOpen(true);
    } catch {
      if (playId !== playRequestRef.current) return;
      setMusicPlaying(false);
      toast.error("Tap Play again to start music.");
    }
  }, [ensureAudio]);

  const handleMusicToggle = useCallback(async () => {
    const audio = ensureAudio();
    if (musicPlaying && !audio.paused) {
      audio.pause();
      setMusicPlaying(false);
      return;
    }

    const list = await loadTracks();
    const track = list[trackIndex] ?? list[0];
    if (!track) return;
    if (list[0] && trackIndex >= list.length) setTrackIndex(0);
    await playTrack(track);
  }, [ensureAudio, loadTracks, musicPlaying, playTrack, trackIndex]);

  const handleNextTrack = useCallback(async () => {
    const list = tracks.length ? tracks : await loadTracks();
    if (!list.length) return;
    const next = (trackIndex + 1) % list.length;
    setTrackIndex(next);
    trackIndexRef.current = next;
    const track = list[next];
    if (track) await playTrack(track);
  }, [loadTracks, playTrack, trackIndex, tracks]);

  const handleOpenMusic = useCallback(async () => {
    setMusicPanelOpen(true);
    const list = await loadTracks();
    if (!list.length) return;
    if (!musicPlaying) {
      const track = list[trackIndex] ?? list[0];
      if (track) await playTrack(track);
    }
  }, [loadTracks, musicPlaying, playTrack, trackIndex]);

  const handleGenreChange = useCallback(
    async (genre: MusicGenre) => {
      if (genre === musicGenreRef.current && tracks.length > 0) return;
      const list = await loadTracks(genre, true);
      if (!list.length) return;
      const track = list[0];
      if (track) await playTrack(track);
      toast.message(
        genre === "phonk"
          ? "Phonk playlist loaded"
          : genre === "mine"
            ? "Downloaded playlist loaded"
            : "Calm playlist loaded"
      );
    },
    [loadTracks, playTrack, tracks.length]
  );

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const saved = readPersisted();
    if (!saved) {
      setHydrated(true);
      return;
    }

    const rem = remainingFromPersist(saved);
    sessionIdRef.current = saved.sessionId;
    setHasSession(true);
    setTargetSeconds(saved.targetSeconds || FOCUS_SECONDS);

    if (rem <= 0) {
      void finishSession(saved.targetSeconds || FOCUS_SECONDS);
      setHydrated(true);
      return;
    }

    setRemaining(rem);
    if (saved.running && saved.endsAt != null) {
      endsAtRef.current = saved.endsAt;
      setRunning(true);
    } else {
      endsAtRef.current = null;
      setRunning(false);
    }
    setHydrated(true);
  }, [finishSession]);

  useEffect(() => {
    if (!running || !hydrated) return;

    const tick = () => {
      const endsAt = endsAtRef.current;
      if (endsAt == null) return;
      const rem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) {
        void finishSession(targetSeconds);
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running, hydrated, finishSession, targetSeconds]);

  useEffect(() => {
    if (!hydrated) return;
    persist();
  }, [hydrated, remaining, running, persist]);

  async function handleStart() {
    try {
      ensureBrowserNotifyPermission();
      const wasPaused = Boolean(sessionIdRef.current) && !running;

      if (!sessionIdRef.current) {
        const session = await startSession.mutateAsync(FOCUS_SECONDS);
        sessionIdRef.current = session.id;
        setHasSession(true);
        setTargetSeconds(FOCUS_SECONDS);
        setRemaining(FOCUS_SECONDS);
        endsAtRef.current = Date.now() + FOCUS_SECONDS * 1000;
        setRunning(true);
        await pushAlert(
          "Focus session started",
          `Timer set for ${FOCUS_SECONDS / 60} minutes. Stay locked in.`,
          { browser: false }
        );
        return;
      }

      if (!running) {
        endsAtRef.current = Date.now() + remaining * 1000;
        setRunning(true);
        if (wasPaused) {
          await pushAlert(
            "Focus session resumed",
            `${Math.ceil(remaining / 60)} min remaining.`,
            { browser: false }
          );
        }
      }
    } catch {
      /* handled */
    }
  }

  async function handlePause() {
    if (!running) return;
    const rem =
      endsAtRef.current != null
        ? Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000))
        : remaining;
    endsAtRef.current = null;
    setRemaining(rem);
    setRunning(false);
    await pushAlert(
      "Focus session paused",
      `${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, "0")} left on the clock.`,
      { browser: false }
    );
  }

  async function handleReset() {
    const hadSession = Boolean(sessionIdRef.current);
    const rem =
      endsAtRef.current != null
        ? Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000))
        : remaining;
    const elapsed = Math.max(0, targetSeconds - rem);

    stopVibrateRef.current?.();
    stopVibrateRef.current = null;

    setRunning(false);
    setRemaining(FOCUS_SECONDS);
    setTargetSeconds(FOCUS_SECONDS);
    endsAtRef.current = null;
    sessionIdRef.current = null;
    setHasSession(false);
    finishingRef.current = false;
    writePersisted(null);

    if (hadSession) {
      await pushAlert(
        "Focus session reset",
        elapsed > 0
          ? `Timer cleared after ${Math.round(elapsed / 60)} min. Ready for a fresh start.`
          : "Timer cleared. Ready for a fresh start.",
        { browser: false }
      );
    } else {
      toast.message("Timer reset");
    }
  }

  const todaySessions = useMemo(
    () => sessions.filter((s) => s.completed && isSameDay(s.ended_at ?? s.started_at)),
    [sessions]
  );
  const todayFocusSeconds = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  const progress = targetSeconds > 0 ? (targetSeconds - remaining) / targetSeconds : 0;
  const r = 58;
  const c = 2 * Math.PI * r;
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  const sessionCount = todaySessions.length;
  const sessionLabel = `${sessionCount} ${sessionCount === 1 ? "session" : "sessions"} today`;
  const statusSuffix = running ? " · running" : hasSession ? " · paused" : "";

  return (
    <div
      className="axion-card"
      style={{
        marginTop: isNarrow ? "0.65rem" : undefined,
        padding: isNarrow ? "1rem 0.9rem 1.15rem" : undefined,
        minWidth: 0,
      }}
    >
      <div
        style={{
          ...s.headerRow,
          flexDirection: isNarrow ? "column" : "row",
          alignItems: isNarrow ? "stretch" : "flex-start",
          gap: isNarrow ? 10 : 12,
          marginTop: isNarrow ? 2 : 0,
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          <div className="axion-kicker">Focus Hub</div>
          <h2
            className="axion-title"
            style={{
              paddingBottom: isNarrow ? 0 : 12,
              marginBottom: 0,
              fontSize: isNarrow ? "1.35rem" : undefined,
              lineHeight: 1.2,
            }}
          >
            Deep work centerpiece
          </h2>
        </div>
        <div
          style={{
            ...s.sessionsBadge,
            alignSelf: isNarrow ? "flex-start" : "flex-start",
            marginTop: isNarrow ? 2 : 4,
            maxWidth: "100%",
            whiteSpace: isNarrow ? "normal" : "nowrap",
          }}
        >
          {sessionLabel}
          {statusSuffix}
        </div>
      </div>

      <div
        style={{
          ...s.ringSection,
          marginTop: isNarrow ? 20 : 32,
          gap: isNarrow ? 20 : 32,
        }}
      >
        <div style={s.ringWrap}>
          <svg width={180} height={180} style={s.ringSvg} aria-hidden>
            <circle cx={90} cy={90} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={10} fill="none" />
            <circle
              cx={90}
              cy={90}
              r={r}
              stroke="url(#axFocusLive)"
              strokeWidth={10}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - progress)}
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "90px 90px",
                transition: "stroke-dashoffset 0.3s",
              }}
            />
            <defs>
              <linearGradient id="axFocusLive" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#e879f9" />
              </linearGradient>
            </defs>
          </svg>
          <div style={s.ringLabelWrap}>
            <div className="axion-kicker" style={{ marginTop: 0, textAlign: "center", letterSpacing: "0.18em" }}>
              Focus
            </div>
            <div className="axion-value" style={s.timeValue}>
              {hydrated ? `${mm}:${String(ss).padStart(2, "0")}` : "—:—"}
            </div>
          </div>
          <AnimatePresence>
            {celebrate && (
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "9999px",
                  background: "rgba(52,211,153,0.2)",
                }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2 }}
              />
            )}
          </AnimatePresence>
        </div>

        <div style={s.controlsCol}>
          <div style={s.btnRow}>
            <Button
              style={{
                borderRadius: "9999px",
                background: "linear-gradient(to right, #6366f1, #d946ef)",
                color: "#fff",
              }}
              onClick={() => void handleStart()}
              disabled={running || startSession.isPending || !hydrated}
            >
              <Focus style={{ marginRight: 8, height: 16, width: 16 }} />
              {hasSession && !running ? "Resume" : "Start Focus"}
            </Button>
            <Button
              variant="outline"
              style={{
                borderRadius: "9999px",
                borderColor: "rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
              }}
              onClick={() => void handlePause()}
              disabled={!running}
            >
              Pause
            </Button>
            <Button variant="ghost" style={{ borderRadius: "9999px" }} onClick={() => void handleReset()}>
              <TimerReset style={{ marginRight: 8, height: 16, width: 16 }} />
              Reset
            </Button>
            {!compact && (
              <Button
                variant="outline"
                style={{
                  borderRadius: "9999px",
                  borderColor: musicPlaying
                    ? "rgba(129,140,248,0.45)"
                    : "rgba(255,255,255,0.1)",
                  background: musicPlaying
                    ? "rgba(99,102,241,0.18)"
                    : "rgba(255,255,255,0.05)",
                }}
                onClick={() => void handleOpenMusic()}
                disabled={musicLoading}
              >
                <Music2 style={{ marginRight: 8, height: 16, width: 16 }} />
                {musicLoading ? "Loading…" : musicPlaying ? "Playing" : "Music"}
              </Button>
            )}
          </div>

          {!compact && musicPanelOpen ? (
            <div style={s.musicPanel}>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  padding: 3,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.2)",
                  width: "fit-content",
                  maxWidth: "100%",
                }}
              >
                {([
                  { id: "ambient" as const, label: "Calm" },
                  { id: "phonk" as const, label: "Phonk" },
                  { id: "mine" as const, label: "Mine" },
                ]).map((g) => {
                  const active = musicGenre === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      disabled={musicLoading}
                      onClick={() => void handleGenreChange(g.id)}
                      style={{
                        appearance: "none",
                        border: "none",
                        cursor: musicLoading ? "wait" : "pointer",
                        padding: "0.4rem 0.85rem",
                        borderRadius: 999,
                        fontSize: "0.72rem",
                        fontWeight: 650,
                        letterSpacing: "0.04em",
                        color: active ? "#f8fafc" : "#94a3b8",
                        background: active
                          ? g.id === "phonk"
                            ? "linear-gradient(135deg, #f43f5e 0%, #7c3aed 100%)"
                            : g.id === "mine"
                              ? "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)"
                              : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
                          : "transparent",
                        boxShadow: active ? "0 6px 16px rgba(124,58,237,0.28)" : "none",
                      }}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
              <div style={s.musicMeta}>
                <div style={{ minWidth: 0 }}>
                  <div style={s.musicTitle}>
                    {currentTrack?.title ?? "Focus playlist"}
                  </div>
                  <div style={s.musicArtist}>
                    {currentTrack
                      ? `${currentTrack.artist} · ${currentTrack.genre}`
                      : musicGenre === "phonk"
                        ? "Tap play for drift phonk"
                        : musicGenre === "mine"
                          ? "Add tracks in Settings → Downloaded music"
                          : "Tap play to start ambient focus music"}
                  </div>
                </div>
              </div>
              <div style={s.musicControls}>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  style={{
                    borderRadius: "9999px",
                    borderColor: "rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                  }}
                  onClick={() => void handleMusicToggle()}
                  disabled={musicLoading}
                >
                  {musicPlaying ? (
                    <Pause style={{ marginRight: 6, height: 14, width: 14 }} />
                  ) : (
                    <Play style={{ marginRight: 6, height: 14, width: 14 }} />
                  )}
                  {musicPlaying ? "Pause" : "Play"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  style={{ borderRadius: "9999px" }}
                  onClick={() => void handleNextTrack()}
                  disabled={musicLoading || tracks.length < 2}
                >
                  <SkipForward style={{ marginRight: 6, height: 14, width: 14 }} />
                  Next
                </Button>
              </div>
              <div style={s.volumeRow}>
                <Volume2 style={{ height: 14, width: 14, color: "#94a3b8", flexShrink: 0 }} />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  aria-label="Music volume"
                  onChange={(e) => setVolume(Number(e.target.value))}
                  style={{
                    width: "100%",
                    accentColor:
                      musicGenre === "phonk"
                        ? "#f43f5e"
                        : musicGenre === "mine"
                          ? "#14b8a6"
                          : "#818cf8",
                  }}
                />
              </div>
            </div>
          ) : null}

          <div style={s.statsGrid}>
            <div className="axion-soft">
              <div className="axion-kicker">Sessions today</div>
              <div className="axion-subtitle" style={s.statValue}>{todaySessions.length}</div>
            </div>
            <div className="axion-soft">
              <div className="axion-kicker">Focus today</div>
              <div className="axion-subtitle" style={s.statValue}>{formatHours(todayFocusSeconds)}</div>
            </div>
            <div className="axion-soft">
              <div className="axion-kicker">All-time focus</div>
              <div className="axion-subtitle" style={s.statValue}>
                {formatHours(
                  sessions.filter((s) => s.completed).reduce((sum, s) => sum + (s.duration || 0), 0)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FocusView() {
  const { data: sessions = [], isLoading } = usePomodoroSessions();
  const completed = sessions.filter((s) => s.completed);

  return (
    <div className="axion-stack">
      <FocusHub />
      <div className="axion-card">
        <div className="axion-kicker">History</div>
        <h3 className="axion-subtitle">Recent sessions</h3>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {isLoading ? (
            <EmptyState title="Loading sessions…" />
          ) : completed.length === 0 ? (
            <EmptyState title="No data yet" description="Complete a focus session to see history here." />
          ) : (
            completed.slice(0, 12).map((sess) => (
              <div key={sess.id} className="axion-soft" style={s.historyRow}>
                <span style={s.historyDate}>
                  {new Date(sess.ended_at ?? sess.started_at).toLocaleString("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                <span style={s.historyDuration}>{formatHours(sess.duration || 0)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
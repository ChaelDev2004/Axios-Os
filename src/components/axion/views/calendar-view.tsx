"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Check, Plus, StickyNote } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateNote,
  useNotes,
  useTasks,
  useToggleTaskComplete,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import { useDashboardNav } from "@/components/dashboard/dashboard-context";
import { useNotesFocusStore } from "@/features/dashboard/stores/notes-focus.store";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/axion/views/empty-state";
import type { Task } from "@/features/auth/types/database.types";

const HOUR_START = 8;
const HOUR_END = 20;
const HOUR_PX = 76;

function parseTaskTime(description: string | null | undefined) {
  const raw = description ?? "";
  const match = raw.match(/\[\[time:([^|]*)\|([^\]]*)\]\]/);
  return {
    start: match?.[1]?.trim() || "",
    end: match?.[2]?.trim() || "",
  };
}

function toMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function formatTimeLabel(value: string) {
  const mins = toMinutes(value);
  if (mins == null) return value;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

type ScheduleBlock = {
  task: Task;
  startMin: number;
  endMin: number;
  top: number;
  height: number;
};

export function CalendarView() {
  const { setActive } = useDashboardNav();
  const setNotesFocus = useNotesFocusStore((s) => s.setFocus);
  const { data: tasks = [], isLoading } = useTasks();
  const { data: notes = [] } = useNotes();
  const createNote = useCreateNote({
    onSuccess: () => toast.success("Note created for this day"),
    onError: (e) => toast.error(e.message),
  });
  const toggleComplete = useToggleTaskComplete({
    onSuccess: (_, vars) =>
      toast.success(vars.completed ? "Marked as done" : "Marked incomplete"),
    onError: (e) => toast.error(e.message),
  });

  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const monthLabel = selected.toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });

  const weekDays = useMemo(() => {
    const start = addDays(anchor, -3);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const selectedKey = dayKey(selected);

  const dayNotes = useMemo(
    () => notes.filter((n) => n.due_date === selectedKey),
    [notes, selectedKey]
  );

  const dayTasks = useMemo(() => {
    return tasks.filter((t) => {
      const due = t.due_date?.slice(0, 10);
      if (due) return due === selectedKey;
      const { start } = parseTaskTime(t.description);
      if (!start) return false;
      return dayKey(new Date(t.created_at)) === selectedKey;
    });
  }, [tasks, selectedKey]);

  const blocks = useMemo(() => {
    const result: ScheduleBlock[] = [];
    const dayStart = HOUR_START * 60;
    const dayEnd = HOUR_END * 60;

    for (const task of dayTasks) {
      const { start, end } = parseTaskTime(task.description);
      let startMin = toMinutes(start);
      let endMin = toMinutes(end);

      if (startMin == null && endMin == null) {
        const untimedIndex = result.length;
        startMin = 9 * 60 + untimedIndex * 50;
        endMin = startMin + 45;
      } else {
        startMin = startMin ?? (endMin! - 60);
        endMin = endMin ?? startMin + 60;
      }

      startMin = Math.max(dayStart, Math.min(startMin, dayEnd - 30));
      endMin = Math.max(startMin + 30, Math.min(endMin, dayEnd));

      result.push({
        task,
        startMin,
        endMin,
        top: ((startMin - dayStart) / 60) * HOUR_PX,
        height: Math.max(48, ((endMin - startMin) / 60) * HOUR_PX - 8),
      });
    }

    return result.sort((a, b) => a.startMin - b.startMin);
  }, [dayTasks]);

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = HOUR_START; h <= HOUR_END; h += 1) list.push(h);
    return list;
  }, []);

  const showNowLine =
    dayKey(now) === selectedKey &&
    now.getHours() >= HOUR_START &&
    now.getHours() < HOUR_END;

  const nowTop =
    ((now.getHours() * 60 + now.getMinutes() - HOUR_START * 60) / 60) * HOUR_PX;

  const shiftMonth = (delta: number) => {
    const next = new Date(selected.getFullYear(), selected.getMonth() + delta, 1);
    setSelected(startOfDay(next));
    setAnchor(startOfDay(next));
  };

  return (
    <div className="axion-stack">
      <div className="axion-card !p-5 sm:!p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="axion-kicker">Schedule</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xl font-semibold tracking-tight text-white" style={{ paddingTop: "20px", paddingBottom: "20px", paddingLeft: "20px"}}>
              {monthLabel}
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10"
              onClick={() => {
                const today = startOfDay(new Date());
                setSelected(today);
                setAnchor(today);
              }}
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Previous month"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex gap-2.5 overflow-x-auto pb-1">
          {weekDays.map((day) => {
            const key = dayKey(day);
            const active = key === selectedKey;
            const isToday = key === dayKey(new Date());
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelected(day);
                  setAnchor(day);
                }}
                className={cn(
                  "flex min-w-[4.25rem] flex-col items-center rounded-2xl border px-3 py-3 transition",
                  active
                    ? "border-indigo-400/50 bg-indigo-500 text-white shadow-[0_10px_28px_rgba(99,102,241,0.35)]"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]",
                  !active && isToday && "border-indigo-400/30"
                )}
              >
                <span
                  className={cn(
                    "text-lg font-semibold tabular-nums",
                    active ? "text-white" : "text-slate-100"
                  )}
                >
                  {day.getDate()}
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-[11px] font-medium",
                    active ? "text-indigo-100" : "text-slate-500"
                  )}
                >
                  {day.toLocaleDateString("en-PH", { weekday: "short" })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="axion-card overflow-hidden !p-0"  style={{ paddingBottom: "20px"}}>
        <div className="border-b border-white/8 px-5 py-4 sm:px-6">
          <div className="axion-kicker" style={{ paddingTop: "20px", paddingBottom: "20px", paddingLeft: "20px"}}>Daily plan</div>
          <h3 className="axion-subtitle" style={{ paddingBottom: "20px", paddingLeft: "20px"}}>
            {selected.toLocaleDateString("en-PH", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h3>
        </div>

        {isLoading ? (
          <div className="p-6">
            <EmptyState title="Loading schedule…" />
          </div>
        ) : (
          <div className="relative overflow-x-auto px-3 py-4 sm:px-5">
            <div
              className="relative min-w-[20rem]"
              style={{ height: (HOUR_END - HOUR_START) * HOUR_PX + 24 }}
            >
              {hours.map((h) => {
                const top = (h - HOUR_START) * HOUR_PX;
                const labelDate = new Date();
                labelDate.setHours(h, 0, 0, 0);
                const label = labelDate.toLocaleTimeString("en-PH", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div key={h} className="absolute inset-x-0" style={{ top }}>
                    <div className="flex items-start gap-3">
                      <div className="w-16 shrink-0 pt-0 text-right text-[11px] font-medium text-slate-500">
                        {label}
                      </div>
                      <div className="mt-2 h-px flex-1 bg-white/8" />
                    </div>
                  </div>
                );
              })}

              {showNowLine ? (
                <div
                  className="pointer-events-none absolute left-16 right-2 z-20 flex items-center"
                  style={{ top: nowTop }}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.8)]" />
                  <span className="h-0.5 flex-1 bg-indigo-400" />
                </div>
              ) : null}

              <div className="absolute bottom-0 left-[4.75rem] right-2 top-0">
                {blocks.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-4">
                    <EmptyState
                      title="No tasks scheduled"
                      description="Add a task with a time range to see it on this day."
                    />
                  </div>
                ) : (
                  blocks.map((block) => {
                    const done = block.task.completed || block.task.status === "done";
                    const startLabel = formatTimeLabel(
                      `${String(Math.floor(block.startMin / 60)).padStart(2, "0")}:${String(block.startMin % 60).padStart(2, "0")}`
                    );
                    const endLabel = formatTimeLabel(
                      `${String(Math.floor(block.endMin / 60)).padStart(2, "0")}:${String(block.endMin % 60).padStart(2, "0")}`
                    );

                    return (
                      <div
                        key={block.task.id}
                        className={cn(
                          "absolute inset-x-0 rounded-2xl border px-4 py-3 shadow-lg transition",
                          done
                            ? "border-violet-400/30 bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
                            : "border-white/10 bg-white/[0.06] text-slate-100 backdrop-blur-sm"
                        )}
                        style={{ top: block.top, height: block.height }}
                      >
                        <div className="flex h-full items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div
                              className={cn(
                                "truncate text-sm font-semibold",
                                done && "line-through decoration-white/70"
                              )}
                            >
                              {block.task.title}
                            </div>
                            <div
                              className={cn(
                                "mt-1 text-[11px] font-medium",
                                done ? "text-indigo-100/90" : "text-slate-400"
                              )}
                            >
                              {startLabel} – {endLabel}
                            </div>
                          </div>
                          <button
                            type="button"
                            aria-label={done ? "Mark incomplete" : "Mark done"}
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition",
                              done
                                ? "border-white/40 bg-white/20 text-white"
                                : "border-white/15 bg-white/5 text-slate-400 hover:border-indigo-300/40 hover:text-indigo-200"
                            )}
                            onClick={() =>
                              toggleComplete.mutate({
                                id: block.task.id,
                                completed: !done,
                              })
                            }
                          >
                            {done ? <Check className="h-3.5 w-3.5" /> : null}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className="axion-card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div className="axion-kicker">Notes</div>
            <h3 className="axion-subtitle" style={{ marginTop: 4 }}>
              {selected.toLocaleDateString("en-PH", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </h3>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              style={{
                display: "inline-flex",
                height: 36,
                alignItems: "center",
                gap: 8,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--foreground)",
                cursor: "pointer",
              }}
              onClick={() => {
                setNotesFocus({ dueDate: selectedKey, createDraft: false });
                setActive("notes");
              }}
            >
              <StickyNote style={{ width: 14, height: 14 }} />
              Open notes
            </button>
            <button
              type="button"
              style={{
                display: "inline-flex",
                height: 36,
                alignItems: "center",
                gap: 8,
                borderRadius: 12,
                border: "none",
                background: "#6366f1",
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "#fff",
                cursor: createNote.isPending ? "not-allowed" : "pointer",
                opacity: createNote.isPending ? 0.6 : 1,
              }}
              onClick={() => {
                createNote.mutate({
                  title: `Note · ${selected.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`,
                  body: "",
                  due_date: selectedKey,
                });
              }}
              disabled={createNote.isPending}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Add note
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {dayNotes.length === 0 ? (
            <EmptyState
              title="No notes for this day"
              description="Add a note with a due date to see it here."
            />
          ) : (
            dayNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                style={{
                  display: "flex",
                  width: "100%",
                  flexDirection: "column",
                  gap: 4,
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
                  padding: "12px 16px",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "inherit",
                }}
                onClick={() => {
                  setNotesFocus({ dueDate: selectedKey });
                  setActive("notes");
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--foreground)",
                  }}
                >
                  {note.favorite ? "♥ " : ""}
                  {note.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {(note.body ?? "").trim() || "No additional text"}
                </div>
                {note.tag ? (
                  <span
                    style={{
                      marginTop: 4,
                      width: "fit-content",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
                      padding: "2px 8px",
                      fontSize: 10,
                      color: "var(--foreground)",
                    }}
                  >
                    {note.tag}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

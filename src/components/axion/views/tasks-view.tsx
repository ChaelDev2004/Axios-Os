"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  FolderKanban,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  Save,
  StickyNote,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  useCreateNotification,
  useCreateTask,
  useDeleteTask,
  useProjects,
  useTasks,
  useUpdateTask,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import { useDashboardNav } from "@/components/dashboard/dashboard-context";
import { useNotesFocusStore } from "@/features/dashboard/stores/notes-focus.store";
import { EmptyState } from "@/components/axion/views/empty-state";
import { TasksKanbanBoard } from "@/components/ui/kanban-board";
import {
  columnToStatus,
  normalizePriority,
  taskColumn,
  type KanbanColumnId,
} from "@/components/axion/views/shared";
import type { Task } from "@/features/auth/types/database.types";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

const COLUMNS: Array<{ id: KanbanColumnId; label: string; color: string }> = [
  { id: "todo", label: "To Do", color: "#8B7355" },
  { id: "in_progress", label: "In Progress", color: "#6B8E23" },
  { id: "done", label: "Done", color: "#556B2F" },
];

/* ---------------------------------- shared style tokens ---------------------------------- */

const s: Record<string, CSSProperties> = {
  labelSmall: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.12em",
    color: "var(--muted-foreground)",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--input, transparent)",
    padding: "12px 14px",
    fontSize: 16,
    fontWeight: 500,
    color: "var(--foreground)",
    outline: "none",
  },
};

/* ---------------------------------- helpers (unchanged logic) ---------------------------------- */

type TaskFormState = {
  title: string;
  priority: string;
  projectId: string;
  dueDate: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: KanbanColumnId;
};

const EMPTY_FORM: TaskFormState = {
  title: "",
  priority: "medium",
  projectId: "",
  dueDate: "",
  startTime: "",
  endTime: "",
  notes: "",
  status: "todo",
};

const TIME_PREFIX = "[[time:";
const TIME_SUFFIX = "]]";

function encodeDescription(startTime: string, endTime: string, notes: string) {
  const start = startTime.trim();
  const end = endTime.trim();
  const note = notes.trim();
  const parts: string[] = [];
  if (start || end) parts.push(`${TIME_PREFIX}${start}|${end}${TIME_SUFFIX}`);
  if (note) parts.push(note);
  return parts.length ? parts.join("\n") : null;
}

function parseDescription(description: string | null | undefined) {
  const raw = description ?? "";
  const match = raw.match(/\[\[time:([^|]*)\|([^\]]*)\]\]/);
  const startTime = match?.[1] ?? "";
  const endTime = match?.[2] ?? "";
  const notes = raw.replace(/\[\[time:[^\]]*\]\]\n?/, "").trim();
  return { startTime, endTime, notes };
}

function formatTimeLabel(value: string) {
  if (!value) return "";
  const [hRaw, mRaw] = value.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatSchedule(startTime: string, endTime: string) {
  if (!startTime && !endTime) return null;
  if (startTime && endTime) return `${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}`;
  return formatTimeLabel(startTime || endTime);
}

function taskToForm(task: Task): TaskFormState {
  const parsed = parseDescription(task.description);
  return {
    title: task.title,
    priority: task.priority || "medium",
    projectId: task.project_id ?? "",
    dueDate: task.due_date?.slice(0, 10) ?? "",
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    notes: parsed.notes,
    status: taskColumn(task),
  };
}

function splitTime12(value: string) {
  if (!value) return { hour12: "", minute: "", period: "AM" as const };
  const [hRaw = "", mRaw = ""] = value.split(":");
  const hour24 = Number(hRaw);
  const minute = mRaw.padStart(2, "0");
  if (!Number.isFinite(hour24)) return { hour12: "", minute: "", period: "AM" as const };
  const period = hour24 >= 12 ? ("PM" as const) : ("AM" as const);
  const hour12Num = hour24 % 12 || 12;
  return { hour12: String(hour12Num), minute, period };
}

function joinTime12(hour12: string, minute: string, period: "AM" | "PM") {
  if (!hour12 && !minute) return "";
  const h12 = Number(hour12 || "12");
  const m = (minute || "00").padStart(2, "0");
  let hour24 = h12 % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${m}`;
}

/* ---------------------------------- TimePicker ---------------------------------- */

function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const textColor = isDark ? "#f4f4f5" : "#0f172a";
  const mutedColor = isDark ? "#a1a1aa" : "#475569";
  const borderColor = isDark
    ? "rgba(255,255,255,0.1)"
    : "rgba(15,23,42,0.14)";
  const controlBackground = isDark
    ? "rgba(255,255,255,0.08)"
    : "#ffffff";
  const panelBackground = isDark ? "rgba(9,9,11,0.7)" : "#f8fafc";
  const { hour12, minute, period } = splitTime12(value);
  const minuteOptions = minute && !MINUTES.includes(minute) ? [minute, ...MINUTES] : MINUTES;
  const hasValue = Boolean(hour12 || minute);

  const setParts = (nextHour12: string, nextMinute: string, nextPeriod: "AM" | "PM") => {
    if (!nextHour12 && !nextMinute) {
      onChange("");
      return;
    }
    onChange(joinTime12(nextHour12 || "12", nextMinute || "00", nextPeriod));
  };

  const selectStyle: CSSProperties = {
    height: 40,
    minWidth: 0,
    flex: 1,
    appearance: "none",
    borderRadius: 8,
    border: "none",
    background: controlBackground,
    padding: "0 6px",
    textAlign: "center",
    fontSize: 15,
    fontWeight: 600,
    color: textColor,
    outline: "none",
  };

  return (
    <div style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={s.labelSmall}>{label}</span>
        {hasValue ? (
          <button
            type="button"
            onClick={() => onChange("")}
            style={{ fontSize: 10, fontWeight: 500, color: mutedColor, background: "none", border: "none", cursor: "pointer" }}
          >
            Clear
          </button>
        ) : null}
      </div>
      <div
        style={{
          borderRadius: 12,
          border: hasValue ? "1px solid rgba(99,102,241,0.35)" : `1px solid ${borderColor}`,
          background: hasValue ? "rgba(99,102,241,0.08)" : panelBackground,
          padding: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <select
            aria-label={`${label} hour`}
            value={hour12}
            onChange={(e) => {
              if (!e.target.value) {
                onChange("");
                return;
              }
              setParts(e.target.value, minute || "00", period);
            }}
            style={selectStyle}
          >
            <option value="">—</option>
            {HOURS_12.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <span style={{ padding: "0 2px", fontSize: 16, fontWeight: 300, color: mutedColor }}>:</span>
          <select
            aria-label={`${label} minute`}
            value={minute}
            onChange={(e) => setParts(hour12 || "12", e.target.value, period)}
            style={selectStyle}
          >
            <option value="">—</option>
            {minuteOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {(["AM", "PM"] as const).map((p) => {
            const active = hasValue && period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setParts(hour12 || "12", minute || "00", p)}
                style={{
                  borderRadius: 8,
                  padding: "8px 0",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  border: "none",
                  cursor: "pointer",
                  background: active ? "#6366f1" : controlBackground,
                  color: active ? "#fff" : mutedColor,
                  boxShadow: active ? "0 4px 12px rgba(99,102,241,0.3)" : "none",
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- TaskModal ---------------------------------- */

function TaskModal({
  open,
  mode,
  form,
  projects,
  saving,
  taskId,
  onChange,
  onClose,
  onSubmit,
  onOpenLinkedNotes,
  onCreateLinkedNote,
}: {
  open: boolean;
  mode: "create" | "edit";
  form: TaskFormState;
  projects: Array<{ id: string; title: string }>;
  saving: boolean;
  taskId?: string | null;
  onChange: (next: TaskFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  onOpenLinkedNotes?: (taskId: string) => void;
  onCreateLinkedNote?: (taskId: string) => void;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = resolvedTheme !== "light";
  const colors = isDark
    ? {
        surface: "#0b0e16",
        panel: "rgba(9,9,11,0.8)",
        subtle: "rgba(255,255,255,0.04)",
        input: "rgba(255,255,255,0.05)",
        footer: "rgba(8,10,16,0.98)",
        text: "#fafafa",
        muted: "#a1a1aa",
        faint: "#71717a",
        border: "rgba(255,255,255,0.1)",
        accentText: "#c7d2fe",
        kbd: "#18181b",
        kbdBorder: "#3f3f46",
      }
    : {
        surface: "#ffffff",
        panel: "#f8fafc",
        subtle: "rgba(15,23,42,0.035)",
        input: "#f8fafc",
        footer: "#f8fafc",
        text: "#0f172a",
        muted: "#475569",
        faint: "#64748b",
        border: "rgba(15,23,42,0.14)",
        accentText: "#4338ca",
        kbd: "#e2e8f0",
        kbdBorder: "#cbd5e1",
      };

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (form.title.trim() && !saving) onSubmit();
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, onSubmit, form.title, saving]);

  const schedulePreview = formatSchedule(form.startTime, form.endTime);

  const statusMeta: Record<KanbanColumnId, { label: string; icon: ReactNode; active: string; glow: string }> = {
    todo: { label: "To Do", icon: <Circle style={{ height: 14, width: 14 }} />, active: "#fff", glow: "#6366f1" },
    in_progress: { label: "Doing", icon: <Timer style={{ height: 14, width: 14 }} />, active: "#09090b", glow: "#fbbf24" },
    done: { label: "Done", icon: <CheckCircle2 style={{ height: 14, width: 14 }} />, active: "#09090b", glow: "#34d399" },
  };

  const priorities = [
    { id: "low", label: "Low", color: "#34d399", tint: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.35)" },
    { id: "medium", label: "Medium", color: "#fbbf24", tint: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.35)" },
    { id: "high", label: "High", color: "#fb7185", tint: "rgba(251,113,133,0.1)", border: "rgba(251,113,133,0.35)" },
  ] as const;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close modal"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10050,
              background: "rgba(5,6,10,0.75)",
              backdropFilter: "blur(12px)",
              border: "none",
              padding: 0,
              cursor: "default",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10060,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              pointerEvents: "none",
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="task-modal-title"
              style={{
                pointerEvents: "auto",
                display: "flex",
                maxHeight: "min(calc(100dvh - 2rem), 52rem)",
                width: "100%",
                maxWidth: "36rem",
                flexDirection: "column",
                overflow: "hidden",
                borderRadius: 18,
                border: `1px solid ${colors.border}`,
                background: colors.surface,
                color: colors.text,
                boxShadow: "0 28px 90px rgba(0,0,0,0.65)",
              }}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                style={{
                  pointerEvents: "none",
                  position: "absolute",
                  insetInline: 0,
                  top: 0,
                  height: 96,
                  background: "radial-gradient(ellipse at top, rgba(99,102,241,0.16), transparent 70%)",
                }}
                aria-hidden
              />

              <div
                style={{
                  position: "relative",
                  display: "flex",
                  flexShrink: 0,
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                  borderBottom: `1px solid ${colors.border}`,
                  padding: "20px 28px 20px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      borderRadius: 6,
                      border: "1px solid rgba(129,140,248,0.2)",
                      background: "rgba(99,102,241,0.1)",
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      color: colors.accentText,
                      textTransform: "uppercase",
                    }}
                  >
                    {mode === "create" ? <Plus style={{ height: 12, width: 12 }} /> : <Pencil style={{ height: 12, width: 12 }} />}
                    {mode === "create" ? "Create" : "Edit"}
                  </div>
                  <h3
                    id="task-modal-title"
                    style={{ marginTop: 12, fontSize: 20, lineHeight: 1.2, fontWeight: 600, letterSpacing: "-0.01em", color: colors.text }}
                  >
                    {mode === "create" ? "Add to your board" : "Update task"}
                  </h3>
                  <p style={{ marginTop: 4, fontSize: 14, color: colors.muted }}>
                    Status, schedule, and priority in one place.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    display: "flex",
                    height: 36,
                    width: 36,
                    flexShrink: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                    background: colors.subtle,
                    color: colors.muted,
                    cursor: "pointer",
                  }}
                >
                  <X style={{ height: 16, width: 16 }} />
                </button>
              </div>

              <div
                style={{
                  position: "relative",
                  minHeight: 0,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 28,
                  overflowY: "auto",
                  padding: "24px 28px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label htmlFor="task-title" style={{ ...s.labelSmall, color: colors.muted }}>Title</label>
                  <input
                    id="task-title"
                    autoFocus
                    value={form.title}
                    onChange={(e) => onChange({ ...form, title: e.target.value })}
                    placeholder="What needs to get done?"
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: `1px solid ${colors.border}`,
                      background: colors.input,
                      padding: "14px 16px 14px 18px",
                      fontSize: 18,
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                      color: colors.text,
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ ...s.labelSmall, color: colors.muted }}>Status</span>
                  <div
                    style={{
                      position: "relative",
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 6,
                      borderRadius: 12,
                      border: `1px solid ${colors.border}`,
                      background: colors.panel,
                      padding: 8,
                    }}
                  >
                    {(Object.keys(statusMeta) as KanbanColumnId[]).map((id) => {
                      const meta = statusMeta[id];
                      const active = form.status === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onChange({ ...form, status: id })}
                          style={{
                            position: "relative",
                            zIndex: 10,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            borderRadius: 8,
                            border: "none",
                            padding: "12px 8px",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer",
                            background: "transparent",
                            color: active ? meta.active : colors.muted,
                          }}
                        >
                          {active ? (
                            <motion.span
                              layoutId="task-status-pill"
                              style={{
                                position: "absolute",
                                inset: 0,
                                zIndex: -1,
                                borderRadius: 8,
                                background: meta.glow,
                                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2)",
                              }}
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                          ) : null}
                          {meta.icon}
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    borderRadius: 14,
                    border: `1px solid ${colors.border}`,
                    background: `linear-gradient(to bottom, ${colors.subtle}, transparent)`,
                    padding: 20,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        display: "flex",
                        height: 36,
                        width: 36,
                        flexShrink: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 10,
                        border: "1px solid rgba(129,140,248,0.2)",
                        background: "rgba(99,102,241,0.1)",
                        color: colors.accentText,
                      }}
                    >
                      <Clock3 style={{ height: 14, width: 14 }} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Schedule</div>
                      <div style={{ marginTop: 2, fontSize: 11, color: colors.muted }}>Optional start and end time</div>
                    </div>
                    {schedulePreview ? (
                      <span
                        style={{
                          maxWidth: "none",
                          flexShrink: 0,
                          borderRadius: 8,
                          border: "1px solid rgba(129,140,248,0.2)",
                          background: "rgba(99,102,241,0.1)",
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: colors.accentText,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {schedulePreview}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", alignItems: "stretch", gap: 16 }}>
                    <TimePicker label="Start" value={form.startTime} onChange={(startTime) => onChange({ ...form, startTime })} />
                    <div style={{ display: "flex", alignItems: "center", padding: "0 4px" }}>
                      <span style={{ height: 1, width: 32, background: colors.border }} />
                    </div>
                    <TimePicker label="End" value={form.endTime} onChange={(endTime) => onChange({ ...form, endTime })} />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ ...s.labelSmall, color: colors.muted }}>Priority</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {priorities.map((p) => {
                      const active = form.priority === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onChange({ ...form, priority: p.id })}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            borderRadius: 12,
                            padding: "12px 12px",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer",
                            border: active ? `1px solid ${p.border}` : `1px solid ${colors.border}`,
                            background: active ? p.tint : colors.subtle,
                            color: active ? p.color : colors.muted,
                          }}
                        >
                          <span
                            style={{
                              height: 6,
                              width: 6,
                              borderRadius: "9999px",
                              background: active ? p.color : colors.faint,
                            }}
                          />
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label htmlFor="task-project" style={{ ...s.labelSmall, display: "inline-flex", alignItems: "center", gap: 6, color: colors.muted }}>
                      <FolderKanban style={{ height: 12, width: 12 }} />
                      Project
                    </label>
                    <select
                      id="task-project"
                      value={form.projectId}
                      onChange={(e) => onChange({ ...form, projectId: e.target.value })}
                      style={{
                        height: 44,
                        width: "100%",
                        appearance: "none",
                        borderRadius: 12,
                        border: `1px solid ${colors.border}`,
                        background: colors.input,
                        padding: "0 12px",
                        fontSize: 14,
                        color: colors.text,
                        outline: "none",
                      }}
                    >
                      <option value="">No project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label htmlFor="task-due" style={{ ...s.labelSmall, display: "inline-flex", alignItems: "center", gap: 6, color: colors.muted }}>
                      <CalendarDays style={{ height: 12, width: 12 }} />
                      Due date
                    </label>
                    <input
                      id="task-due"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => onChange({ ...form, dueDate: e.target.value })}
                      style={{
                        height: 44,
                        width: "100%",
                        borderRadius: 12,
                        border: `1px solid ${colors.border}`,
                        background: colors.input,
                        padding: "0 12px",
                        fontSize: 14,
                        color: colors.text,
                        outline: "none",
                        colorScheme: isDark ? "dark" : "light",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label htmlFor="task-notes" style={{ ...s.labelSmall, color: colors.muted }}>Notes</label>
                  <textarea
                    id="task-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => onChange({ ...form, notes: e.target.value })}
                    placeholder="Context, links, or a short checklist…"
                    style={{
                      minHeight: 88,
                      width: "100%",
                      resize: "none",
                      borderRadius: 12,
                      border: `1px solid ${colors.border}`,
                      background: colors.input,
                      padding: "12px 16px 12px 18px",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: colors.text,
                      outline: "none",
                    }}
                  />
                  {taskId ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => onOpenLinkedNotes?.(taskId)}
                        style={{
                          display: "inline-flex",
                          height: 36,
                          alignItems: "center",
                          gap: 6,
                          borderRadius: 10,
                          border: `1px solid ${colors.border}`,
                          background: colors.subtle,
                          padding: "0 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: colors.text,
                          cursor: "pointer",
                        }}
                      >
                        <StickyNote style={{ height: 14, width: 14 }} />
                        Linked notes
                      </button>
                      <button
                        type="button"
                        onClick={() => onCreateLinkedNote?.(taskId)}
                        style={{
                          display: "inline-flex",
                          height: 36,
                          alignItems: "center",
                          gap: 6,
                          borderRadius: 10,
                          border: "1px solid rgba(99,102,241,0.35)",
                          background: "rgba(99,102,241,0.12)",
                          padding: "0 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#a5b4fc",
                          cursor: "pointer",
                        }}
                      >
                        <Plus style={{ height: 14, width: 14 }} />
                        New note for task
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                style={{
                  position: "relative",
                  display: "flex",
                  flexShrink: 0,
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  borderTop: `1px solid ${colors.border}`,
                  background: colors.footer,
                  padding: "16px 28px",
                }}
              >
                <p style={{ fontSize: 11, color: colors.faint, margin: 0 }}>
                  <kbd style={{ borderRadius: 4, border: `1px solid ${colors.kbdBorder}`, background: colors.kbd, padding: "2px 6px", fontFamily: "monospace", fontSize: 10, color: colors.muted }}>
                    ⌘
                  </kbd>
                  <span style={{ margin: "0 4px" }}>+</span>
                  <kbd style={{ borderRadius: 4, border: `1px solid ${colors.kbdBorder}`, background: colors.kbd, padding: "2px 6px", fontFamily: "monospace", fontSize: 10, color: colors.muted }}>
                    Enter
                  </kbd>
                  <span style={{ marginLeft: 8 }}>to save</span>
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      display: "inline-flex",
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                      padding: "0 20px",
                      fontSize: 14,
                      fontWeight: 500,
                      color: colors.muted,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={saving || !form.title.trim()}
                    style={{
                      display: "inline-flex",
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      borderRadius: 12,
                      padding: "0 24px",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#fff",
                      background: "#6366f1",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(99,102,241,0.25)",
                      cursor: saving || !form.title.trim() ? "not-allowed" : "pointer",
                      opacity: saving || !form.title.trim() ? 0.4 : 1,
                    }}
                  >
                    {saving ? (
                      <Loader2 style={{ height: 16, width: 16 }} className="animate-spin" />
                    ) : mode === "create" ? (
                      <Plus style={{ height: 16, width: 16 }} />
                    ) : (
                      <Save style={{ height: 16, width: 16 }} />
                    )}
                    {mode === "create" ? "Add task" : "Save"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

/* ---------------------------------- TasksView ---------------------------------- */

function statusLabel(col: KanbanColumnId) {
  if (col === "done") return "Done";
  if (col === "in_progress") return "In Progress";
  return "To Do";
}

function scheduleMessage(startTime: string, endTime: string) {
  const schedule = formatSchedule(startTime, endTime);
  return schedule ? ` · ${schedule}` : "";
}

export function TasksView() {
  const { setActive } = useDashboardNav();
  const setNotesFocus = useNotesFocusStore((s) => s.setFocus);
  const { data: tasks = [], isLoading } = useTasks();
  const { data: projects = [] } = useProjects();
  const createNotification = useCreateNotification();

  const pushTaskNotif = async (
    title: string,
    message: string,
    type: "task" | "task_progress" | "task_done" = "task"
  ) => {
    try {
      await createNotification.mutateAsync({ title, message, type, read: false });
    } catch {
      /* non-blocking */
    }
  };

  const createTask = useCreateTask({ onError: (e) => toast.error(e.message) });
  const updateTask = useUpdateTask({ onError: (e) => toast.error(e.message) });
  const deleteTask = useDeleteTask({ onError: (e) => toast.error(e.message) });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const [dragging, setDragging] = useState<string | null>(null);
  const [canDrag, setCanDrag] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => setCanDrag(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const byColumn = useMemo(() => {
    const map: Record<KanbanColumnId, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const t of tasks) map[taskColumn(t)].push(t);
    return map;
  }, [tasks]);

  const openCreate = (status: KanbanColumnId = "todo") => {
    setModalMode("create");
    setEditingId(null);
    setForm({ ...EMPTY_FORM, status });
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setModalMode("edit");
    setEditingId(task.id);
    setForm(taskToForm(task));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const submitModal = () => {
    const title = form.title.trim();
    if (!title) {
      toast.error("Enter a task title");
      return;
    }
    if (form.startTime && form.endTime && form.startTime > form.endTime) {
      toast.error("End time must be after start time");
      return;
    }

    const description = encodeDescription(form.startTime, form.endTime, form.notes);
    const statusPayload = columnToStatus(form.status);
    const timeNote = scheduleMessage(form.startTime, form.endTime);

    if (modalMode === "create") {
      createTask.mutate(
        { title, priority: form.priority, project_id: form.projectId || null, due_date: form.dueDate || null, description, ...statusPayload },
        {
          onSuccess: () => {
            toast.success("Task added successfully");
            void pushTaskNotif(
              "New task added",
              `"${title}" created as ${statusLabel(form.status)}${timeNote}.`,
              form.status === "done" ? "task_done" : form.status === "in_progress" ? "task_progress" : "task"
            );
            closeModal();
          },
        }
      );
      return;
    }

    if (!editingId) return;
    updateTask.mutate(
      { id: editingId, input: { title, priority: form.priority, project_id: form.projectId || null, due_date: form.dueDate || null, description, ...statusPayload } },
      {
        onSuccess: () => {
          toast.success("Task updated successfully");
          void pushTaskNotif(
            "Task updated",
            `"${title}" is now ${statusLabel(form.status)}${timeNote}.`,
            form.status === "done" ? "task_done" : form.status === "in_progress" ? "task_progress" : "task"
          );
          closeModal();
        },
      }
    );
  };

  const setStatus = (task: Task, col: KanbanColumnId) => {
    const next = columnToStatus(col);
    const parsed = parseDescription(task.description);
    const timeNote = scheduleMessage(parsed.startTime, parsed.endTime);

    updateTask.mutate(
      { id: task.id, input: next },
      {
        onSuccess: () => {
          if (col === "done") {
            toast.success("Marked as done");
            void pushTaskNotif("Task completed", `"${task.title}" marked as Done${timeNote}.`, "task_done");
          } else if (col === "in_progress") {
            toast.success("Marked in progress");
            void pushTaskNotif("Task in progress", `"${task.title}" is now In Progress${timeNote}.`, "task_progress");
          } else {
            toast.success("Moved to To Do");
            void pushTaskNotif("Task moved to To Do", `"${task.title}" moved back to To Do${timeNote}.`, "task");
          }
        },
      }
    );
  };

  const removeTask = (task: Task) => {
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        toast.success("Task deleted successfully");
        void pushTaskNotif("Task deleted", `"${task.title}" was removed from your board.`, "task");
      },
    });
  };

  const move = (id: string, col: KanbanColumnId) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setStatus(task, col);
  };

  const kanbanColumns = useMemo(
    () =>
      COLUMNS.map((col) => ({
        id: col.id,
        title: col.label,
        color: col.color,
        tasks: byColumn[col.id].map((task) => {
          const project = projects.find((p) => p.id === task.project_id);
          const parsed = parseDescription(task.description);
          const schedule = formatSchedule(parsed.startTime, parsed.endTime);
          const tags = [
            ...(project?.title ? [project.title] : []),
          ];
          return {
            id: task.id,
            title: task.title,
            description: parsed.notes || undefined,
            priority: normalizePriority(task.priority),
            tags: tags.length ? tags : undefined,
            dueDate: task.due_date || undefined,
            schedule: schedule || undefined,
          };
        }),
      })),
    [byColumn, projects]
  );

  return (
    <div style={{ display: "flex", width: "100%", minWidth: 0, flexDirection: "column", gap: 28 }}>
      <div className="axion-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span
              style={{
                display: "flex",
                height: 44,
                width: 44,
                flexShrink: 0,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                border: "1px solid rgba(129,140,248,0.3)",
                background: "rgba(99,102,241,0.15)",
                color: "color-mix(in srgb, #6366f1 65%, var(--foreground))",
              }}
            >
              <ListTodo style={{ height: 20, width: 20 }} />
            </span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.16em", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                Task OS
              </div>
              <h2 style={{ marginTop: 6, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--foreground)" }}>
                Kanban Board
              </h2>
              <p style={{ marginTop: 4, fontSize: 14, color: "var(--muted-foreground)" }}>
                Drag and drop task management · timed blocks still work in the same modal.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => openCreate("todo")}
            style={{
              display: "inline-flex",
              height: 44,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: "9999px",
              background: "#6366f1",
              padding: "0 24px",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Plus style={{ height: 16, width: 16 }} />
            Add task
          </button>
          <button
            type="button"
            onClick={() => {
              setNotesFocus({});
              setActive("notes");
            }}
            style={{
              display: "inline-flex",
              height: 44,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: "9999px",
              background: "transparent",
              padding: "0 20px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              cursor: "pointer",
            }}
          >
            <StickyNote style={{ height: 16, width: 16 }} />
            Notes
          </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <EmptyState title="Loading tasks…" />
      ) : tasks.length === 0 ? (
        <EmptyState description="Create your first task to start the board." />
      ) : (
        <TasksKanbanBoard
          columns={kanbanColumns}
          canDrag={canDrag}
          draggingId={dragging}
          onDragStart={setDragging}
          onDragEnd={() => setDragging(null)}
          onDrop={(col) => {
            if (dragging) move(dragging, col);
            setDragging(null);
          }}
          onAdd={(col) => openCreate(col)}
          onEdit={(id) => {
            const task = tasks.find((t) => t.id === id);
            if (task) openEdit(task);
          }}
          onDelete={(id) => {
            const task = tasks.find((t) => t.id === id);
            if (task) removeTask(task);
          }}
          onSetStatus={(id, col) => {
            const task = tasks.find((t) => t.id === id);
            if (task) setStatus(task, col);
          }}
        />
      )}

      <TaskModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        projects={projects}
        saving={createTask.isPending || updateTask.isPending}
        taskId={editingId}
        onChange={setForm}
        onClose={closeModal}
        onSubmit={submitModal}
        onOpenLinkedNotes={(taskId) => {
          closeModal();
          setNotesFocus({ taskId });
          setActive("notes");
        }}
        onCreateLinkedNote={(taskId) => {
          closeModal();
          setNotesFocus({ taskId, createDraft: true });
          setActive("notes");
        }}
      />
    </div>
  );
}
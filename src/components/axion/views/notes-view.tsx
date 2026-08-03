"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Bell,
  Heart,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Search,
  StickyNote,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  useCreateNote,
  useDeleteNote,
  useNotes,
  useTasks,
  useUpdateNote,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import { useNotesFocusStore } from "@/features/dashboard/stores/notes-focus.store";
import { confirmDeleteNote, noteDeletedAlert } from "@/features/dashboard/lib/confirm-delete-note";
import { EmptyState } from "@/components/axion/views/empty-state";
import type { Note } from "@/features/auth/types/database.types";

const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
] as const;

function weekdayLabel(day: number | null): string {
  if (day == null) return "Every day";
  return WEEKDAYS.find((w) => w.value === day)?.label ?? "Custom";
}

async function requestNotifyPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

const icon = (size = 16): CSSProperties => ({
  width: size,
  height: size,
  flexShrink: 0,
});

const styles = {
  stack: {
    display: "flex",
    width: "100%",
    minWidth: 0,
    flexDirection: "column",
    gap: 28,
  } as CSSProperties,
  card: {
    overflow: "hidden",
    borderRadius: 24,
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--card) 88%, transparent)",
    padding: 0,
  } as CSSProperties,
  layout: {
    display: "grid",
    minHeight: "min(70vh, 720px)",
    gridTemplateColumns: "minmax(16rem, 22rem) 1fr",
  } as CSSProperties,
  sidebar: {
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid var(--border)",
    minHeight: 0,
  } as CSSProperties,
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderBottom: "1px solid var(--border)",
    padding: 12,
  } as CSSProperties,
  searchWrap: {
    position: "relative",
    minWidth: 0,
    flex: 1,
  } as CSSProperties,
  searchIcon: {
    ...icon(16),
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--muted-foreground)",
    pointerEvents: "none",
  } as CSSProperties,
  searchInput: {
    height: 40,
    width: "100%",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
    paddingLeft: 36,
    paddingRight: 12,
    fontSize: 14,
    color: "var(--foreground)",
    outline: "none",
  } as CSSProperties,
  addBtn: {
    display: "inline-flex",
    height: 40,
    width: 40,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    border: "none",
    background: "#6366f1",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(99,102,241,0.25)",
  } as CSSProperties,
  listHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "12px 16px",
  } as CSSProperties,
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "0 12px 12px",
  } as CSSProperties,
  chip: (active: boolean): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 32,
    borderRadius: 999,
    border: active ? "1px solid rgba(99,102,241,0.45)" : "1px solid var(--border)",
    background: active ? "rgba(99,102,241,0.15)" : "transparent",
    color: active ? "#c7d2fe" : "var(--muted-foreground)",
    padding: "0 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  }),
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "0 12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  } as CSSProperties,
  noteCard: (active: boolean): CSSProperties => ({
    position: "relative",
    borderRadius: 16,
    border: active
      ? "1px solid rgba(129,140,248,0.4)"
      : "1px solid var(--border)",
    background: active
      ? "rgba(99,102,241,0.12)"
      : "color-mix(in srgb, var(--foreground) 3%, transparent)",
    padding: 12,
  }),
  noteBtn: {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
    color: "inherit",
  } as CSSProperties,
  noteTitle: {
    paddingRight: 28,
    fontSize: 14,
    fontWeight: 600,
    color: "var(--foreground)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as CSSProperties,
  noteSnippet: {
    marginTop: 4,
    fontSize: 12,
    color: "var(--muted-foreground)",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  } as CSSProperties,
  metaRow: {
    marginTop: 8,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    fontSize: 10,
    color: "var(--muted-foreground)",
  } as CSSProperties,
  tagPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
    padding: "2px 8px",
    color: "var(--foreground)",
  } as CSSProperties,
  menuWrap: {
    position: "absolute",
    right: 8,
    top: 8,
  } as CSSProperties,
  iconBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: "var(--muted-foreground)",
    padding: 4,
    cursor: "pointer",
  } as CSSProperties,
  menu: {
    position: "absolute",
    right: 0,
    zIndex: 20,
    marginTop: 4,
    width: 160,
    overflow: "hidden",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--card) 96%, transparent)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
    padding: "4px 0",
  } as CSSProperties,
  menuItem: (danger = false): CSSProperties => ({
    display: "flex",
    width: "100%",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    textAlign: "left",
    fontSize: 12,
    color: danger ? "#fda4af" : "var(--foreground)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  }),
  detail: {
    display: "flex",
    minHeight: 384,
    flexDirection: "column",
  } as CSSProperties,
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderBottom: "1px solid var(--border)",
    padding: "12px 20px",
  } as CSSProperties,
  toolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "var(--muted-foreground)",
  } as CSSProperties,
  toolbarLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  } as CSSProperties,
  toolbarRight: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  } as CSSProperties,
  btnSecondary: {
    display: "inline-flex",
    height: 36,
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
    padding: "0 12px",
    fontSize: 13,
    fontWeight: 500,
    color: "var(--foreground)",
    cursor: "pointer",
  } as CSSProperties,
  btnPrimary: {
    display: "inline-flex",
    height: 36,
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    border: "none",
    background: "#6366f1",
    padding: "0 12px",
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
    cursor: "pointer",
  } as CSSProperties,
  btnEdit: {
    display: "inline-flex",
    height: 36,
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    border: "1px solid rgba(129,140,248,0.35)",
    background: "rgba(99,102,241,0.15)",
    padding: "0 12px",
    fontSize: 13,
    fontWeight: 600,
    color: "#c7d2fe",
    cursor: "pointer",
  } as CSSProperties,
  btnDanger: {
    display: "inline-flex",
    height: 36,
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    border: "1px solid rgba(248,113,113,0.35)",
    background: "rgba(239,68,68,0.12)",
    padding: "0 12px",
    fontSize: 13,
    fontWeight: 600,
    color: "#fecaca",
    cursor: "pointer",
  } as CSSProperties,
  body: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 32px",
  } as CSSProperties,
  form: {
    margin: "0 auto",
    display: "flex",
    maxWidth: 672,
    flexDirection: "column",
    gap: 16,
  } as CSSProperties,
  titleInput: {
    width: "100%",
    border: "none",
    background: "transparent",
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "var(--foreground)",
    outline: "none",
  } as CSSProperties,
  bodyInput: {
    width: "100%",
    resize: "vertical",
    borderRadius: 16,
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
    padding: 16,
    fontSize: 14,
    lineHeight: 1.7,
    color: "var(--foreground)",
    outline: "none",
    minHeight: 220,
  } as CSSProperties,
  fields: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "1fr 1fr",
  } as CSSProperties,
  label: {
    display: "grid",
    gap: 6,
    fontSize: 12,
    color: "var(--muted-foreground)",
  } as CSSProperties,
  field: {
    height: 40,
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
    padding: "0 12px",
    fontSize: 14,
    color: "var(--foreground)",
    outline: "none",
    width: "100%",
  } as CSSProperties,
  checkRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "var(--foreground)",
    cursor: "pointer",
  } as CSSProperties,
  article: {
    margin: "0 auto",
    maxWidth: 672,
  } as CSSProperties,
  h1: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "var(--foreground)",
  } as CSSProperties,
  articleMeta: {
    marginTop: 12,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: "var(--muted-foreground)",
  } as CSSProperties,
  articleBody: {
    marginTop: 24,
    whiteSpace: "pre-wrap",
    fontSize: 14,
    lineHeight: 1.75,
    color: "color-mix(in srgb, var(--foreground) 78%, transparent)",
  } as CSSProperties,
};

function snippet(body: string | null | undefined, max = 90) {
  const text = (body ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "No additional text";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatStamp(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-PH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type Draft = {
  title: string;
  body: string;
  tag: string;
  dueDate: string;
  taskId: string;
  pinned: boolean;
  favorite: boolean;
  remindEnabled: boolean;
  remindWeekday: number | "";
  remindTime: string;
};

function noteToDraft(note: Note): Draft {
  return {
    title: note.title,
    body: note.body ?? "",
    tag: note.tag ?? "",
    dueDate: note.due_date ?? "",
    taskId: note.task_id ?? "",
    pinned: note.pinned,
    favorite: note.favorite,
    remindEnabled: note.remind_enabled ?? false,
    remindWeekday: note.remind_weekday ?? "",
    remindTime: note.remind_time ?? "09:00",
  };
}

const EMPTY_DRAFT: Draft = {
  title: "",
  body: "",
  tag: "",
  dueDate: "",
  taskId: "",
  pinned: false,
  favorite: false,
  remindEnabled: false,
  remindWeekday: 1,
  remindTime: "09:00",
};

type ListFilter = "all" | "favorites" | "pinned";

export function NotesView() {
  const focusTaskId = useNotesFocusStore((s) => s.taskId);
  const focusDueDate = useNotesFocusStore((s) => s.dueDate);
  const focusNoteId = useNotesFocusStore((s) => s.noteId);
  const createDraftFlag = useNotesFocusStore((s) => s.createDraft);
  const clearFocus = useNotesFocusStore((s) => s.clearFocus);

  const { data: notes = [], isLoading } = useNotes();
  const { data: tasks = [] } = useTasks();

  const [query, setQuery] = useState("");
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const createNote = useCreateNote({
    onSuccess: (note) => {
      toast.success("Note created");
      setSelectedId(note.id);
      setEditing(false);
      setDraft(noteToDraft(note));
    },
    onError: (e) => toast.error(e.message),
  });
  const updateNote = useUpdateNote({
    onSuccess: (note) => {
      toast.success("Note updated");
      setEditing(false);
      setDraft(noteToDraft(note));
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteNote = useDeleteNote({
    onSuccess: async () => {
      await noteDeletedAlert();
      setSelectedId(null);
      setEditing(false);
      setDraft(EMPTY_DRAFT);
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => {
        if (focusTaskId && n.task_id !== focusTaskId) return false;
        if (focusDueDate && n.due_date !== focusDueDate) return false;
        if (listFilter === "favorites" && !n.favorite) return false;
        if (listFilter === "pinned" && !n.pinned) return false;
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          (n.body ?? "").toLowerCase().includes(q) ||
          (n.tag ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updated_at.localeCompare(a.updated_at);
      });
  }, [notes, query, focusTaskId, focusDueDate, listFilter]);

  // Creating a new note: keep selectedId null so Save inserts instead of overwriting.
  const isCreating = editing && selectedId === null;

  const selected = useMemo(() => {
    if (isCreating) return null;
    if (selectedId) {
      return (
        filtered.find((n) => n.id === selectedId) ??
        notes.find((n) => n.id === selectedId) ??
        null
      );
    }
    return filtered[0] ?? null;
  }, [isCreating, selectedId, filtered, notes]);

  useEffect(() => {
    if (isCreating) return;
    if (selected && selected.id !== selectedId) {
      setSelectedId(selected.id);
    }
    if (selected && !editing) {
      setDraft(noteToDraft(selected));
    }
  }, [selected, selectedId, editing, isCreating]);

  useEffect(() => {
    if (!createDraftFlag) return;
    setEditing(true);
    setSelectedId(null);
    setDraft({
      ...EMPTY_DRAFT,
      taskId: focusTaskId ?? "",
      dueDate: focusDueDate ?? "",
    });
    clearFocus();
  }, [createDraftFlag, focusTaskId, focusDueDate, clearFocus]);

  useEffect(() => {
    if (!focusNoteId) return;
    setSelectedId(focusNoteId);
    setEditing(false);
    clearFocus();
  }, [focusNoteId, clearFocus]);

  const startCreate = () => {
    setSelectedId(null);
    setEditing(true);
    setDraft({
      ...EMPTY_DRAFT,
      taskId: focusTaskId ?? "",
      dueDate: focusDueDate ?? "",
    });
  };

  const save = async () => {
    const title = draft.title.trim() || "Untitled note";
    if (draft.remindEnabled) {
      const granted = await requestNotifyPermission();
      if (!granted) {
        toast.error("Allow browser notifications to force note reminders.");
      }
    }
    const payload = {
      title,
      body: draft.body.trim() || null,
      tag: draft.tag.trim() || null,
      due_date: draft.dueDate || null,
      task_id: draft.taskId || null,
      pinned: draft.pinned,
      favorite: draft.favorite,
      remind_enabled: draft.remindEnabled,
      remind_weekday: draft.remindWeekday === "" ? null : Number(draft.remindWeekday),
      remind_time: draft.remindTime || "09:00",
    };
    if (selectedId) {
      updateNote.mutate({ id: selectedId, input: payload });
    } else {
      createNote.mutate(payload);
    }
  };

  const toggleFavorite = (note: Note) => {
    updateNote.mutate({
      id: note.id,
      input: { favorite: !note.favorite },
    });
  };

  const taskTitle = (id: string | null) =>
    id ? tasks.find((t) => t.id === id)?.title ?? "Linked task" : null;

  const layoutStyle: CSSProperties = {
    ...styles.layout,
    gridTemplateColumns: isNarrow ? "1fr" : "minmax(16rem, 22rem) 1fr",
  };

  const sidebarStyle: CSSProperties = {
    ...styles.sidebar,
    borderRight: isNarrow ? "none" : styles.sidebar.borderRight,
    borderBottom: isNarrow ? "1px solid var(--border)" : "none",
  };

  return (
    <div style={styles.stack}>
      <div style={styles.card}>
        <div style={layoutStyle}>
          <aside style={sidebarStyle}>
            <div style={styles.searchRow}>
              <div style={styles.searchWrap}>
                <Search style={styles.searchIcon} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search notes…"
                  style={styles.searchInput}
                />
              </div>
              <button type="button" onClick={startCreate} style={styles.addBtn} aria-label="New note">
                <Plus style={icon(20)} />
              </button>
            </div>

            <div style={styles.listHeader}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                {focusTaskId || focusDueDate ? "Filtered notes" : "All Notes"}
              </div>
              {(focusTaskId || focusDueDate) && (
                <button
                  type="button"
                  onClick={() => clearFocus()}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#a5b4fc",
                    fontSize: 12,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Clear filter
                </button>
              )}
            </div>

            <div style={styles.filterRow}>
              <button type="button" style={styles.chip(listFilter === "all")} onClick={() => setListFilter("all")}>
                All
              </button>
              <button
                type="button"
                style={styles.chip(listFilter === "favorites")}
                onClick={() => setListFilter("favorites")}
              >
                <Heart style={icon(12)} />
                Favorites
              </button>
              <button
                type="button"
                style={styles.chip(listFilter === "pinned")}
                onClick={() => setListFilter("pinned")}
              >
                <Pin style={icon(12)} />
                Pinned
              </button>
            </div>

            <div style={styles.list}>
              {isLoading ? (
                <EmptyState title="Loading notes…" />
              ) : filtered.length === 0 ? (
                <EmptyState
                  title="No notes yet"
                  description="Create your first note with the + button."
                />
              ) : (
                filtered.map((note) => {
                  const active = selected?.id === note.id && !(editing && !selectedId);
                  return (
                    <div key={note.id} style={styles.noteCard(active)}>
                      <button
                        type="button"
                        style={styles.noteBtn}
                        onClick={() => {
                          setSelectedId(note.id);
                          setEditing(false);
                          setDraft(noteToDraft(note));
                          setMenuId(null);
                        }}
                      >
                        <div style={styles.noteTitle}>
                          {note.favorite ? "♥ " : ""}
                          {note.pinned ? "📌 " : ""}
                          {note.remind_enabled ? "🔔 " : ""}
                          {note.title}
                        </div>
                        <p style={styles.noteSnippet}>{snippet(note.body)}</p>
                        <div style={styles.metaRow}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Pencil style={icon(12)} />
                            {formatStamp(note.updated_at)}
                          </span>
                          {note.tag ? (
                            <span style={styles.tagPill}>
                              <Tag style={icon(12)} />
                              {note.tag}
                            </span>
                          ) : null}
                        </div>
                      </button>

                      <div style={styles.menuWrap}>
                        <button
                          type="button"
                          style={styles.iconBtn}
                          aria-label={note.favorite ? "Remove favorite" : "Add favorite"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(note);
                          }}
                        >
                          <Heart
                            style={{
                              ...icon(16),
                              color: note.favorite ? "#f472b6" : "var(--muted-foreground)",
                              fill: note.favorite ? "#f472b6" : "none",
                            }}
                          />
                        </button>
                        <button
                          type="button"
                          style={styles.iconBtn}
                          aria-label="Note actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuId((id) => (id === note.id ? null : note.id));
                          }}
                        >
                          <MoreHorizontal style={icon(16)} />
                        </button>
                        {menuId === note.id ? (
                          <div style={styles.menu}>
                            <button
                              type="button"
                              style={styles.menuItem()}
                              onClick={() => {
                                setSelectedId(note.id);
                                setDraft(noteToDraft(note));
                                setEditing(true);
                                setMenuId(null);
                              }}
                            >
                              <Pencil style={icon(14)} /> Edit
                            </button>
                            <button
                              type="button"
                              style={styles.menuItem()}
                              onClick={() => {
                                setMenuId(null);
                                toggleFavorite(note);
                              }}
                            >
                              <Heart style={icon(14)} />
                              {note.favorite ? "Unfavorite" : "Favorite"}
                            </button>
                            <button
                              type="button"
                              style={styles.menuItem(true)}
                              onClick={() => {
                                setMenuId(null);
                                void (async () => {
                                  const ok = await confirmDeleteNote(note.title);
                                  if (ok) deleteNote.mutate(note.id);
                                })();
                              }}
                            >
                              <Trash2 style={icon(14)} /> Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          <section style={styles.detail}>
            <div style={styles.toolbar}>
              <div style={styles.toolbarLeft}>
                <StickyNote style={icon(16)} />
                <span style={styles.toolbarLabel}>
                  {editing ? (selectedId ? "Editing" : "New note") : "Preview"}
                </span>
              </div>
              <div style={styles.toolbarRight}>
                {!editing && selected ? (
                  <>
                    <button
                      type="button"
                      style={styles.btnSecondary}
                      onClick={() => toggleFavorite(selected)}
                      aria-label="Toggle favorite"
                    >
                      <Heart
                        style={{
                          ...icon(14),
                          color: selected.favorite ? "#f472b6" : undefined,
                          fill: selected.favorite ? "#f472b6" : "none",
                        }}
                      />
                      {selected.favorite ? "Favorited" : "Favorite"}
                    </button>
                    <button
                      type="button"
                      style={styles.btnEdit}
                      onClick={() => {
                        setDraft(noteToDraft(selected));
                        setEditing(true);
                      }}
                    >
                      <Pencil style={icon(14)} />
                      Edit Note
                    </button>
                    <button
                      type="button"
                      style={styles.btnDanger}
                      onClick={() => {
                        void (async () => {
                          const ok = await confirmDeleteNote(selected.title);
                          if (ok) deleteNote.mutate(selected.id);
                        })();
                      }}
                    >
                      <Trash2 style={icon(14)} />
                      Delete
                    </button>
                  </>
                ) : null}
                {editing ? (
                  <>
                    <button
                      type="button"
                      style={styles.btnSecondary}
                      onClick={() => {
                        setEditing(false);
                        if (selected) setDraft(noteToDraft(selected));
                        else setDraft(EMPTY_DRAFT);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.btnPrimary,
                        opacity: createNote.isPending || updateNote.isPending ? 0.5 : 1,
                      }}
                      onClick={save}
                      disabled={createNote.isPending || updateNote.isPending}
                    >
                      Save
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <div style={styles.body}>
              {!selected && !editing ? (
                <EmptyState
                  title="Select a note"
                  description="Or create a new one with the + button."
                />
              ) : editing ? (
                <div style={styles.form}>
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Note title"
                    style={styles.titleInput}
                  />
                  <textarea
                    value={draft.body}
                    onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                    placeholder="Write your note…"
                    rows={12}
                    style={styles.bodyInput}
                  />
                  <div style={{ ...styles.fields, gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr" }}>
                    <label style={styles.label}>
                      Tag
                      <input
                        value={draft.tag}
                        onChange={(e) => setDraft((d) => ({ ...d, tag: e.target.value }))}
                        placeholder="e.g. Ideas"
                        style={styles.field}
                      />
                    </label>
                    <label style={styles.label}>
                      Due date (calendar)
                      <input
                        type="date"
                        value={draft.dueDate}
                        onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                        style={styles.field}
                      />
                    </label>
                    <label style={{ ...styles.label, gridColumn: isNarrow ? "auto" : "1 / -1" }}>
                      Linked task
                      <select
                        value={draft.taskId}
                        onChange={(e) => setDraft((d) => ({ ...d, taskId: e.target.value }))}
                        style={styles.field}
                      >
                        <option value="">None</option>
                        {tasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label style={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={draft.favorite}
                      onChange={(e) => setDraft((d) => ({ ...d, favorite: e.target.checked }))}
                      style={{ accentColor: "#6366f1" }}
                    />
                    <Heart style={icon(14)} />
                    Favorite
                  </label>
                  <label style={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={draft.pinned}
                      onChange={(e) => setDraft((d) => ({ ...d, pinned: e.target.checked }))}
                      style={{ accentColor: "#6366f1" }}
                    />
                    <Pin style={icon(14)} />
                    Pin note
                  </label>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      marginTop: 8,
                      padding: 14,
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
                    }}
                  >
                    <label style={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={draft.remindEnabled}
                        onChange={async (e) => {
                          const enabled = e.target.checked;
                          if (enabled) {
                            const granted = await requestNotifyPermission();
                            if (!granted) {
                              toast.message("Enable notifications in your browser for forced reminders.");
                            }
                          }
                          setDraft((d) => ({
                            ...d,
                            remindEnabled: enabled,
                            remindWeekday: d.remindWeekday === "" ? 1 : d.remindWeekday,
                            remindTime: d.remindTime || "09:00",
                          }));
                        }}
                        style={{ accentColor: "#6366f1" }}
                      />
                      <Bell style={icon(14)} />
                      Force notification reminder
                    </label>

                    {draft.remindEnabled ? (
                      <div
                        style={{
                          display: "grid",
                          gap: 12,
                          gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
                        }}
                      >
                        <label style={styles.label}>
                          Repeat on
                          <select
                            value={draft.remindWeekday === "" ? "every" : String(draft.remindWeekday)}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDraft((d) => ({
                                ...d,
                                remindWeekday: v === "every" ? "" : Number(v),
                              }));
                            }}
                            style={styles.field}
                          >
                            <option value="every">Every day</option>
                            {WEEKDAYS.map((w) => (
                              <option key={w.value} value={w.value}>
                                Every {w.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={styles.label}>
                          Notify at
                          <input
                            type="time"
                            value={draft.remindTime}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, remindTime: e.target.value || "09:00" }))
                            }
                            style={styles.field}
                          />
                        </label>
                        <p
                          style={{
                            gridColumn: isNarrow ? "auto" : "1 / -1",
                            margin: 0,
                            fontSize: 12,
                            color: "var(--muted-foreground)",
                            lineHeight: 1.45,
                          }}
                        >
                          Example: Every Monday at 09:00 — fires a forced browser notification and
                          in-app alert while Axion is open.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : selected ? (
                <article style={styles.article}>
                  <h1 style={styles.h1}>{selected.title}</h1>
                  <div style={styles.articleMeta}>
                    <span>{formatStamp(selected.updated_at)}</span>
                    {selected.favorite ? (
                      <span style={{ ...styles.tagPill, color: "#f9a8d4", borderColor: "rgba(244,114,182,0.35)" }}>
                        Favorite
                      </span>
                    ) : null}
                    {selected.remind_enabled ? (
                      <span
                        style={{
                          ...styles.tagPill,
                          borderColor: "rgba(251,191,36,0.35)",
                          background: "rgba(251,191,36,0.12)",
                          color: "#fde68a",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Bell style={icon(12)} />
                        {weekdayLabel(selected.remind_weekday)} · {selected.remind_time ?? "09:00"}
                      </span>
                    ) : null}
                    {selected.tag ? <span style={styles.tagPill}>{selected.tag}</span> : null}
                    {selected.due_date ? (
                      <span
                        style={{
                          ...styles.tagPill,
                          borderColor: "rgba(129,140,248,0.3)",
                          background: "rgba(99,102,241,0.12)",
                          color: "#c7d2fe",
                        }}
                      >
                        Due {selected.due_date}
                      </span>
                    ) : null}
                    {selected.task_id ? (
                      <span style={styles.tagPill}>Task: {taskTitle(selected.task_id)}</span>
                    ) : null}
                  </div>
                  <div style={styles.articleBody}>
                    {selected.body?.trim() || "No content yet."}
                  </div>
                </article>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

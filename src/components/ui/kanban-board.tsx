"use client";

import {
  Calendar,
  CheckCircle2,
  GripVertical,
  Pencil,
  Plus,
  Timer,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { KanbanColumnId } from "@/components/axion/views/shared";

export type KanbanBoardTask = {
  id: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  tags?: string[];
  dueDate?: string;
  schedule?: string;
};

export type KanbanBoardColumn = {
  id: KanbanColumnId;
  title: string;
  color: string;
  tasks: KanbanBoardTask[];
};

type TasksKanbanBoardProps = {
  columns: KanbanBoardColumn[];
  canDrag?: boolean;
  draggingId?: string | null;
  onDragStart?: (taskId: string) => void;
  onDragEnd?: () => void;
  onDrop?: (columnId: KanbanColumnId) => void;
  onAdd?: (columnId: KanbanColumnId) => void;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onSetStatus?: (taskId: string, columnId: KanbanColumnId) => void;
};

function formatDue(dueDate?: string) {
  if (!dueDate) return null;
  const d = new Date(`${dueDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dueDate.slice(0, 10);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function priorityClass(priority?: string) {
  if (priority === "high") {
    return "bg-red-500/15 text-red-300 border-red-500/20";
  }
  if (priority === "low") {
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
  }
  return "bg-amber-500/15 text-amber-300 border-amber-500/20";
}

export function TasksKanbanBoard({
  columns,
  canDrag = false,
  draggingId = null,
  onDragStart,
  onDragEnd,
  onDrop,
  onAdd,
  onEdit,
  onDelete,
  onSetStatus,
}: TasksKanbanBoardProps) {
  return (
    <div className="w-full min-w-0">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {columns.map((column) => (
          <div
            key={column.id}
            className="rounded-3xl border border-border/60 bg-white/10 backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-900/20"
            style={{ padding: 20 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop?.(column.id)}
          >
            <div
              className="flex items-center justify-between"
              style={{ gap: 12, marginBottom: 24 }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <h3 className="truncate font-semibold text-foreground">
                  {column.title}
                </h3>
                <Badge
                  variant="secondary"
                  className="border-border/50 bg-muted/60 text-muted-foreground"
                >
                  {column.tasks.length}
                </Badge>
              </div>
              <button
                type="button"
                aria-label={`Add task to ${column.title}`}
                onClick={() => onAdd?.(column.id)}
                className="rounded-full bg-white/30 p-1.5 transition-colors hover:bg-white/50 dark:bg-neutral-800/40 dark:hover:bg-neutral-700/60"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {column.tasks.map((task) => {
                const isDone = column.id === "done";
                const dueLabel = formatDue(task.dueDate);

                return (
                  <Card
                    key={task.id}
                    draggable={canDrag}
                    onDragStart={() => canDrag && onDragStart?.(task.id)}
                    onDragEnd={() => onDragEnd?.()}
                    className={cn(
                      "border bg-white/60 backdrop-blur-sm transition-all duration-300 dark:bg-neutral-800/60",
                      canDrag && "cursor-grab active:cursor-grabbing",
                      draggingId === task.id && "opacity-60",
                      "hover:bg-white/70 dark:hover:bg-neutral-700/70"
                    )}
                    style={{ margin: 0 }}
                  >
                    <CardContent
                      className="p-0"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        padding: 20,
                      }}
                    >
                      <div
                        className="flex items-start justify-between"
                        style={{ gap: 12 }}
                      >
                        <h4
                          className={cn(
                            "leading-tight font-semibold text-foreground",
                            isDone && "text-muted-foreground line-through"
                          )}
                          style={{ margin: 0 }}
                        >
                          {task.title}
                        </h4>
                        <div
                          className="flex shrink-0 items-center"
                          style={{ gap: 4 }}
                        >
                          <button
                            type="button"
                            aria-label="Edit task"
                            onClick={() => onEdit?.(task.id)}
                            className="rounded-lg text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
                            style={{ padding: 6 }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete task"
                            onClick={() => onDelete?.(task.id)}
                            className="rounded-lg text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
                            style={{ padding: 6 }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          {canDrag ? (
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                          ) : null}
                        </div>
                      </div>

                      {task.description ? (
                        <p
                          className="line-clamp-2 text-sm leading-relaxed text-muted-foreground"
                          style={{ margin: 0 }}
                        >
                          {task.description}
                        </p>
                      ) : null}

                      {(task.priority || (task.tags && task.tags.length > 0)) && (
                        <div
                          className="flex flex-wrap"
                          style={{ gap: 8 }}
                        >
                          {task.priority ? (
                            <Badge
                              className={cn(
                                "text-xs capitalize",
                                priorityClass(task.priority)
                              )}
                            >
                              {task.priority}
                            </Badge>
                          ) : null}
                          {task.tags?.map((tag) => (
                            <Badge
                              key={tag}
                              className="border-border/50 bg-muted/50 text-xs text-muted-foreground backdrop-blur-sm"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div
                        className="flex items-center justify-between border-t border-border/30"
                        style={{ gap: 12, paddingTop: 12 }}
                      >
                        <div
                          className="flex flex-wrap items-center text-muted-foreground"
                          style={{ gap: 12 }}
                        >
                          {dueLabel ? (
                            <div
                              className="flex items-center"
                              style={{ gap: 4 }}
                            >
                              <Calendar className="h-4 w-4" />
                              <span className="text-xs font-medium">{dueLabel}</span>
                            </div>
                          ) : null}
                          {task.schedule ? (
                            <div
                              className="flex items-center"
                              style={{ gap: 4 }}
                            >
                              <Timer className="h-4 w-4" />
                              <span className="text-xs font-medium">
                                {task.schedule}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex" style={{ gap: 8 }}>
                        <button
                          type="button"
                          disabled={column.id === "in_progress"}
                          onClick={() => onSetStatus?.(task.id, "in_progress")}
                          className={cn(
                            "inline-flex flex-1 items-center justify-center rounded-xl border text-[11px] font-semibold transition",
                            column.id === "in_progress"
                              ? "cursor-default border-amber-400/40 bg-amber-400/20 text-amber-200"
                              : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                          )}
                          style={{ gap: 6, padding: "8px 12px" }}
                        >
                          <Timer className="h-3.5 w-3.5" />
                          In progress
                        </button>
                        <button
                          type="button"
                          disabled={column.id === "done"}
                          onClick={() => onSetStatus?.(task.id, "done")}
                          className={cn(
                            "inline-flex flex-1 items-center justify-center rounded-xl border text-[11px] font-semibold transition",
                            column.id === "done"
                              ? "cursor-default border-emerald-400/40 bg-emerald-400/20 text-emerald-200"
                              : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                          )}
                          style={{ gap: 6, padding: "8px 12px" }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Done
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {column.tasks.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                  No tasks here yet
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

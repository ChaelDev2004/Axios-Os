"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useTasks,
  useUpdateProject,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import { productivityPercent } from "@/features/dashboard/lib/analytics";
import { EmptyState } from "@/components/axion/views/empty-state";
import type { Project } from "@/features/auth/types/database.types";

export function ProjectsView() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: tasks = [] } = useTasks();
  const createProject = useCreateProject({
    onSuccess: () => toast.success("Project created"),
    onError: (e) => toast.error(e.message),
  });
  const updateProject = useUpdateProject({
    onSuccess: () => toast.success("Project updated"),
    onError: (e) => toast.error(e.message),
  });
  const deleteProject = useDeleteProject({
    onSuccess: () => toast.success("Project deleted"),
    onError: (e) => toast.error(e.message),
  });

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("active");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [editing, setEditing] = useState<Project | null>(null);

  const withProgress = useMemo(() => {
    return projects.map((p) => {
      const related = tasks.filter((t) => t.project_id === p.id);
      const done = related.filter((t) => t.completed).length;
      const progress = productivityPercent(done, related.length);
      return { project: p, progress, taskCount: related.length, done };
    });
  }, [projects, tasks]);

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    createProject.mutate({
      title: t,
      description: null,
      status,
      priority,
      start_date: null,
      due_date: dueDate || null,
    });
    setTitle("");
    setDueDate("");
  };

  const saveEdit = () => {
    if (!editing) return;
    updateProject.mutate({
      id: editing.id,
      input: {
        title: editing.title.trim(),
        status: editing.status,
        priority: editing.priority,
        due_date: editing.due_date,
        description: editing.description,
      },
    });
    setEditing(null);
  };

  return (
    <div className="axion-stack">
      <div className="axion-card">
        <div className="axion-kicker">Projects</div>
        <h2 className="axion-title">Live project board</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project title"
            className="border-white/10 bg-white/5 lg:col-span-2"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="planned">Planned</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <Button className="rounded-full" onClick={submit} disabled={createProject.isPending}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
        <div className="mt-2">
          <Label className="text-xs text-slate-400">Due date</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 max-w-xs border-white/10 bg-white/5"
          />
        </div>
      </div>

      {editing ? (
        <div className="axion-card axion-stack">
          <div className="axion-kicker">Edit project</div>
          <Input
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            className="border-white/10 bg-white/5"
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              value={editing.status}
              onChange={(e) => setEditing({ ...editing, status: e.target.value })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="planned">Planned</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={editing.priority}
              onChange={(e) => setEditing({ ...editing, priority: e.target.value })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <Input
              type="date"
              value={editing.due_date?.slice(0, 10) ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, due_date: e.target.value || null })
              }
              className="border-white/10 bg-white/5"
            />
          </div>
          <div className="flex gap-2">
            <Button className="rounded-full" onClick={saveEdit}>
              Save
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <EmptyState title="Loading…" />
      ) : withProgress.length === 0 ? (
        <EmptyState description="Create a project to track progress from related tasks." />
      ) : (
        withProgress.map(({ project: p, progress, taskCount, done }) => (
          <div key={p.id} className="axion-card">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{p.title}</div>
                <div className="mt-1 text-xs capitalize text-slate-400">
                  {p.status} · {p.priority} priority
                  {p.due_date ? ` · due ${p.due_date.slice(0, 10)}` : ""}
                  {taskCount > 0 ? ` · ${done}/${taskCount} tasks` : " · no tasks yet"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium tabular-nums">{progress}%</div>
                <button
                  type="button"
                  aria-label="Edit"
                  className="rounded p-1.5 text-slate-400 hover:bg-white/10"
                  onClick={() => setEditing(p)}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-red-300"
                  onClick={() => deleteProject.mutate(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.7 }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

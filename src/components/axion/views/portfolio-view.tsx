"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreatePortfolioProject,
  useDeletePortfolioProject,
  usePortfolioProjects,
  usePortfolioViewEvents,
  useRecordPortfolioView,
  useUpdatePortfolioProject,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import { groupPortfolioViewsByDay } from "@/features/dashboard/lib/analytics";
import { areaFill, defaultLineOptions, Line } from "@/lib/chartjs";
import { EmptyState } from "@/components/axion/views/empty-state";
import { slugify } from "@/components/axion/views/shared";
import type { PortfolioProject } from "@/features/auth/types/database.types";

function normalizeProjectUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function PortfolioView() {
  const { data: projects = [], isLoading } = usePortfolioProjects();
  const { data: viewEvents = [] } = usePortfolioViewEvents({ days: 30 });
  const createProject = useCreatePortfolioProject({
    onSuccess: () => toast.success("Portfolio project created"),
    onError: (e) => toast.error(e.message),
  });
  const updateProject = useUpdatePortfolioProject({
    onSuccess: () => toast.success("Updated"),
    onError: (e) => toast.error(e.message),
  });
  const deleteProject = useDeletePortfolioProject({
    onSuccess: () => toast.success("Deleted"),
    onError: (e) => toast.error(e.message),
  });
  const recordView = useRecordPortfolioView({
    onError: (e) => toast.error(e.message),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [editing, setEditing] = useState<PortfolioProject | null>(null);

  const totalViews = projects.reduce((s, p) => s + (p.views || 0), 0);
  const published = projects.filter((p) => p.published).length;
  const top = useMemo(
    () => [...projects].sort((a, b) => (b.views || 0) - (a.views || 0))[0],
    [projects]
  );
  const traffic = useMemo(
    () => groupPortfolioViewsByDay(viewEvents, 7),
    [viewEvents]
  );

  const submit = () => {
    const t = title.trim();
    if (!t) {
      toast.error("Enter a project title");
      return;
    }
    const url = normalizeProjectUrl(projectUrl);
    createProject.mutate({
      title: t,
      slug: slugify(t),
      description: description.trim() || null,
      image_url: null,
      project_url: url,
      published: false,
      views: 0,
    });
    setTitle("");
    setDescription("");
    setProjectUrl("");
  };

  const saveEdit = () => {
    if (!editing) return;
    updateProject.mutate({
      id: editing.id,
      input: {
        title: editing.title.trim(),
        slug: editing.slug.trim() || slugify(editing.title),
        description: editing.description,
        project_url: normalizeProjectUrl(editing.project_url ?? ""),
        published: editing.published,
      },
    });
    setEditing(null);
  };

  const openProject = async (project: PortfolioProject) => {
    const url = normalizeProjectUrl(project.project_url ?? "");
    if (!url) {
      toast.error("Add a project link before viewing");
      return;
    }

    try {
      await recordView.mutateAsync(project.id);
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("View recorded");
    } catch {
      /* error toast handled by mutation */
    }
  };

  return (
    <div className="axion-stack">
      <div className="axion-grid-4">
        {[
          { label: "Portfolio Views", value: String(totalViews) },
          { label: "Projects", value: String(projects.length) },
          { label: "Published", value: String(published) },
          { label: "Top Project", value: top?.title ?? "—" },
        ].map((s) => (
          <div key={s.label} className="axion-card axion-card-glow">
            <div className="axion-kicker">{s.label}</div>
            <div className="axion-value truncate text-2xl sm:text-3xl">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="axion-card">
        <div className="axion-kicker">Traffic</div>
        <h3 className="axion-subtitle">Portfolio views (7 days)</h3>
        {viewEvents.length === 0 ? (
          <div className="mt-5">
            <EmptyState description="Open a project link to populate this chart." />
          </div>
        ) : (
          <div className="axion-chart mt-5 h-80">
            <Line
              data={{
                labels: traffic.map((d) => d.label),
                datasets: [
                  {
                    label: "Views",
                    data: traffic.map((d) => d.value),
                    borderColor: "#818cf8",
                    backgroundColor: areaFill("#818cf8"),
                    fill: true,
                  },
                ],
              }}
              options={{
                ...defaultLineOptions,
                plugins: {
                  ...defaultLineOptions.plugins,
                  legend: { display: false },
                },
              }}
            />
          </div>
        )}
      </div>

      <div className="axion-card">
        <div className="axion-kicker">New project</div>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="border-white/10 bg-white/5"
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="border-white/10 bg-white/5"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="url"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              placeholder="Project link (https://…)"
              className="border-white/10 bg-white/5"
            />
            <Button
              className="shrink-0 rounded-full"
              onClick={submit}
              disabled={createProject.isPending}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
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
          <Input
            value={editing.slug}
            onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
            className="border-white/10 bg-white/5"
          />
          <Input
            type="url"
            value={editing.project_url ?? ""}
            onChange={(e) =>
              setEditing({ ...editing, project_url: e.target.value })
            }
            placeholder="Project link (https://…)"
            className="border-white/10 bg-white/5"
          />
          <Label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editing.published}
              onChange={(e) =>
                setEditing({ ...editing, published: e.target.checked })
              }
            />
            Published
          </Label>
          <div className="flex gap-2">
            <Button className="rounded-full" onClick={saveEdit}>
              Save
            </Button>
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="axion-stack">
        {isLoading ? (
          <EmptyState title="Loading…" />
        ) : projects.length === 0 ? (
          <EmptyState description="Add a portfolio project to get started." />
        ) : (
          projects.map((p) => (
            <div key={p.id} className="axion-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{p.title}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    /{p.slug} · {p.views} views ·{" "}
                    {p.published ? "Published" : "Draft"}
                  </div>
                  {p.project_url ? (
                    <a
                      href={normalizeProjectUrl(p.project_url) ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-indigo-300 hover:text-indigo-200 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{p.project_url}</span>
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">No project link</p>
                  )}
                  {p.description ? (
                    <p className="mt-2 text-sm text-slate-400">{p.description}</p>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full border-white/10"
                    disabled={recordView.isPending}
                    onClick={() => void openProject(p)}
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    View
                  </Button>
                  <button
                    type="button"
                    aria-label="Edit"
                    className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
                    onClick={() => setEditing(p)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete"
                    className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-red-300"
                    onClick={() => deleteProject.mutate(p.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

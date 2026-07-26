"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useProjectsContent,
  useUpsertProjectsContent,
} from "@/features/cms/hooks/use-projects-content";
import {
  newEmptyFormItem,
  projectsContentToInput,
  type ProjectsContentInput,
} from "@/features/cms/services/projects-content.service";
import {
  DEFAULT_PROJECTS_CONTENT,
  nextProjectId,
} from "@/lib/projects-content-defaults";
import { cn } from "@/lib/utils";

const textareaClass = cn(
  "flex min-h-[88px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
);

function emptyForm(): ProjectsContentInput {
  return {
    subTitle: DEFAULT_PROJECTS_CONTENT.subTitle,
    title: DEFAULT_PROJECTS_CONTENT.title,
    intro: DEFAULT_PROJECTS_CONTENT.intro,
    projects: DEFAULT_PROJECTS_CONTENT.projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      href: project.href,
      imageUrl: "",
      frameworksInput: project.frameworks.join(", "),
    })),
  };
}

function updateProject(
  prev: ProjectsContentInput,
  index: number,
  patch: Partial<ProjectsContentInput["projects"][number]>
): ProjectsContentInput {
  return {
    ...prev,
    projects: prev.projects.map((item, i) => (i === index ? { ...item, ...patch } : item)),
  };
}

export function ProjectsCmsEditor() {
  const { data, isLoading } = useProjectsContent();
  const save = useUpsertProjectsContent({
    onSuccess: () => toast.success("Projects section updated"),
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState<ProjectsContentInput>(emptyForm);

  useEffect(() => {
    if (data) {
      setForm(projectsContentToInput(data));
    }
  }, [data]);

  const addProject = () => {
    setForm((prev) => ({
      ...prev,
      projects: [...prev.projects, newEmptyFormItem(nextProjectId(prev.projects))],
    }));
  };

  const removeProject = (index: number) => {
    setForm((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="axion-card mt-6">
      <div className="axion-kicker">Site CMS</div>
      <h2 className="axion-title">Projects section</h2>
      <p className="axion-body">
        Add, remove, and edit projects. Leave image URL empty to use the default local image.
      </p>

      {isLoading ? (
        <p className="axion-meta mt-4">Loading projects content…</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (form.projects.length === 0) {
              toast.error("Add at least one project");
              return;
            }
            save.mutate(form);
          }}
          className="mt-6 space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="projects-subtitle">Subtitle</Label>
              <Input
                id="projects-subtitle"
                value={form.subTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, subTitle: e.target.value }))}
                placeholder={DEFAULT_PROJECTS_CONTENT.subTitle}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projects-title">Title</Label>
              <Input
                id="projects-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={DEFAULT_PROJECTS_CONTENT.title}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projects-intro">Intro text</Label>
            <textarea
              id="projects-intro"
              className={textareaClass}
              value={form.intro}
              onChange={(e) => setForm((prev) => ({ ...prev, intro: e.target.value }))}
              placeholder={DEFAULT_PROJECTS_CONTENT.intro}
              rows={4}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Project rows ({form.projects.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addProject}>
                + Add project
              </Button>
            </div>

            <div className="grid gap-4">
              {form.projects.map((project, index) => (
                <div key={project.id} className="axion-soft space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Project {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-400 hover:text-red-300"
                      onClick={() => removeProject(index)}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={project.name}
                      onChange={(e) => setForm((prev) => updateProject(prev, index, { name: e.target.value }))}
                      placeholder="Project name"
                      aria-label={`Project ${index + 1} name`}
                    />
                    <Input
                      value={project.href}
                      onChange={(e) => setForm((prev) => updateProject(prev, index, { href: e.target.value }))}
                      placeholder="https://example.com"
                      aria-label={`Project ${index + 1} link`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`project-image-${project.id}`}>Image URL</Label>
                    <Input
                      id={`project-image-${project.id}`}
                      value={project.imageUrl}
                      onChange={(e) => setForm((prev) => updateProject(prev, index, { imageUrl: e.target.value }))}
                      placeholder="https://cdn.example.com/project.png (empty = default)"
                    />
                    {project.imageUrl.trim() && (
                      <img
                        src={project.imageUrl.trim()}
                        alt=""
                        className="mt-1 h-20 w-auto rounded border border-white/10 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                  </div>

                  <textarea
                    className={textareaClass}
                    value={project.description}
                    onChange={(e) => setForm((prev) => updateProject(prev, index, { description: e.target.value }))}
                    placeholder="Project description"
                    rows={3}
                    aria-label={`Project ${index + 1} description`}
                  />

                  <div className="space-y-2">
                    <Label htmlFor={`project-frameworks-${project.id}`}>Tech tags</Label>
                    <Input
                      id={`project-frameworks-${project.id}`}
                      value={project.frameworksInput}
                      onChange={(e) => setForm((prev) => updateProject(prev, index, { frameworksInput: e.target.value }))}
                      placeholder="React.js, Tailwind CSS, Supabase"
                    />
                  </div>
                </div>
              ))}

              {form.projects.length === 0 && (
                <p className="axion-meta py-4 text-center">No projects yet. Click &ldquo;+ Add project&rdquo; to get started.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save projects content"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setForm(emptyForm())}>
              Reset to defaults
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

import { PROJECTS, PROJECTS_INTRO, type Project } from "@/lib/projects";

export type ProjectCmsItem = {
  id: number;
  name: string;
  description: string;
  href: string;
  imageUrl: string;
  frameworks: string[];
};

export const DEFAULT_PROJECTS_CONTENT = {
  subTitle: "Logic meets Aesthetics, Seamlessly",
  title: "Projects",
  intro: PROJECTS_INTRO,
  projects: PROJECTS.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    href: project.href,
    imageUrl: "",
    frameworks: project.frameworks.map((fw) => fw.name),
  })),
} as const;

export type ProjectsContent = {
  subTitle: string;
  title: string;
  intro: string;
  projects: ProjectCmsItem[];
};

export type ProjectsContentRow = {
  id: string;
  section_subtitle: string;
  section_title: string;
  section_intro: string;
  projects: unknown;
  updated_at: string;
  updated_by: string | null;
};

function normalizeSingleProject(raw: unknown, fallbackId: number): ProjectCmsItem {
  if (!raw || typeof raw !== "object") {
    return { id: fallbackId, name: "", description: "", href: "", imageUrl: "", frameworks: [] };
  }

  const r = raw as Record<string, unknown>;
  const frameworks = Array.isArray(r.frameworks)
    ? r.frameworks.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean)
    : [];

  return {
    id: typeof r.id === "number" ? r.id : fallbackId,
    name: typeof r.name === "string" ? r.name.trim() : "",
    description: typeof r.description === "string" ? r.description.trim() : "",
    href: typeof r.href === "string" ? r.href.trim() : "",
    imageUrl: typeof r.imageUrl === "string" ? r.imageUrl.trim() : "",
    frameworks,
  };
}

function normalizeProjects(raw: unknown): ProjectCmsItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_PROJECTS_CONTENT.projects.map((p) => ({
      ...p,
      imageUrl: "",
      frameworks: [...p.frameworks],
    }));
  }

  return raw.map((item, i) => normalizeSingleProject(item, i + 1));
}

export function mergeProjectsContent(row: ProjectsContentRow | null | undefined): ProjectsContent {
  if (!row) {
    return {
      subTitle: DEFAULT_PROJECTS_CONTENT.subTitle,
      title: DEFAULT_PROJECTS_CONTENT.title,
      intro: DEFAULT_PROJECTS_CONTENT.intro,
      projects: DEFAULT_PROJECTS_CONTENT.projects.map((p) => ({
        ...p,
        imageUrl: "",
        frameworks: [...p.frameworks],
      })),
    };
  }

  return {
    subTitle: row.section_subtitle?.trim() || DEFAULT_PROJECTS_CONTENT.subTitle,
    title: row.section_title?.trim() || DEFAULT_PROJECTS_CONTENT.title,
    intro: row.section_intro?.trim() || DEFAULT_PROJECTS_CONTENT.intro,
    projects: normalizeProjects(row.projects),
  };
}

export function projectCmsToProject(item: ProjectCmsItem, index: number): Project {
  const base = PROJECTS[index];
  const img = item.imageUrl?.trim();

  return {
    id: item.id,
    name: item.name || base?.name || `Project ${item.id}`,
    description: item.description || base?.description || "",
    href: item.href ?? base?.href ?? "",
    image: img || base?.image || "/assets/projects/works1.png",
    bgImage: img || base?.bgImage || "/assets/projects/works1.png",
    frameworks:
      item.frameworks.length > 0
        ? item.frameworks.map((name, fi) => ({ id: fi + 1, name }))
        : base?.frameworks ?? [],
  };
}

export function applyProjectsContent(content: ProjectsContent): Project[] {
  return content.projects.map((item, index) => projectCmsToProject(item, index));
}

export function nextProjectId(projects: Array<{ id: number }>): number {
  if (projects.length === 0) return 1;
  return Math.max(...projects.map((p) => p.id)) + 1;
}

export function formatProjectFrameworksInput(frameworks: string[]): string {
  return frameworks.join(", ");
}

export function parseProjectFrameworksInput(input: string): string[] {
  return input
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

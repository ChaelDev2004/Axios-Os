import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/features/auth/types/database.types";
import { requireAdminId } from "@/features/cms/services/cms-auth";
import {
  DEFAULT_PROJECTS_CONTENT,
  formatProjectFrameworksInput,
  mergeProjectsContent,
  parseProjectFrameworksInput,
  type ProjectsContent,
} from "@/lib/projects-content-defaults";

type ProjectsContentUpdate = Database["public"]["Tables"]["projects_content"]["Update"];

export type ProjectFormItem = {
  id: number;
  name: string;
  description: string;
  href: string;
  imageUrl: string;
  frameworksInput: string;
};

export type ProjectsContentInput = {
  subTitle: string;
  title: string;
  intro: string;
  projects: ProjectFormItem[];
};

function throwOnError(error: { message: string } | null): asserts error is null {
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchProjectsContent(): Promise<ProjectsContent> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects_content")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    return mergeProjectsContent(null);
  }

  return mergeProjectsContent(data);
}

export function projectsContentToInput(content: ProjectsContent): ProjectsContentInput {
  return {
    subTitle: content.subTitle,
    title: content.title,
    intro: content.intro,
    projects: content.projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      href: project.href,
      imageUrl: project.imageUrl ?? "",
      frameworksInput: formatProjectFrameworksInput(project.frameworks),
    })),
  };
}

export function projectsInputToRow(
  input: ProjectsContentInput,
  userId: string
): ProjectsContentUpdate & { id: string; updated_by: string } {
  return {
    id: "default",
    section_subtitle: input.subTitle.trim() || DEFAULT_PROJECTS_CONTENT.subTitle,
    section_title: input.title.trim() || DEFAULT_PROJECTS_CONTENT.title,
    section_intro: input.intro.trim() || DEFAULT_PROJECTS_CONTENT.intro,
    projects: input.projects.map((project) => ({
      id: project.id,
      name: project.name.trim(),
      description: project.description.trim(),
      href: project.href.trim(),
      imageUrl: project.imageUrl?.trim() ?? "",
      frameworks: parseProjectFrameworksInput(project.frameworksInput),
    })),
    updated_by: userId,
  };
}

export async function upsertProjectsContent(input: ProjectsContentInput): Promise<ProjectsContent> {
  const userId = await requireAdminId();
  const supabase = createClient();
  const row = projectsInputToRow(input, userId);

  const { data, error } = await supabase
    .from("projects_content")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();

  throwOnError(error);
  return mergeProjectsContent(data);
}

export function newEmptyFormItem(id: number): ProjectFormItem {
  return { id, name: "", description: "", href: "", imageUrl: "", frameworksInput: "" };
}

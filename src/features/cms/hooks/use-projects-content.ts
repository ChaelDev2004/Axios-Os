"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import {
  fetchProjectsContent,
  upsertProjectsContent,
  type ProjectsContentInput,
} from "@/features/cms/services/projects-content.service";
import type { ProjectsContent } from "@/lib/projects-content-defaults";

export const projectsContentKeys = {
  all: ["projects-content"] as const,
  detail: () => [...projectsContentKeys.all, "default"] as const,
};

type QueryOpts = Omit<UseQueryOptions<ProjectsContent, Error>, "queryKey" | "queryFn">;

export function useProjectsContent(options?: QueryOpts) {
  return useQuery({
    queryKey: projectsContentKeys.detail(),
    queryFn: fetchProjectsContent,
    staleTime: 60_000,
    ...options,
  });
}

export function useUpsertProjectsContent(options?: {
  onSuccess?: (data: ProjectsContent) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProjectsContentInput) => upsertProjectsContent(input),
    onSuccess: (data) => {
      queryClient.setQueryData(projectsContentKeys.detail(), data);
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import {
  fetchAboutContent,
  upsertAboutContent,
  type AboutContentInput,
} from "@/features/cms/services/about-content.service";
import type { AboutContent } from "@/lib/about-content-defaults";

export const aboutContentKeys = {
  all: ["about-content"] as const,
  detail: () => [...aboutContentKeys.all, "default"] as const,
};

type QueryOpts = Omit<UseQueryOptions<AboutContent, Error>, "queryKey" | "queryFn">;

export function useAboutContent(options?: QueryOpts) {
  return useQuery({
    queryKey: aboutContentKeys.detail(),
    queryFn: fetchAboutContent,
    staleTime: 60_000,
    ...options,
  });
}

export function useUpsertAboutContent(options?: {
  onSuccess?: (data: AboutContent) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AboutContentInput) => upsertAboutContent(input),
    onSuccess: (data) => {
      queryClient.setQueryData(aboutContentKeys.detail(), data);
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

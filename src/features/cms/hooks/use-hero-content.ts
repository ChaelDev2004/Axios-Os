"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import {
  fetchHeroContent,
  upsertHeroContent,
  type HeroContentInput,
} from "@/features/cms/services/hero-content.service";
import type { HeroContent } from "@/lib/hero-content-defaults";

export const heroContentKeys = {
  all: ["hero-content"] as const,
  detail: () => [...heroContentKeys.all, "default"] as const,
};

type QueryOpts = Omit<UseQueryOptions<HeroContent, Error>, "queryKey" | "queryFn">;

export function useHeroContent(options?: QueryOpts) {
  return useQuery({
    queryKey: heroContentKeys.detail(),
    queryFn: fetchHeroContent,
    staleTime: 60_000,
    ...options,
  });
}

export function useUpsertHeroContent(options?: {
  onSuccess?: (data: HeroContent) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: HeroContentInput) => upsertHeroContent(input),
    onSuccess: (data) => {
      queryClient.setQueryData(heroContentKeys.detail(), data);
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

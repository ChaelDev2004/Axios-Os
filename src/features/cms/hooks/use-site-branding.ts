"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import {
  fetchSiteBranding,
  upsertSiteBranding,
  type SiteBrandingInput,
} from "@/features/cms/services/site-branding.service";
import type { SiteBranding } from "@/lib/site-branding-defaults";

export const siteBrandingKeys = {
  all: ["site-branding"] as const,
  detail: () => [...siteBrandingKeys.all, "default"] as const,
};

type QueryOpts = Omit<UseQueryOptions<SiteBranding, Error>, "queryKey" | "queryFn">;

export function useSiteBranding(options?: QueryOpts) {
  return useQuery({
    queryKey: siteBrandingKeys.detail(),
    queryFn: fetchSiteBranding,
    staleTime: 60_000,
    ...options,
  });
}

export function useUpsertSiteBranding(options?: {
  onSuccess?: (data: SiteBranding) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SiteBrandingInput) => upsertSiteBranding(input),
    onSuccess: (data) => {
      queryClient.setQueryData(siteBrandingKeys.detail(), data);
      void queryClient.invalidateQueries({ queryKey: siteBrandingKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

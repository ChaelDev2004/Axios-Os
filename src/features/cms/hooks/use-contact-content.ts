"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import {
  fetchContactContent,
  upsertContactContent,
  type ContactContentInput,
} from "@/features/cms/services/contact-content.service";
import type { ContactContent } from "@/lib/contact-content-defaults";

export const contactContentKeys = {
  all: ["contact-content"] as const,
  detail: () => [...contactContentKeys.all, "default"] as const,
};

type QueryOpts = Omit<UseQueryOptions<ContactContent, Error>, "queryKey" | "queryFn">;

export function useContactContent(options?: QueryOpts) {
  return useQuery({
    queryKey: contactContentKeys.detail(),
    queryFn: fetchContactContent,
    staleTime: 60_000,
    ...options,
  });
}

export function useUpsertContactContent(options?: {
  onSuccess?: (data: ContactContent) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ContactContentInput) => upsertContactContent(input),
    onSuccess: (data) => {
      queryClient.setQueryData(contactContentKeys.detail(), data);
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

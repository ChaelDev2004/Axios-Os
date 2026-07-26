"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConnectivityStore } from "@/features/offline/stores/connectivity.store";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Critical for offline-first: do not pause queries when Wi‑Fi drops.
        networkMode: "offlineFirst",
        retry: (failureCount) => {
          if (!useConnectivityStore.getState().online) {
            return false;
          }
          return failureCount < 1;
        },
      },
      mutations: {
        networkMode: "offlineFirst",
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

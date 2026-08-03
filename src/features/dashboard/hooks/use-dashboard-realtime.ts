"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { dashboardKeys } from "@/features/dashboard/query-keys";

const REALTIME_TABLES = [
  "tasks",
  "notes",
  "notifications",
  "transactions",
  "pomodoro_sessions",
  "projects",
  "portfolio_projects",
  "portfolio_view_events",
  "landing_page_visits",
  "ai_conversations",
] as const;

type RealtimeTable = (typeof REALTIME_TABLES)[number];

function invalidateForTable(
  queryClient: ReturnType<typeof useQueryClient>,
  table: RealtimeTable
) {
  switch (table) {
    case "tasks":
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.tasks.all() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      break;
    case "notes":
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.notes.all() });
      break;
    case "notifications":
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.notifications.all() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      break;
    case "transactions":
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.transactions.all() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      break;
    case "pomodoro_sessions":
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.pomodoro.all() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      break;
    case "projects":
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.projects.all() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      break;
    case "portfolio_projects":
    case "portfolio_view_events":
    case "landing_page_visits":
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.portfolio.all() });
      void queryClient.invalidateQueries({
        queryKey: dashboardKeys.portfolio.landingVisits(),
      });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      break;
    case "ai_conversations":
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.ai.all() });
      break;
    default:
      break;
  }
}

/** Subscribes to Supabase realtime changes and invalidates related React Query keys. */
export function useDashboardRealtime(enabled = true): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channel = supabase.channel("dashboard-realtime");

    for (const table of REALTIME_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          invalidateForTable(queryClient, table);
        }
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}

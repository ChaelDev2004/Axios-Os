"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ExternalLink } from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { AccountProfileEditor } from "@/features/auth/components/AccountProfileEditor";
import { DashboardClient } from "@/features/auth/components/DashboardClient";
import { HeroCmsEditor } from "@/features/cms/components/HeroCmsEditor";
import { AboutCmsEditor } from "@/features/cms/components/AboutCmsEditor";
import { ProjectsCmsEditor } from "@/features/cms/components/ProjectsCmsEditor";
import { ContactCmsEditor } from "@/features/cms/components/ContactCmsEditor";
import { SiteBrandingCmsEditor } from "@/features/cms/components/SiteBrandingCmsEditor";
import { useDashboardNav } from "@/components/dashboard/dashboard-context";
import { useDashboardRealtime } from "@/features/dashboard/hooks/use-dashboard-realtime";
import { useDashboardStats } from "@/features/dashboard/hooks/use-dashboard-queries";
import { useConnectivityStore } from "@/features/offline/stores/connectivity.store";
import { buildOfflineProfileStub } from "@/features/offline/lib/profile-cache";

import { FocusMusicSettings } from "@/components/axion/views/focus-music-settings";
import { OfflineSettingsPanel } from "@/components/axion/views/offline-settings";
import { OverviewView } from "@/components/axion/views/overview-view";
import { TasksView } from "@/components/axion/views/tasks-view";
import { FocusView } from "@/components/axion/views/focus-view";
import { FinanceView } from "@/components/axion/views/finance-view";
import { PortfolioView } from "@/components/axion/views/portfolio-view";
import { ProjectsView } from "@/components/axion/views/projects-view";
import { CalendarView } from "@/components/axion/views/calendar-view";
import { AnalyticsView } from "@/components/axion/views/analytics-view";
import { AiView } from "@/components/axion/views/ai-view";
import { NotificationsView } from "@/components/axion/views/notifications-view";
import { NotesView } from "@/components/axion/views/notes-view";
import { DashboardSkeleton } from "@/components/axion/views/shared";

export function AxionDashboard() {
  const { active, search } = useDashboardNav();
  const { user, profile, loading } = useAuth();
  const online = useConnectivityStore((s) => s.online);
  const { isLoading: statsLoading, isError: statsError, isFetching } =
    useDashboardStats({
      retry: online ? 1 : false,
    });
  const reduceMotion = useReducedMotion();
  useDashboardRealtime(online);

  // Online: wait for first stats load. Offline: render immediately from IndexedDB.
  const waitingOnStats = online && statsLoading && !statsError && isFetching;

  if (loading || waitingOnStats) {
    return <DashboardSkeleton />;
  }

  const resolvedProfile =
    profile ?? (user ? buildOfflineProfileStub(user) : null);

  if (!resolvedProfile) {
    return (
      <div className="axion-card text-center text-sm text-slate-400">
        Profile not found. Please sign in again.
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={active}
        initial={
          reduceMotion
            ? { opacity: 0 }
            : { opacity: 0, y: 24, scale: 0.985, filter: "blur(8px)" }
        }
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
        }}
        exit={
          reduceMotion
            ? { opacity: 0 }
            : { opacity: 0, y: -10, filter: "blur(4px)" }
        }
        transition={{
          duration: reduceMotion ? 0.12 : 0.48,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="axion-stack"
      >
        {statsError && online ? (
          <div className="axion-card border-amber-500/30 text-sm text-amber-200">
            Could not load live metrics. Run <code className="text-xs">supabase/schema.sql</code> in
            your Supabase SQL editor, then refresh. Widgets below will stay empty until tables exist.
          </div>
        ) : null}
        {active === "dashboard" && <OverviewView />}
        {active === "portfolio" && <PortfolioView />}
        {active === "projects" && <ProjectsView />}
        {active === "tasks" && <TasksView />}
        {active === "notes" && <NotesView />}
        {active === "pomodoro" && <FocusView />}
        {active === "cashflow" && <FinanceView />}
        {active === "calendar" && <CalendarView />}
        {active === "analytics" && <AnalyticsView />}
        {active === "assistant" && <AiView />}
        {active === "notifications" && <NotificationsView />}
        {active === "settings" && (
          <>
            <AccountProfileEditor />

            <div className="axion-card mt-6">
              <div className="axion-kicker">Site</div>
              <h2 className="axion-title">Landing page</h2>
              <p className="axion-body">
                Open the public portfolio landing page to preview how visitors see your site.
              </p>
              <Link
                href="/"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-foreground transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
              >
                <ExternalLink className="h-4 w-4" />
                View landing page
              </Link>
            </div>

            <FocusMusicSettings />

            <OfflineSettingsPanel />

            <div className="axion-card mt-6">
              <DashboardClient
                profile={resolvedProfile}
                email={user?.email ?? resolvedProfile.email}
              />
            </div>
            {resolvedProfile.role === "admin" ? (
              <>
                <SiteBrandingCmsEditor />
                <HeroCmsEditor />
                <AboutCmsEditor />
                <ProjectsCmsEditor />
                <ContactCmsEditor />
              </>
            ) : null}
          </>
        )}
        {search.trim() && active === "dashboard" ? (
          <div className="text-xs text-slate-500">
            Filtering with “{search}” across Axion…
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}

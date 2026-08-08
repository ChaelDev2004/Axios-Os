"use client";

import { createContext, useContext } from "react";

export type DashboardSection =
  | "dashboard"
  | "portfolio"
  | "projects"
  | "tasks"
  | "notes"
  | "vault"
  | "pomodoro"
  | "cashflow"
  | "calendar"
  | "analytics"
  | "assistant"
  | "notifications"
  | "settings";

export interface DashboardNavState {
  active: DashboardSection;
  setActive: (next: DashboardSection) => void;
  search: string;
  setSearch: (next: string) => void;
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (next: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (next: boolean) => void;
}

const DashboardNavContext = createContext<DashboardNavState | null>(null);

export function useDashboardNav() {
  const ctx = useContext(DashboardNavContext);
  if (!ctx) {
    throw new Error("useDashboardNav must be used within DashboardNavContext");
  }
  return ctx;
}

export function DashboardNavProvider({
  value,
  children,
}: {
  value: DashboardNavState;
  children: React.ReactNode;
}) {
  return (
    <DashboardNavContext.Provider value={value}>
      {children}
    </DashboardNavContext.Provider>
  );
}

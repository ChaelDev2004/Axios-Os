"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Home,
  LayoutDashboard,
  LineChart,
  ListTodo,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  Sun,
  Timer,
  Wallet,
  Workflow,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useConnectivityStore } from "@/features/offline/stores/connectivity.store";
import {
  DashboardNavProvider,
  type DashboardSection,
  useDashboardNav,
} from "@/components/dashboard/dashboard-context";
import { CommandPalette } from "@/components/axion/command-palette";
import { DailyReminderAlert } from "@/components/axion/daily-reminder-alert";
import { FinancialReminder } from "@/components/axion/financial-reminder";
import { IncompleteTaskReminder } from "@/components/axion/incomplete-task-reminder";
import { NoteReminder } from "@/components/axion/note-reminder";
import {
  SidebarAvatar,
  SidebarProfileEditor,
} from "@/components/axion/sidebar-profile-editor";
import { TopBarMenus } from "@/components/axion/top-bar-menus";
import { SiteBrandingApplier } from "@/features/cms/components/SiteBrandingApplier";
import { useSiteBranding } from "@/features/cms/hooks/use-site-branding";
import { APP_LOGO_URL, DEFAULT_SITE_BRANDING } from "@/lib/site-branding-defaults";
import {
  InteractiveMenu,
  type InteractiveMenuItem,
} from "@/components/ui/modern-mobile-menu";

function TopBarMenusClient(
  props: ComponentProps<typeof TopBarMenus>
) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) {
    return (
      <div className="axion-topbar-menus flex shrink-0 items-center gap-1">
        <span className="axion-notif-trigger" aria-hidden>
          <Bell />
        </span>
        <span className="axion-user-trigger flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xs font-bold text-white">
          …
        </span>
      </div>
    );
  }

  return (
    <div className="axion-topbar-menus flex shrink-0 items-center gap-1">
      <TopBarMenus {...props} />
    </div>
  );
}

const NAV_GROUPS: Array<{
  name: string;
  items: Array<{ id: DashboardSection; label: string; icon: ReactNode }>;
}> = [
  {
    name: "Main",
    items: [
      { id: "dashboard", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
      { id: "portfolio", label: "Portfolio", icon: <BriefcaseBusiness className="h-4 w-4" /> },
      { id: "projects", label: "Projects", icon: <Workflow className="h-4 w-4" /> },
      { id: "tasks", label: "Tasks", icon: <ListTodo className="h-4 w-4" /> },
      { id: "notes", label: "Notes", icon: <StickyNote className="h-4 w-4" /> },
    ],
  },
  {
    name: "Productivity",
    items: [
      { id: "pomodoro", label: "Focus Hub", icon: <Timer className="h-4 w-4" /> },
      { id: "cashflow", label: "Finance", icon: <Wallet className="h-4 w-4" /> },
      { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
    ],
  },
  {
    name: "Insights",
    items: [
      { id: "analytics", label: "Analytics", icon: <LineChart className="h-4 w-4" /> },
      { id: "assistant", label: "AI Workspace", icon: <Sparkles className="h-4 w-4" /> },
    ],
  },
  {
    name: "Account",
    items: [
      { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
      { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap((group) => group.items);

const navItemRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "0.45rem",
  width: "100%",
  textAlign: "left",
};

const navLabelStyle: CSSProperties = {
  flex: "0 1 auto",
  minWidth: 0,
  marginLeft: 0,
  textAlign: "left",
  whiteSpace: "nowrap",
};

const navDividerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  margin: "0.65rem 0.35rem 0.35rem",
  padding: 0,
  minWidth: 0,
};

const navDividerTextStyle: CSSProperties = {
  flexShrink: 0,
  fontSize: "0.62rem",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(148, 163, 184, 0.72)",
  lineHeight: 1,
};

const navDividerLineStyle: CSSProperties = {
  flex: 1,
  height: 1,
  minWidth: "0.75rem",
  background:
    "linear-gradient(90deg, rgba(148,163,184,0.28) 0%, rgba(148,163,184,0.05) 100%)",
};

function NavSectionDivider({ name, collapsed }: { name: string; collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div
        aria-hidden
        style={{
          height: 1,
          margin: "0.45rem 0.55rem",
          background: "rgba(148,163,184,0.18)",
        }}
      />
    );
  }

  return (
    <div style={navDividerStyle} role="presentation">
      <span style={navDividerTextStyle}>{name}</span>
      <span style={navDividerLineStyle} aria-hidden />
    </div>
  );
}

function Particles() {
  const dots = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${(i * 17) % 100}%`,
        delay: `${(i % 9) * 0.7}s`,
        duration: `${10 + (i % 6)}s`,
        opacity: 0.25 + (i % 4) * 0.1,
      })),
    []
  );

  return (
    <div className="axion-particles" aria-hidden="true">
      {dots.map((d) => (
        <span
          key={d.id}
          className="axion-particle"
          style={{
            left: d.left,
            animationDelay: d.delay,
            animationDuration: d.duration,
            opacity: d.opacity,
          }}
        />
      ))}
    </div>
  );
}

function OfflineModeBadge() {
  const [mounted, setMounted] = useState(false);
  const online = useConnectivityStore((s) => s.online);
  const pendingCount = useConnectivityStore((s) => s.pendingCount);
  const setActive = useDashboardNav().setActive;

  useEffect(() => setMounted(true), []);

  // Avoid SSR/client mismatch: navigator.onLine is only known after mount.
  if (!mounted || (online && pendingCount === 0)) return null;

  return (
    <button
      type="button"
      onClick={() => setActive("settings")}
      className={cn(
        "inline-flex h-8 max-w-[9.5rem] items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-semibold tracking-wide sm:max-w-none sm:px-3 sm:text-xs",
        online
          ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
          : "border-amber-500/35 bg-amber-500/15 text-amber-100"
      )}
      aria-label={online ? `${pendingCount} changes pending sync` : "Offline Mode"}
      title={online ? "Open sync settings" : "Working offline — changes sync when online"}
    >
      <CloudOff className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">
        {online ? `${pendingCount} pending` : "Offline Mode"}
      </span>
    </button>
  );
}

function TopBar() {
  const { active, setCommandOpen, search, setActive, setMobileMenuOpen } =
    useDashboardNav();
  const { setTheme, resolvedTheme } = useTheme();
  const { user, profile } = useAuth();
  const { data: branding } = useSiteBranding();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const appName = branding?.appName || DEFAULT_SITE_BRANDING.appName;
  const name =
    profile?.full_name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "User");
  const email = user?.email ?? "";
  const role = profile?.role?.trim() || "member";

  // Fix: Better keyboard shortcut tooltip
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      setCommandOpen(true);
    }
  };

  return (
    <header className="axion-topbar">
      <div className="axion-topbar-left flex shrink-0 items-center">
        <button
          type="button"
          className="axion-topbar-btn axion-mobile-menu-btn"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu />
        </button>

        <div className="hidden min-w-36 items-center gap-3 lg:flex">
          <img
            src={APP_LOGO_URL}
            alt=""
            className="h-12 w-12 rounded-2xl object-contain shadow-lg shadow-indigo-500/15"
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight text-foreground">
              {NAV.find((n) => n.id === active)?.label ?? appName}
            </div>
            <div className="truncate text-[10px] text-muted-foreground">{appName}</div>
          </div>
        </div>
      </div>

      <div className="axion-topbar-search hidden min-w-0 flex-1 items-center justify-center px-3 sm:flex lg:px-10">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex h-10 w-full max-w-xl items-center gap-3 rounded-full border border-border bg-background/50 px-6 text-left text-sm text-muted-foreground transition hover:border-primary/30 hover:bg-background/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">
            {search || "Search or jump…"}
          </span>
          <kbd className="hidden shrink-0 rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="axion-topbar-actions flex shrink-0 items-center gap-0.5 sm:gap-1.5">
        <OfflineModeBadge />
        <button
          type="button"
          className="axion-topbar-btn sm:hidden"
          aria-label="Search"
          onClick={() => setCommandOpen(true)}
        >
          <Search />
        </button>
        <button
          type="button"
          className="axion-topbar-btn hidden sm:inline-flex"
          aria-label="Quick add"
          onClick={() => {
            setActive("tasks");
            toast.message("Quick add — create a task");
          }}
        >
          <Plus />
        </button>
        <button
          type="button"
          className="axion-topbar-btn hidden sm:inline-flex"
          aria-label="AI Workspace"
          onClick={() => setActive("assistant")}
        >
          <Sparkles />
        </button>
        <button
          type="button"
          className="axion-topbar-btn"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {mounted && resolvedTheme === "dark" ? <Sun /> : <Moon />}
        </button>

        <TopBarMenusClient
          name={name}
          email={email}
          role={role}
          avatarUrl={profile?.avatar_url}
          onOpenSettings={() => setActive("settings")}
          onViewAllNotifications={() => setActive("notifications")}
        />
      </div>
    </header>
  );
}

function Sidebar({
  collapsed,
  onToggle,
  onlineLabel,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onlineLabel: string;
}) {
  const { active, setActive, setMobileMenuOpen } = useDashboardNav();
  const { user, profile } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const userName =
    profile?.full_name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "User");
  const isOnline = !onlineLabel.toLowerCase().includes("offline");

  return (
    <>
      <aside
        className={cn("axion-sidebar", collapsed && "is-collapsed")}
        aria-label="Main navigation"
      >
        <div className={cn("axion-sidebar-header", collapsed && "is-collapsed")}>
          <button
            type="button"
            className={cn(
              "axion-sidebar-profile w-full rounded-xl text-left transition hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40",
              collapsed && "is-collapsed justify-center"
            )}
            onClick={() => setProfileOpen(true)}
            aria-label="Edit profile"
            title="Edit profile"
          >
            <SidebarAvatar name={userName} avatarUrl={profile?.avatar_url} />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold tracking-tight text-white">
                  {userName}
                </div>
                <div
                  className={cn(
                    "mt-1 flex items-center gap-1.5 text-xs font-medium",
                    isOnline ? "text-emerald-400" : "text-amber-300"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      isOnline
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]"
                        : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                    )}
                  />
                  {onlineLabel}
                </div>
                <div className="mt-1 truncate text-[10px] text-slate-500">
                  Tap to edit profile
                </div>
              </div>
            )}
          </button>
        </div>

        <nav
          className={cn("axion-sidebar-nav", collapsed && "is-collapsed")}
          role="navigation"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.name}>
              <NavSectionDivider name={group.name} collapsed={collapsed} />
              {group.items.map((item) => {
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => {
                      setActive(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "axion-nav-item",
                      collapsed && "is-collapsed",
                      isActive && "is-active"
                    )}
                    style={collapsed ? undefined : navItemRowStyle}
                  >
                    <span
                      className="axion-nav-icon"
                      style={{ display: "inline-flex", flexShrink: 0, marginRight: 0 }}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className="axion-nav-label" style={navLabelStyle}>
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={cn("axion-sidebar-footer", collapsed && "is-collapsed")}>
          {!collapsed && (
            <button
              type="button"
              className="axion-sidebar-footer-btn"
              aria-label="Notifications shortcut"
              title="Notifications"
              onClick={() => setActive("notifications")}
            >
              N
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="axion-sidebar-footer-btn"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>

      <SidebarProfileEditor open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}

function MobileDrawer({ onlineLabel }: { onlineLabel: string }) {
  const { isMobileMenuOpen, setMobileMenuOpen, active, setActive } =
    useDashboardNav();
  const { user, profile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const userName =
    profile?.full_name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "User");
  const isOnline = !onlineLabel.toLowerCase().includes("offline");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileMenuOpen]);

  if (!mounted) return null;

  return (
    <>
      {createPortal(
        (
          <AnimatePresence>
            {isMobileMenuOpen ? (
              <>
                <motion.button
                  type="button"
                  aria-label="Close menu"
                  className="fixed inset-0 z-[10020] bg-black/65 backdrop-blur-md lg:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileMenuOpen(false)}
                />
                <motion.aside
                  className="axion-sidebar axion-sidebar-mobile lg:hidden"
                  initial={{ x: -28, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -28, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Mobile navigation"
                >
                  <div className="axion-sidebar-header">
                    <button
                      type="button"
                      className="axion-sidebar-profile min-w-0 flex-1 rounded-xl text-left transition hover:bg-white/[0.04]"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setProfileOpen(true);
                      }}
                      aria-label="Edit profile"
                    >
                      <SidebarAvatar name={userName} avatarUrl={profile?.avatar_url} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-semibold tracking-tight text-white">
                          {userName}
                        </div>
                        <div
                          className={cn(
                            "mt-1 flex items-center gap-1.5 text-xs font-medium",
                            isOnline ? "text-emerald-400" : "text-amber-300"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              isOnline
                                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]"
                                : "bg-slate-500"
                            )}
                          />
                          {onlineLabel}
                        </div>
                        <div className="mt-1 truncate text-[10px] text-slate-500">
                          Tap to edit profile
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(false)}
                      className="axion-sidebar-footer-btn"
                      aria-label="Close navigation"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <nav className="axion-sidebar-nav" role="navigation">
                    {NAV_GROUPS.map((group) => (
                      <div key={group.name}>
                        <NavSectionDivider name={group.name} />
                        {group.items.map((item) => {
                          const isActive = active === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              title={item.label}
                              aria-label={item.label}
                              aria-current={isActive ? "page" : undefined}
                              onClick={() => {
                                setActive(item.id);
                                setMobileMenuOpen(false);
                              }}
                              className={cn("axion-nav-item", isActive && "is-active")}
                              style={navItemRowStyle}
                            >
                              <span
                                className="axion-nav-icon"
                                style={{
                                  display: "inline-flex",
                                  flexShrink: 0,
                                  marginRight: 0,
                                }}
                              >
                                {item.icon}
                              </span>
                              <span className="axion-nav-label" style={navLabelStyle}>
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </nav>

                  <div className="axion-sidebar-footer">
                    <button
                      type="button"
                      className="axion-sidebar-footer-btn"
                      aria-label="Notifications shortcut"
                      title="Notifications"
                      onClick={() => {
                        setActive("notifications");
                        setMobileMenuOpen(false);
                      }}
                    >
                      N
                    </button>
                    <button
                      type="button"
                      className="axion-sidebar-footer-btn"
                      aria-label="Close navigation"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </motion.aside>
              </>
            ) : null}
          </AnimatePresence>
        ),
        document.body
      )}
      <SidebarProfileEditor open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}

const MOBILE_TABS: Array<{
  id: DashboardSection;
  label: string;
  icon: InteractiveMenuItem["icon"];
}> = [
  { id: "dashboard", label: "home", icon: Home },
  { id: "tasks", label: "tasks", icon: ListTodo },
  { id: "pomodoro", label: "focus", icon: Timer },
  { id: "cashflow", label: "finance", icon: Wallet },
  { id: "assistant", label: "ai", icon: Sparkles },
];

const MOBILE_MENU_ITEMS: InteractiveMenuItem[] = MOBILE_TABS.map(
  ({ label, icon }) => ({ label, icon })
);

function useMobileTabSwipe(
  active: DashboardSection,
  setActive: (next: DashboardSection) => void,
  enabled: boolean
) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startRef.current = { x: t.clientX, y: t.clientY };
    };

    const onEnd = (e: TouchEvent) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start) return;

      const t = e.changedTouches[0];
      if (!t) return;

      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // Horizontal swipe only (ignore mostly-vertical scrolls).
      if (absX < 56 || absX < absY * 1.35) return;

      const idx = MOBILE_TABS.findIndex((tab) => tab.id === active);
      if (idx < 0) return;

      if (dx < 0 && idx < MOBILE_TABS.length - 1) {
        setActive(MOBILE_TABS[idx + 1]!.id);
      } else if (dx > 0 && idx > 0) {
        setActive(MOBILE_TABS[idx - 1]!.id);
      }
    };

    const onCancel = () => {
      startRef.current = null;
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onCancel);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
    };
  }, [active, enabled, setActive]);
}

function MobileBottomNav() {
  const { active, setActive } = useDashboardNav();
  const activeIndex = MOBILE_TABS.findIndex((tab) => tab.id === active);

  return (
    <div className="axion-bottom-nav pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3 lg:hidden">
      <div className="pointer-events-auto mx-auto w-full max-w-lg">
        <InteractiveMenu
          items={MOBILE_MENU_ITEMS}
          activeIndex={activeIndex}
          onItemSelect={(index) => {
            const next = MOBILE_TABS[index];
            if (next) setActive(next.id);
          }}
          accentColor="var(--component-active-color-default)"
        />
      </div>
    </div>
  );
}

export function AxionShell({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  const [active, setActive] = useState<DashboardSection>("dashboard");
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const online = useConnectivityStore((s) => s.online);
  const pendingCount = useConnectivityStore((s) => s.pendingCount);

  useEffect(() => setThemeMounted(true), []);

  const [isMobileViewport, setIsMobileViewport] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useMobileTabSwipe(active, setActive, isMobileViewport && !mobileMenuOpen && !commandOpen);

  // Fix: Improved keyboard shortcuts with better handling
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      // Cmd+K / Ctrl+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }

      // Escape to close modals
      if (e.key === "Escape") {
        if (commandOpen) {
          setCommandOpen(false);
        } else if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
        return;
      }

      // Don't trigger shortcuts while typing in inputs
      if (typing) return;

      // Alt+ shortcuts
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case "n":
            e.preventDefault();
            setActive("tasks");
            toast.message("New Task");
            break;
          case "p":
            e.preventDefault();
            setActive("projects");
            toast.message("New Project");
            break;
          case "f":
            e.preventDefault();
            setActive("pomodoro");
            toast.success("Focus session");
            break;
        }
        return;
      }

      // / to open command palette
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !typing) {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen, mobileMenuOpen]);

  const value = useMemo(
    () => ({
      active,
      setActive,
      search,
      setSearch,
      isMobileMenuOpen: mobileMenuOpen,
      setMobileMenuOpen,
      commandOpen,
      setCommandOpen,
    }),
    [active, mobileMenuOpen, search, commandOpen]
  );

  const isDark = !themeMounted || resolvedTheme !== "light";

  return (
    <DashboardNavProvider value={value}>
      <div
        className={cn(
          "axion",
          isDark && "dark",
          sidebarCollapsed && "is-sidebar-collapsed"
        )}
      >
        <SiteBrandingApplier />
        <Particles />
        <TopBar />
        <div className="axion-shell">
          <div
            className={cn("axion-rail", sidebarCollapsed && "is-collapsed")}
            aria-hidden="true"
          />
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
            onlineLabel={
              online
                ? pendingCount > 0
                  ? `Online · ${pendingCount} pending`
                  : "Online"
                : "Offline Mode"
            }
          />
          <MobileDrawer
            onlineLabel={online ? "Online" : "Offline Mode"}
          />
          <div className="axion-panel">
            <main className="axion-main">
              <div className="axion-main-inner">{children}</div>
            </main>
          </div>
        </div>
        <button
          type="button"
          className="axion-fab"
          aria-label="Open command palette"
          onClick={() => setCommandOpen(true)}
        >
          <Plus className="h-5 w-5" />
        </button>
        <MobileBottomNav />
        <CommandPalette />
        <DailyReminderAlert />
        <IncompleteTaskReminder />
        <FinancialReminder />
        <NoteReminder />
      </div>
    </DashboardNavProvider>
  );
}
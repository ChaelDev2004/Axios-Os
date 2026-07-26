"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  BriefcaseBusiness,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  Timer,
  Wallet,
  Workflow,
  ListTodo,
  Plus,
  Sun,
  Moon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Separator } from "@radix-ui/react-separator";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { logoutAction } from "@/features/auth/actions/auth.actions";

import {
  DashboardNavProvider,
  type DashboardSection,
  useDashboardNav,
} from "@/components/dashboard/dashboard-context";

const NAV_ITEMS: Array<{
  id: DashboardSection;
  label: string;
  icon: ReactNode;
}> = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "portfolio", label: "Portfolio", icon: <BriefcaseBusiness className="h-4 w-4" /> },
  { id: "projects", label: "Projects", icon: <Workflow className="h-4 w-4" /> },
  { id: "tasks", label: "Tasks", icon: <ListTodo className="h-4 w-4" /> },
  { id: "pomodoro", label: "Pomodoro", icon: <Timer className="h-4 w-4" /> },
  { id: "cashflow", label: "Cash Flow", icon: <Wallet className="h-4 w-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { id: "analytics", label: "Analytics", icon: <LineChart className="h-4 w-4" /> },
  { id: "assistant", label: "AI Assistant", icon: <Sparkles className="h-4 w-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

function formatOnline(online: boolean) {
  return online ? "Online" : "Offline";
}

function useOnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}

function LogoutActionItem({ onDone }: { onDone?: () => void }) {
  const formRef = useRef<HTMLFormElement | null>(null);
  return (
    <>
      <form ref={formRef} action={logoutAction} className="hidden" />
      <DropdownMenu.Item
        onSelect={(event) => {
          event.preventDefault();
          void (async () => {
            try {
              formRef.current?.requestSubmit();
            } catch {
              toast.error("Logout failed. Please try again.");
            } finally {
              onDone?.();
            }
          })();
        }}
        className="cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
      >
        Logout
      </DropdownMenu.Item>
    </>
  );
}

function TopNav({
  onOpenQuickAdd,
  searchValue,
  onChangeSearch,
}: {
  onOpenQuickAdd: () => void;
  searchValue: string;
  onChangeSearch: (v: string) => void;
}) {
  const { active } = useDashboardNav();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  return (
    <header className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="flex h-full w-full items-center justify-between gap-3 px-3 sm:gap-4 sm:px-4 lg:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-3 lg:w-72">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-10 sm:w-10 sm:rounded-2xl">
            <span className="text-sm font-semibold tracking-tight">ED</span>
          </div>
          <Separator orientation="vertical" className="hidden h-6 md:block" />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">
              {NAV_ITEMS.find((x) => x.id === active)?.label ?? "Dashboard"}
            </div>
            <div className="hidden text-xs text-muted-foreground sm:block">
              Workspace overview
            </div>
          </div>
        </div>

        <div className="mx-auto hidden min-w-0 flex-1 items-center justify-center px-4 md:flex">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="Search projects, tasks, analytics…"
              className="h-10 rounded-full border-border/60 bg-background/40 pl-9 shadow-none focus-visible:ring-primary/40"
              aria-label="Global search"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-10 rounded-full bg-background/30"
            onClick={onOpenQuickAdd}
            aria-label="Quick add"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="hidden h-10 w-10 rounded-full bg-background/30 sm:inline-flex"
            aria-label="Notifications"
            onClick={() => toast.message("Notifications panel coming soon")}
          >
            <Bell className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="hidden h-10 w-10 rounded-full bg-background/30 sm:inline-flex"
            aria-label="Messages"
            onClick={() => toast.message("Messages panel coming soon")}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="hidden h-6 lg:block" />

          <Button
            type="button"
            variant="ghost"
            className="h-10 w-10 rounded-full bg-background/30"
            aria-label="Toggle dark mode"
            onClick={() => {
              const nextTheme = theme === "dark" ? "light" : "dark";
              void setTheme(nextTheme);
            }}
          >
            {themeMounted && resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function UserMenu() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const { setActive } = useDashboardNav();

  const fullName = profile?.full_name?.trim() || user?.email || "User";
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const router = useRouter();

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-3 rounded-full border border-border/60 bg-background/30 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="User menu"
        >
          <Avatar className="h-9 w-9 overflow-hidden rounded-full border border-border bg-card">
            <AvatarImage alt={fullName} src={undefined} />
            <AvatarFallback>{initials || "U"}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        sideOffset={8}
        align="end"
        className="w-56 rounded-xl border border-border/70 bg-background/90 p-1 shadow-lg backdrop-blur-xl"
      >
        <DropdownMenu.Label className="px-2 pb-1 pt-2 text-xs text-muted-foreground">
          {fullName}
        </DropdownMenu.Label>
        <DropdownMenu.Separator className="my-1 bg-border/60" />

        <DropdownMenu.Item
          className="cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
          onSelect={(e) => {
            e.preventDefault();
            setActive("dashboard");
            router.push("/dashboard");
            setOpen(false);
          }}
        >
          My Profile
        </DropdownMenu.Item>
        <DropdownMenu.Item
          className="cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
          onSelect={(e) => {
            e.preventDefault();
            setActive("settings");
            router.push("/dashboard");
            setOpen(false);
          }}
        >
          Security
        </DropdownMenu.Item>
        <DropdownMenu.Item
          className="cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
          onSelect={(e) => {
            e.preventDefault();
            router.push("/auth/setup-pin");
            setOpen(false);
          }}
        >
          Change PIN
        </DropdownMenu.Item>
        <DropdownMenu.Item
          className="cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
          onSelect={(e) => {
            e.preventDefault();
            setActive("settings");
            router.push("/dashboard");
            setOpen(false);
          }}
        >
          Account Settings
        </DropdownMenu.Item>

        <DropdownMenu.Separator className="my-1 bg-border/60" />

        <LogoutActionItem onDone={() => setOpen(false)} />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

function Sidebar({
  onlineLabel,
  userName,
  collapsed,
  onToggleCollapsed,
}: {
  onlineLabel: string;
  userName: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { active, setActive } = useDashboardNav();

  return (
    <aside
        className={cn(
          "fixed left-0 top-16 z-30 hidden h-[calc(100dvh-4rem)] flex-col overflow-hidden border-r border-border/50 bg-background/40 backdrop-blur-xl transition-[width] duration-200 lg:flex",
          collapsed ? "w-20" : "w-72"
        )}
    >
      <div className={cn("pt-6", collapsed ? "px-3" : "px-5")}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <span className="text-sm font-semibold">{userName[0] ?? "U"}</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{userName}</div>
              <div className="text-xs text-muted-foreground">{onlineLabel}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Role: Full Stack Developer
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="mt-5 text-xs font-medium text-muted-foreground">
            Navigation
          </div>
        )}
      </div>

      <div className="mt-3 flex-1 overflow-auto px-2 pb-2">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(item.id)}
                title={item.label}
                className={cn(
                  "relative flex w-full items-center rounded-xl py-2 text-left text-sm transition",
                  collapsed ? "justify-center px-2" : "gap-3 px-3",
                  isActive
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-background/30",
                    isActive ? "border-primary/30" : ""
                  )}
                >
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && isActive && (
                  <span className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!collapsed && (
        <div className="px-5 pb-3 pt-3">
          <Separator className="bg-border/50" />
          <div className="mt-3 text-xs text-muted-foreground">
            Built with Supabase Auth + Realtime-ready architecture.
          </div>
        </div>
      )}

      <div className={cn("p-3", collapsed ? "flex justify-center" : "px-5 pb-5")}>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-background/20 text-muted-foreground hover:text-foreground",
            collapsed
              ? "h-9 w-9"
              : "mt-2 w-full px-3 py-2 text-xs font-semibold"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function MobileBottomNav() {
  const { active, setActive } = useDashboardNav();
  const items = useMemo(() => {
    return [
      { id: "dashboard" as const, label: "Home", icon: <LayoutDashboard className="h-4 w-4" /> },
      { id: "tasks" as const, label: "Tasks", icon: <ListTodo className="h-4 w-4" /> },
      { id: "pomodoro" as const, label: "Timer", icon: <Timer className="h-4 w-4" /> },
      { id: "cashflow" as const, label: "Cash", icon: <Wallet className="h-4 w-4" /> },
      { id: "settings" as const, label: "Settings", icon: <Settings className="h-4 w-4" /> },
    ];
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/60 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-[1400px] items-center justify-around px-2 py-2">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs transition",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={cn(isActive ? "text-primary" : "")}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MobileMenuDrawer() {
  const { isMobileMenuOpen, setMobileMenuOpen, active, setActive } =
    useDashboardNav();

  return (
    <AnimatePresence>
      {isMobileMenuOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          />
          <motion.div
            className="fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-80 overflow-hidden border-r border-border bg-background/90 backdrop-blur-xl"
            initial={{ x: -16, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -16, opacity: 0 }}
            transition={{ type: "tween", duration: 0.2 }}
          >
            <div className="p-4">
              <div className="text-sm font-semibold">Menu</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Navigate dashboard sections
              </div>
            </div>
            <div className="h-[calc(100%-3.5rem)] overflow-auto px-2 pb-6">
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isItemActive = item.id === active;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActive(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
                        isItemActive
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                      )}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 bg-background/30">
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const online = useOnlineStatus();

  const [active, setActive] = useState<DashboardSection>("dashboard");
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // "/" focuses the global search input (when present).
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as Element | null;
        const isTyping =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target?.getAttribute("contenteditable") === "true";
        if (!isTyping) {
          e.preventDefault();
          const el = document.querySelector(
            "input[aria-label='Global search']"
          ) as HTMLInputElement | null;
          el?.focus();
        }
      }
      if (e.key === "Escape") {
        setSearch("");
        setMobileMenuOpen(false);
      }

      if (e.altKey) {
        const target = e.target as Element | null;
        const isTyping =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target?.getAttribute("contenteditable") === "true";
        if (isTyping) return;

        if (e.key === "1") setActive("dashboard");
        if (e.key === "2") setActive("portfolio");
        if (e.key === "3") setActive("tasks");
        if (e.key === "4") setActive("pomodoro");
        if (e.key === "5") setActive("cashflow");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  const userName =
    profile?.full_name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "User");

  const onlineLabel = formatOnline(online);

  return (
    <DashboardNavProvider value={value}>
      <div className="dashboard-shell bg-background/0">
        <TopNav
          searchValue={search}
          onChangeSearch={setSearch}
          onOpenQuickAdd={() => {
            toast.message("Quick add coming soon");
          }}
        />

        <div className="dashboard-shell__body">
          {/* In-flow spacer so the panel gets the remaining width */}
          <div
            className={cn(
              "dashboard-shell__rail",
              sidebarCollapsed && "is-collapsed"
            )}
            aria-hidden
          />

          <Sidebar
            onlineLabel={onlineLabel}
            userName={userName}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
          />
          <MobileMenuDrawer />

          <div className="dashboard-shell__panel">
            <main className="dashboard-shell__main">
              <div className="dashboard-shell__main-inner">{children}</div>
            </main>
          </div>
        </div>

        <MobileBottomNav />
      </div>
    </DashboardNavProvider>
  );
}



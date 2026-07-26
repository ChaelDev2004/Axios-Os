"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare,
  Command,
  FilePlus,
  Focus,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Search,
  Settings,
  Sparkles,
  Timer,
  Wallet,
  Workflow,
  Bell,
  LineChart,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  type DashboardSection,
  useDashboardNav,
} from "@/components/dashboard/dashboard-context";
import { confirmAndLogout } from "@/features/auth/lib/confirm-logout";

const iconStyle: CSSProperties = { width: 16, height: 16, flexShrink: 0 };

const COMMANDS: Array<{
  id: string;
  label: string;
  hint?: string;
  group: "Navigate" | "Actions";
  section?: DashboardSection;
  action?: "new-task" | "new-project" | "focus" | "logout";
  icon: ReactNode;
}> = [
  { id: "go-overview", label: "Go to Overview", group: "Navigate", section: "dashboard", icon: <LayoutDashboard style={iconStyle} /> },
  { id: "go-portfolio", label: "Go to Portfolio", group: "Navigate", section: "portfolio", icon: <BriefcaseBusiness style={iconStyle} /> },
  { id: "go-projects", label: "Go to Projects", group: "Navigate", section: "projects", icon: <Workflow style={iconStyle} /> },
  { id: "go-tasks", label: "Go to Tasks", group: "Navigate", section: "tasks", icon: <ListTodo style={iconStyle} /> },
  { id: "go-focus", label: "Open Focus Hub", group: "Navigate", section: "pomodoro", hint: "Alt+F", icon: <Timer style={iconStyle} /> },
  { id: "go-finance", label: "Open Finance", group: "Navigate", section: "cashflow", icon: <Wallet style={iconStyle} /> },
  { id: "go-calendar", label: "Open Calendar", group: "Navigate", section: "calendar", icon: <CalendarDays style={iconStyle} /> },
  { id: "go-analytics", label: "Open Analytics", group: "Navigate", section: "analytics", icon: <LineChart style={iconStyle} /> },
  { id: "go-ai", label: "Open AI Workspace", group: "Navigate", section: "assistant", icon: <Sparkles style={iconStyle} /> },
  { id: "go-notif", label: "Notifications", group: "Navigate", section: "notifications", icon: <Bell style={iconStyle} /> },
  { id: "go-settings", label: "Settings", group: "Navigate", section: "settings", icon: <Settings style={iconStyle} /> },
  { id: "new-task", label: "New Task", group: "Actions", action: "new-task", hint: "Alt+N", icon: <CheckSquare style={iconStyle} /> },
  { id: "new-project", label: "New Project", group: "Actions", action: "new-project", hint: "Alt+P", icon: <FilePlus style={iconStyle} /> },
  { id: "start-focus", label: "Start Focus Session", group: "Actions", action: "focus", hint: "Alt+F", icon: <Focus style={iconStyle} /> },
  { id: "logout", label: "Sign out", group: "Actions", action: "logout", icon: <LogOut style={iconStyle} /> },
];

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  background:
    "radial-gradient(ellipse at 50% 20%, rgba(79,70,229,0.18), transparent 55%), rgba(2, 6, 14, 0.62)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

const panelStyle: CSSProperties = {
  position: "fixed",
  left: "50%",
  top: "12%",
  zIndex: 81,
  width: "min(92vw, 560px)",
  overflow: "hidden",
  borderRadius: "1.35rem",
  border: "1px solid rgba(255,255,255,0.12)",
  background:
    "linear-gradient(180deg, rgba(22,26,40,0.97) 0%, rgba(10,12,20,0.98) 100%)",
  boxShadow:
    "0 28px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(129,140,248,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
  backdropFilter: "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
};

const searchRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  padding: "0.95rem 1.1rem",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
};

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  width: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "#f1f5f9",
  fontSize: "0.95rem",
  fontWeight: 500,
  letterSpacing: "0.01em",
};

const kbdStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.25rem",
  padding: "0.28rem 0.5rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#94a3b8",
  fontSize: "0.65rem",
  fontWeight: 650,
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};

const listStyle: CSSProperties = {
  maxHeight: "min(52vh, 380px)",
  overflowY: "auto",
  padding: "0.55rem",
};

const groupLabelStyle: CSSProperties = {
  margin: "0.45rem 0.55rem 0.35rem",
  fontSize: "0.65rem",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(148, 163, 184, 0.75)",
};

const emptyStyle: CSSProperties = {
  padding: "2.25rem 1rem",
  textAlign: "center",
  fontSize: "0.875rem",
  color: "#64748b",
};

const footerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  padding: "0.7rem 1rem",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.22)",
  color: "#64748b",
  fontSize: "0.68rem",
  letterSpacing: "0.02em",
};

const footerKbdStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "1.2rem",
  padding: "0.12rem 0.35rem",
  margin: "0 0.15rem",
  borderRadius: "0.35rem",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#94a3b8",
  fontSize: "0.62rem",
  fontWeight: 650,
};

function itemButtonStyle(active: boolean, danger: boolean): CSSProperties {
  return {
    display: "flex",
    width: "100%",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.7rem 0.75rem",
    marginBottom: "0.2rem",
    border: active
      ? "1px solid rgba(129,140,248,0.35)"
      : "1px solid transparent",
    borderRadius: "0.9rem",
    background: active
      ? "linear-gradient(135deg, rgba(99,102,241,0.28) 0%, rgba(79,70,229,0.16) 100%)"
      : "transparent",
    color: danger ? (active ? "#fda4af" : "#fb7185") : active ? "#f8fafc" : "#cbd5e1",
    textAlign: "left",
    cursor: "pointer",
    appearance: "none",
    transition: "background 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease",
    boxShadow: active ? "0 8px 24px rgba(79,70,229,0.18)" : "none",
  };
}

const iconWrapStyle = (active: boolean, danger: boolean): CSSProperties => ({
  display: "flex",
  height: "2.15rem",
  width: "2.15rem",
  flexShrink: 0,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "0.7rem",
  border: active
    ? "1px solid rgba(165,180,252,0.35)"
    : "1px solid rgba(255,255,255,0.08)",
  background: active
    ? danger
      ? "rgba(244,63,94,0.18)"
      : "rgba(99,102,241,0.28)"
    : "rgba(255,255,255,0.04)",
  color: danger ? "#fb7185" : active ? "#c7d2fe" : "#94a3b8",
});

const labelStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.875rem",
  fontWeight: 600,
  letterSpacing: "0.01em",
};

const hintStyle: CSSProperties = {
  flexShrink: 0,
  padding: "0.2rem 0.45rem",
  borderRadius: "0.4rem",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "#64748b",
  fontSize: "0.62rem",
  fontWeight: 650,
  letterSpacing: "0.03em",
};

export function CommandPalette() {
  const { commandOpen, setCommandOpen, setActive, setSearch } = useDashboardNav();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) => c.label.toLowerCase().includes(q));
  }, [query]);

  const grouped = useMemo(() => {
    const navigate = filtered.filter((c) => c.group === "Navigate");
    const actions = filtered.filter((c) => c.group === "Actions");
    return [
      { title: "Navigate", items: navigate },
      { title: "Actions", items: actions },
    ].filter((g) => g.items.length > 0);
  }, [filtered]);

  useEffect(() => {
    if (!commandOpen) {
      setQuery("");
      setIndex(0);
    }
  }, [commandOpen]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  const run = (item: (typeof COMMANDS)[number]) => {
    if (item.section) {
      setActive(item.section);
      setSearch("");
    }
    if (item.action === "new-task") {
      setActive("tasks");
      toast.message("Create a task in Tasks");
    }
    if (item.action === "new-project") {
      setActive("projects");
      toast.message("Create a project in Projects");
    }
    if (item.action === "focus") {
      setActive("pomodoro");
      toast.success("Focus Hub ready");
    }
    if (item.action === "logout") {
      void confirmAndLogout();
    }
    setCommandOpen(false);
  };

  return (
    <AnimatePresence>
      {commandOpen && (
        <>
          <motion.div
            style={overlayStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommandOpen(false)}
          />
          <motion.div
            role="dialog"
            aria-label="Command palette"
            style={panelStyle}
            initial={{ opacity: 0, y: 12, scale: 0.98, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 8, scale: 0.98, x: "-50%" }}
            transition={{ duration: 0.18 }}
          >
            <div style={searchRowStyle}>
              <Search style={{ width: 18, height: 18, color: "#818cf8", flexShrink: 0 }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIndex((i) => Math.min(i + 1, filtered.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIndex((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter" && filtered[index]) {
                    e.preventDefault();
                    run(filtered[index]);
                  } else if (e.key === "Escape") {
                    setCommandOpen(false);
                  }
                }}
                placeholder="Search commands, pages, actions…"
                style={inputStyle}
              />
              <span style={kbdStyle}>
                <Command style={{ width: 11, height: 11 }} />
                K
              </span>
            </div>

            <div style={listStyle}>
              {filtered.length === 0 ? (
                <div style={emptyStyle}>No matching commands</div>
              ) : (
                grouped.map((group) => (
                  <div key={group.title}>
                    <div style={groupLabelStyle}>{group.title}</div>
                    {group.items.map((item) => {
                      const i = filtered.findIndex((c) => c.id === item.id);
                      const active = i === index;
                      const danger = item.action === "logout";
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => setIndex(i)}
                          onClick={() => run(item)}
                          style={itemButtonStyle(active, danger)}
                        >
                          <span style={iconWrapStyle(active, danger)}>{item.icon}</span>
                          <span style={labelStyle}>{item.label}</span>
                          {item.hint ? <span style={hintStyle}>{item.hint}</span> : null}
                          <ArrowRight
                            style={{
                              width: 14,
                              height: 14,
                              opacity: active ? 0.85 : 0.35,
                              color: active ? "#c7d2fe" : "#94a3b8",
                              flexShrink: 0,
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div style={footerStyle}>
              <span>
                <span style={footerKbdStyle}>↑</span>
                <span style={footerKbdStyle}>↓</span>
                navigate
              </span>
              <span>
                <span style={footerKbdStyle}>↵</span>
                open
                <span style={{ ...footerKbdStyle, marginLeft: "0.45rem" }}>esc</span>
                close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

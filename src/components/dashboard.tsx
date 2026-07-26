"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  BriefcaseBusiness,
  Coins,
  CornerUpRight,
  Edit3,
  ListTodo,
  Plus,
  Sparkles,
  Timer,
  TimerReset,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Profile } from "@/features/auth/types/database.types";
import { DashboardClient } from "@/features/auth/components/DashboardClient";

import { useDashboardNav } from "@/components/dashboard/dashboard-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  areaFill,
  Bar,
  defaultBarOptions,
  defaultLineOptions,
  Line,
  sparklineOptions,
} from "@/lib/chartjs";
import { cn } from "@/lib/utils";

const QUOTES = [
  "Ship small, learn fast, improve daily.",
  "Consistency beats intensity.",
  "Design is intelligence made visible.",
  "Focus is the new currency.",
  "Secure systems are calm systems.",
] as const;

type Priority = "Low" | "Medium" | "High";

type Task = {
  id: string;
  title: string;
  priority: Priority;
  completed: boolean;
  createdAt: string; // ISO
};

type Transaction = {
  id: string;
  description: string;
  amount: number; // positive income, negative expense
  createdAt: string; // ISO
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string; // ISO
  read: boolean;
};

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function formatPhp(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(d: Date) {
  return d.toLocaleString("en-PH", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function randomFromQuoteIndex() {
  const day = new Date().getDate();
  return day % QUOTES.length;
}

function priorityClass(priority: Priority) {
  switch (priority) {
    case "High":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "Medium":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default:
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }
}

function Sparkline({
  data,
  tone = "primary",
}: {
  data: readonly number[];
  tone?: "primary" | "muted" | "success" | "danger";
}) {
  const color =
    tone === "primary"
      ? "#818cf8"
      : tone === "success"
        ? "#34d399"
        : tone === "danger"
          ? "#f87171"
          : "#94a3b8";

  return (
    <div className="dashboard-chart h-14 w-full max-w-[9rem]">
      <Line
        data={{
          labels: data.map((_, i) => String(i)),
          datasets: [
            {
              data: [...data],
              borderColor: color,
              backgroundColor: areaFill(color, 0.3),
              fill: true,
            },
          ],
        }}
        options={sparklineOptions}
      />
    </div>
  );
}

function WelcomeWidget({ userName }: { userName: string }) {
  const now = useNow();
  const [mounted, setMounted] = useState(false);
  const progressPct = 68;

  useEffect(() => {
    setMounted(true);
  }, []);

  const quote = mounted ? QUOTES[randomFromQuoteIndex()] : "";

  return (
    <div className="dashboard-card space-y-0 overflow-hidden p-0">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Welcome back
          </div>
          <div className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">
            {userName}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="truncate" suppressHydrationWarning>
              {mounted ? formatDateTime(now) : "\u00a0"}
            </span>
          </div>
        </div>

        <div className="dashboard-card-soft w-full shrink-0 p-4 sm:w-56">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Daily Focus
              </div>
              <div className="mt-1 text-2xl font-bold">{progressPct}%</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {progressPct >= 70 ? "On track" : "Almost there"}
              </div>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted-foreground/15">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6 }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Motivational quote
          </div>
          <div
            className="mt-1 text-base font-semibold leading-snug sm:text-lg"
            suppressHydrationWarning
          >
            {quote || "\u00a0"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          <CornerUpRight className="h-4 w-4 text-emerald-400" />
          Keep building momentum.
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  changePct,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  changePct: number;
  trend: readonly number[];
}) {
  const isUp = changePct >= 0;
  const ChangeIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <Card className="dashboard-card border-0 bg-transparent shadow-none">
      <CardHeader className="space-y-0 p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </div>
            <div className="min-w-0">
              <CardTitle className="dashboard-truncate text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {label}
              </CardTitle>
              <div className="mt-1.5 truncate text-2xl font-bold tracking-tight">
                {value}
              </div>
            </div>
          </div>
          <div
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold",
              isUp
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-red-400/20 bg-red-400/10 text-red-300"
            )}
          >
            <ChangeIcon className="h-3.5 w-3.5" />
            <span>{Math.abs(changePct)}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="flex items-end justify-between gap-3">
          <div className="text-[11px] text-muted-foreground">vs last 7 days</div>
          <Sparkline
            data={trend}
            tone={isUp ? "success" : "danger"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatsGrid() {
  const stats = [
    {
      icon: <BriefcaseBusinessIcon />,
      label: "Total Projects",
      value: "24",
      changePct: 12,
      trend: [2, 4, 3, 7, 6, 8, 9],
    },
    {
      icon: <TaskIcon />,
      label: "Completed Tasks",
      value: "38",
      changePct: 7,
      trend: [1, 3, 2, 4, 4, 6, 7],
    },
    {
      icon: <WalletIcon />,
      label: "Current Cash Balance",
      value: formatPhp(84200),
      changePct: 5,
      trend: [50, 55, 52, 60, 62, 64, 67],
    },
    {
      icon: <TimerIcon />,
      label: "Focus Time Today",
      value: "2h 14m",
      changePct: -3,
      trend: [6, 4, 5, 5, 4, 3, 4],
    },
  ] as const;

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <StatCard
          key={s.label}
          icon={s.icon}
          label={s.label}
          value={s.value}
          changePct={s.changePct}
          trend={s.trend}
        />
      ))}
    </div>
  );
}

function BriefcaseBusinessIcon() {
  return <BriefcaseBusiness className="h-5 w-5" />;
}
function TaskIcon() {
  return <ListTodo className="h-5 w-5" />;
}
function WalletIcon() {
  return <Coins className="h-5 w-5" />;
}
function TimerIcon() {
  return <Timer className="h-5 w-5" />;
}

function PomodoroWidget() {
  const focusSeconds = 25 * 60;
  const breakSeconds = 5 * 60;

  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [status, setStatus] = useState<"idle" | "running" | "paused" | "done">(
    "idle"
  );
  const [remaining, setRemaining] = useState<number>(focusSeconds);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [todayFocusHours, setTodayFocusHours] = useState<number>(1.4);

  useEffect(() => {
    if (status !== "running") return;

    const id = window.setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) return 0;
        return next;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [status, focusSeconds, breakSeconds]);

  useEffect(() => {
    if (status !== "running") return;
    if (remaining > 0) return;

    if (phase === "focus") {
      setStatus("done");
      setSessionCount((c) => c + 1);
      setTodayFocusHours((h) => h + 0.42);
    } else {
      setStatus("done");
    }
  }, [remaining, status, phase, focusSeconds, breakSeconds]);

  useEffect(() => {
    if (status !== "done") return;
    // Move to the next phase after a short delay for UX.
    const id = window.setTimeout(() => {
      if (phase === "focus") {
        setPhase("break");
        setRemaining(breakSeconds);
        setStatus("idle");
      } else {
        setPhase("focus");
        setRemaining(focusSeconds);
        setStatus("idle");
      }
    }, 800);
    return () => window.clearTimeout(id);
  }, [status, phase, focusSeconds, breakSeconds]);

  const total = phase === "focus" ? focusSeconds : breakSeconds;
  const progress = total === 0 ? 0 : (total - remaining) / total;

  const ringRadius = 56;
  const circumference = 2 * Math.PI * ringRadius;
  const dashOffset = circumference * (1 - progress);

  const label = phase === "focus" ? "Focus" : "Break";
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <Card className="dashboard-card border-0 bg-transparent shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-5 pb-3">
        <CardTitle className="text-base font-semibold">Pomodoro Timer</CardTitle>
        <div className="shrink-0 text-xs text-muted-foreground">
          Session: <span className="font-semibold text-foreground">{sessionCount}</span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-5 pt-2 sm:grid-cols-[160px_1fr] sm:items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-[140px] w-[140px] items-center justify-center">
            <svg width={140} height={140} className="block overflow-visible">
              <circle
                cx={70}
                cy={70}
                r={ringRadius}
                stroke="hsl(var(--border))"
                strokeWidth={10}
                fill="transparent"
                opacity={0.35}
              />
              <circle
                cx={70}
                cy={70}
                r={ringRadius}
                stroke="hsl(var(--primary))"
                strokeWidth={10}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 0.2s linear",
                  transformOrigin: "70px 70px",
                  transform: "rotate(-90deg)",
                }}
              />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </div>
              <div className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
                {mm}:{String(ss).padStart(2, "0")}
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Today:{" "}
            <span className="font-semibold text-foreground">
              {todayFocusHours.toFixed(1)}h
            </span>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                if (status === "running") return;
                setStatus("running");
              }}
              disabled={status === "running"}
              className="rounded-full"
            >
              Start
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (status !== "running") return;
                setStatus("paused");
              }}
              disabled={status !== "running"}
              className="rounded-full"
            >
              Pause
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStatus("idle");
                setPhase("focus");
                setRemaining(focusSeconds);
              }}
              className="rounded-full"
            >
              <TimerReset className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>

          <div className="dashboard-card-soft p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Controls
            </div>
            <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Timer updates locally for now. Hook to Supabase for multi-device sync if needed.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TasksWidget({ search }: { search: string }) {
  const [tasks, setTasks] = useState<Task[]>(() => [
    {
      id: "t1",
      title: "Review new portfolio layout",
      priority: "Medium",
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "t2",
      title: "Implement PIN security UX",
      priority: "High",
      completed: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "t3",
      title: "Test dashboard charts responsiveness",
      priority: "Low",
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const editingTask = useMemo(
    () => tasks.find((t) => t.id === editId) ?? null,
    [tasks, editId]
  );

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");

  useEffect(() => {
    if (!editingTask) return;
    setTitle(editingTask.title);
    setPriority(editingTask.priority);
  }, [editingTask]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [tasks, search]);

  const pendingCount = filtered.filter((t) => !t.completed).length;
  const completedCount = filtered.filter((t) => t.completed).length;
  const totalCount = filtered.length;

  const openAdd = () => {
    setEditId(null);
    setTitle("");
    setPriority("Medium");
    setIsAddOpen(true);
  };

  const openEdit = (taskId: string) => {
    setEditId(taskId);
    setIsAddOpen(true);
  };

  const closeModal = () => setIsAddOpen(false);

  const save = () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      toast.error("Task title is required.");
      return;
    }
    if (editId) {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editId
            ? { ...t, title: nextTitle, priority }
            : t
        )
      );
      toast.success("Task updated.");
    } else {
      const id = `t-${Math.random().toString(16).slice(2)}`;
      const createdAt = new Date().toISOString();
      setTasks((prev) => [
        {
          id,
          title: nextTitle,
          priority,
          completed: false,
          createdAt,
        },
        ...prev,
      ]);
      toast.success("Task added.");
    }
    setIsAddOpen(false);
  };

  return (
    <Card className="dashboard-card border-0 bg-transparent shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 p-5 pb-3">
          <CardTitle className="min-w-0 truncate text-base font-semibold">Today&apos;s Tasks</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 rounded-full"
          onClick={openAdd}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-2">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="dashboard-card-soft p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pending
            </div>
            <div className="mt-1 text-xl font-bold sm:text-2xl">{pendingCount}</div>
          </div>
          <div className="dashboard-card-soft p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Done
            </div>
            <div className="mt-1 text-xl font-bold sm:text-2xl">{completedCount}</div>
          </div>
          <div className="dashboard-card-soft p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </div>
            <div className="mt-1 text-xl font-bold sm:text-2xl">{totalCount}</div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="dashboard-card-soft p-6 text-center text-sm text-muted-foreground">
            No tasks match your search.
          </div>
        ) : (
          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {filtered.map((task) => (
              <div
                key={task.id}
                className="dashboard-card-soft flex items-center justify-between gap-3 p-3"
              >
                <label className="flex min-w-0 flex-1 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    className="shrink-0"
                    onChange={() => {
                      setTasks((prev) =>
                        prev.map((t) =>
                          t.id === task.id
                            ? { ...t, completed: !t.completed }
                            : t
                        )
                      );
                    }}
                  />
                  <span
                    className={cn(
                      "truncate font-medium",
                      task.completed ? "text-muted-foreground line-through" : ""
                    )}
                  >
                    {task.title}
                  </span>
                </label>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      priorityClass(task.priority)
                    )}
                  >
                    {task.priority}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEdit(task.id)}
                    className="rounded-full border border-border/50 bg-background/20 p-1.5 text-muted-foreground hover:text-foreground"
                    aria-label={`Edit ${task.title}`}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AnimatePresence>
        {isAddOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            />
            <motion.div
              className="fixed left-1/2 top-1/2 z-[61] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.16 }}
            >
              <div className="rounded-2xl border border-border bg-background/95 p-5 shadow-xl backdrop-blur-xl">
                <div className="text-lg font-semibold">
                  {editId ? "Edit Task" : "Add Task"}
                </div>
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="task-title">Title</Label>
                    <Input
                      id="task-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Follow up with client"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-priority">Priority</Label>
                    <select
                      id="task-priority"
                      className="h-10 w-full rounded-md border border-border/60 bg-background/40 px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    className="rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={save}
                    className="rounded-full"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Card>
  );
}

function FinancialWidget({ search }: { search: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => [
    {
      id: "tx1",
      description: "Client payout",
      amount: 42000,
      createdAt: new Date().toISOString(),
    },
    {
      id: "tx2",
      description: "Design subscription",
      amount: -3200,
      createdAt: new Date().toISOString(),
    },
    {
      id: "tx3",
      description: "Hosting renewal",
      amount: -1400,
      createdAt: new Date().toISOString(),
    },
  ]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);

  const balance = useMemo(
    () => transactions.reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );
  const incomeTotal = useMemo(
    () => transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );
  const expenseTotal = useMemo(
    () => transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [transactions]
  );

  const recentFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => t.description.toLowerCase().includes(q));
  }, [transactions, search]);

  const chartData = useMemo(() => {
    // Derived from last 7 entries (placeholder UX).
    const points = [8, 12, 10, 18, 16, 22, 19].map((v, i) => ({
      day: `D${i + 1}`,
      income: Math.max(0, incomeTotal / 1000) + v,
      expense: Math.max(0, expenseTotal / 1000) + (22 - v),
    }));
    return points;
  }, [incomeTotal, expenseTotal]);

  const openAdd = () => {
    setDescription("");
    setAmount(0);
    setIsAddOpen(true);
  };

  const addTx = () => {
    const desc = description.trim();
    if (!desc) {
      toast.error("Description is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount === 0) {
      toast.error("Amount must be non-zero.");
      return;
    }
    const tx: Transaction = {
      id: `tx-${Math.random().toString(16).slice(2)}`,
      description: desc,
      amount,
      createdAt: new Date().toISOString(),
    };
    // Optimistic: update UI immediately
    setTransactions((prev) => [tx, ...prev]);
    toast.success("Transaction added.");
    setIsAddOpen(false);
  };

  return (
    <Card className="dashboard-card border-0 bg-transparent shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-5 pb-3">
        <CardTitle className="min-w-0 truncate text-base font-semibold">Cash Flow</CardTitle>
        <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full" onClick={openAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 p-5 pt-2">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="dashboard-card-soft p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current Balance
            </div>
            <div className="mt-2 truncate text-xl font-bold sm:text-2xl">{formatPhp(balance)}</div>
          </div>
          <div className="dashboard-card-soft p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Monthly Income
            </div>
            <div className="mt-2 truncate text-xl font-bold text-emerald-300 sm:text-2xl">
              {formatPhp(incomeTotal)}
            </div>
          </div>
          <div className="dashboard-card-soft p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Monthly Expenses
            </div>
            <div className="mt-2 truncate text-xl font-bold text-red-300 sm:text-2xl">
              {formatPhp(-expenseTotal)}
            </div>
          </div>
        </div>

        <div className="dashboard-card-soft p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Financial overview</div>
            <div className="shrink-0 text-xs text-muted-foreground">
              Interactive chart
            </div>
          </div>
          <div className="dashboard-chart mt-3 h-64 w-full min-w-0 sm:h-72">
            <Line
              data={{
                labels: chartData.map((d) => d.day),
                datasets: [
                  {
                    label: "Income",
                    data: chartData.map((d) => d.income),
                    borderColor: "#34d399",
                    backgroundColor: areaFill("#34d399"),
                    fill: true,
                  },
                  {
                    label: "Expense",
                    data: chartData.map((d) => d.expense),
                    borderColor: "#f87171",
                    backgroundColor: areaFill("#f87171"),
                    fill: true,
                  },
                ],
              }}
              options={defaultLineOptions}
            />
          </div>
        </div>

        <div className="dashboard-card-soft p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Recent transactions</div>
            <div className="shrink-0 text-xs text-muted-foreground">
              {recentFiltered.length} items
            </div>
          </div>
          {recentFiltered.length === 0 ? (
            <div className="mt-4 text-sm text-muted-foreground">
              No transactions found.
            </div>
          ) : (
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {recentFiltered.slice(0, 6).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{tx.description}</div>
                    <div className="text-xs text-muted-foreground">Today</div>
                  </div>
                  <div
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      tx.amount >= 0 ? "text-emerald-300" : "text-red-300"
                    )}
                  >
                    {formatPhp(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <AnimatePresence>
        {isAddOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[70] bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
            />
            <motion.div
              className="fixed left-1/2 top-1/2 z-[71] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
            >
              <div className="rounded-2xl border border-border bg-background/95 p-5 shadow-xl backdrop-blur-xl">
                <div className="text-lg font-semibold">Add Transaction</div>
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="tx-desc">Description</Label>
                    <Input
                      id="tx-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Client payout"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tx-amount">
                      Amount (income positive / expense negative)
                    </Label>
                    <Input
                      id="tx-amount"
                      value={Number.isFinite(amount) ? String(amount) : "0"}
                      onChange={(e) => {
                        const parsed = Number(e.target.value);
                        setAmount(Number.isFinite(parsed) ? parsed : 0);
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                    className="rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={addTx}
                    className="rounded-full"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Card>
  );
}

function PortfolioWidget({ search }: { search: string }) {
  const [portfolioViews, setPortfolioViews] = useState<number>(12840);
  const [publishedArticles, setPublishedArticles] = useState<number>(18);
  const [visitorsToday, setVisitorsToday] = useState<number>(214);
  const [totalProjects, setTotalProjects] = useState<number>(24);

  useEffect(() => {
    // Placeholder: simulate growth in local UI without external APIs.
    const id = window.setInterval(() => {
      setPortfolioViews((v) => v + 12);
      setVisitorsToday((v) => v + 1);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  const q = search.trim().toLowerCase();
  const chartData = useMemo(() => {
    const points = [2, 4, 3, 6, 7, 6, 8].map((v, i) => ({
      day: `D${i + 1}`,
      views: v * (portfolioViews / 1000),
    }));
    return points;
  }, [portfolioViews]);

  return (
    <Card className="dashboard-card border-0 bg-transparent shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base font-semibold">Portfolio</CardTitle>
        <div className="text-xs text-muted-foreground">Growth indicators</div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Portfolio Views
            </div>
            <div className="mt-2 text-2xl font-bold">{portfolioViews.toLocaleString("en-PH")}</div>
            <div className="mt-1 text-sm text-emerald-300">+2.4% today</div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Visitors Today
            </div>
            <div className="mt-2 text-2xl font-bold">{visitorsToday.toLocaleString("en-PH")}</div>
            <div className="mt-1 text-sm text-emerald-300">Steady engagement</div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Projects
            </div>
            <div className="mt-2 text-2xl font-bold">{totalProjects}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Keep shipping
            </div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Published Articles
            </div>
            <div className="mt-2 text-2xl font-bold">{publishedArticles}</div>
            <div className="mt-1 text-sm text-muted-foreground">3 new this week</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Views growth</div>
            <div className="text-xs text-muted-foreground">
              {q ? `Filtered by “${q}”` : "Last 7 days"}
            </div>
          </div>
          <div className="dashboard-chart mt-3 h-64 w-full min-w-0 sm:h-72">
            <Line
              data={{
                labels: chartData.map((d) => d.day),
                datasets: [
                  {
                    label: "Views",
                    data: chartData.map((d) => d.views),
                    borderColor: "#818cf8",
                    backgroundColor: areaFill("#818cf8"),
                    fill: true,
                    borderWidth: 2,
                  },
                ],
              }}
              options={{
                ...defaultLineOptions,
                plugins: {
                  ...defaultLineOptions.plugins,
                  legend: { display: false },
                },
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsCenter() {
  const [items, setItems] = useState<NotificationItem[]>(() => [
    {
      id: "n1",
      title: "PIN updated successfully",
      body: "Your security PIN was saved and is ready for fast login.",
      createdAt: new Date().toISOString(),
      read: false,
    },
    {
      id: "n2",
      title: "Daily focus streak",
      body: "You completed 2 focus sessions today. Nice momentum.",
      createdAt: new Date().toISOString(),
      read: true,
    },
    {
      id: "n3",
      title: "Upcoming reminder",
      body: "Review pending tasks before EOD.",
      createdAt: new Date().toISOString(),
      read: false,
    },
  ]);

  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <Card className="dashboard-card border-0 bg-transparent shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-5 pb-3">
        <CardTitle className="text-base font-semibold">Notifications</CardTitle>
        <div className="shrink-0 text-xs text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              setItems((prev) => prev.map((i) => ({ ...i, read: true })));
              toast.success("Marked as read.");
            }}
          >
            Mark as Read
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => {
              setItems([]);
              toast.success("Cleared all notifications.");
            }}
            disabled={items.length === 0}
          >
            Clear All
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="dashboard-card-soft p-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {items.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "dashboard-card-soft p-3.5",
                  n.read ? "" : "ring-1 ring-primary/25"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{n.title}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {n.body}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-full"
                    onClick={() => {
                      setItems((prev) =>
                        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
                      );
                    }}
                    disabled={n.read}
                  >
                    {n.read ? "Read" : "Mark"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AIAssistantWidget() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>(
    () => [
      {
        id: "a0",
        role: "assistant",
        content:
          "Hi! I can help you plan tasks, optimize focus sessions, and review your dashboard goals.",
      },
    ]
  );

  const suggestions = [
    "Plan my day in 3 steps",
    "Which task should I do next?",
    "Give me a focus schedule",
    "Summarize my progress",
  ] as const;

  const recommend = useMemo(() => {
    return [
      { title: "Start with the High priority task", body: "It reduces context switching and raises completion velocity." },
      { title: "Keep focus sprints short", body: "Switch to break mode after 25 minutes for consistent energy." },
      { title: "Review cash flow weekly", body: "Use your dashboard trends to prevent surprises." },
    ];
  }, []);

  const send = () => {
    const next = message.trim();
    if (!next) return;
    const userMsg = { id: `u-${Math.random().toString(16).slice(2)}`, role: "user" as const, content: next };
    setMessages((prev) => [...prev, userMsg]);
    setMessage("");

    const reply =
      next.toLowerCase().includes("plan") ?
        "Plan: 1) Pick one High priority task. 2) Pomodoro focus it. 3) Review + log progress in Tasks."
        : "I recommend focusing on one objective for 25 minutes, then marking progress to keep momentum.";

    const assistantMsg = {
      id: `a-${Math.random().toString(16).slice(2)}`,
      role: "assistant" as const,
      content: reply,
    };

    window.setTimeout(() => {
      setMessages((prev) => [...prev, assistantMsg]);
    }, 520);
  };

  return (
    <Card className="dashboard-card border-0 bg-transparent shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-5 pb-3">
        <CardTitle className="text-base font-semibold">AI Assistant</CardTitle>
        <div className="shrink-0 text-xs text-muted-foreground">Smart suggestions</div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-2">
        <div className="dashboard-card-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            Quick chat
          </div>
          <div className="mt-3 space-y-3">
            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "break-words rounded-xl border border-border/40 px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-background/30"
                      : "bg-primary/10 text-foreground"
                  )}
                >
                  {m.content}
                </div>
              ))}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask for focus schedule…"
                aria-label="Chat input"
                className="min-w-0 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <Button
                type="button"
                onClick={send}
                className="shrink-0 rounded-full"
              >
                Send
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Smart Suggestions
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="max-w-full rounded-full"
                  onClick={() => setMessage(s)}
                >
                  <span className="truncate">{s}</span>
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recommendations
            </div>
            <div className="space-y-2">
              {recommend.map((r) => (
                <div key={r.title} className="dashboard-card-soft p-3">
                  <div className="text-sm font-semibold">{r.title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {r.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsSection({ search }: { search: string }) {
  const trendData = useMemo(
    () => [
      { day: "Mon", productivity: 30, doneRate: 62 },
      { day: "Tue", productivity: 36, doneRate: 70 },
      { day: "Wed", productivity: 28, doneRate: 58 },
      { day: "Thu", productivity: 44, doneRate: 78 },
      { day: "Fri", productivity: 40, doneRate: 75 },
      { day: "Sat", productivity: 33, doneRate: 66 },
      { day: "Sun", productivity: 41, doneRate: 72 },
    ],
    []
  );

  const completionData = useMemo(
    () => trendData.map((d) => ({ name: d.day, rate: d.doneRate })),
    [trendData]
  );

  const portfolioTrafficData = useMemo(
    () => [
      { name: "Mon", visitors: 120 },
      { name: "Tue", visitors: 160 },
      { name: "Wed", visitors: 140 },
      { name: "Thu", visitors: 220 },
      { name: "Fri", visitors: 200 },
      { name: "Sat", visitors: 170 },
      { name: "Sun", visitors: 190 },
    ],
    []
  );

  const financialData = useMemo(
    () => [
      { name: "Mon", income: 12000, expense: 4200 },
      { name: "Tue", income: 16000, expense: 6100 },
      { name: "Wed", income: 14000, expense: 5200 },
      { name: "Thu", income: 24000, expense: 8200 },
      { name: "Fri", income: 22000, expense: 7600 },
      { name: "Sat", income: 19000, expense: 6800 },
      { name: "Sun", income: 21000, expense: 7100 },
    ],
    []
  );

  const q = search.trim().toLowerCase();
  const show = (label: string) => (q ? label.toLowerCase().includes(q) : true);

  return (
    <div className="space-y-4">
      <Card className="dashboard-card border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Productivity Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="dashboard-chart h-72 w-full min-w-0 p-5 sm:h-80">
          <Line
            data={{
              labels: trendData.map((d) => d.day),
              datasets: [
                {
                  label: "Productivity",
                  data: trendData.map((d) => d.productivity),
                  borderColor: "#818cf8",
                  backgroundColor: areaFill("#818cf8"),
                  fill: true,
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              ...defaultLineOptions,
              plugins: {
                ...defaultLineOptions.plugins,
                legend: { display: false },
              },
            }}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="dashboard-card border-0 bg-transparent shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Task Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="dashboard-chart h-64 w-full min-w-0 p-5 sm:h-72">
            <Bar
              data={{
                labels: completionData.map((d) => d.name),
                datasets: [
                  {
                    label: "Rate",
                    data: completionData.map((d) => d.rate),
                    backgroundColor: "#818cf8",
                    borderRadius: 10,
                    borderSkipped: false,
                  },
                ],
              }}
              options={{
                ...defaultBarOptions,
                plugins: {
                  ...defaultBarOptions.plugins,
                  legend: { display: false },
                },
              }}
            />
          </CardContent>
        </Card>

        <Card className="dashboard-card border-0 bg-transparent shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Portfolio Traffic
            </CardTitle>
          </CardHeader>
          <CardContent className="dashboard-chart h-64 w-full min-w-0 p-5 sm:h-72">
            <Line
              data={{
                labels: portfolioTrafficData.map((d) => d.name),
                datasets: [
                  {
                    label: "Visitors",
                    data: portfolioTrafficData.map((d) => d.visitors),
                    borderColor: "#818cf8",
                    backgroundColor: areaFill("#818cf8"),
                    fill: true,
                    borderWidth: 2,
                  },
                ],
              }}
              options={{
                ...defaultLineOptions,
                plugins: {
                  ...defaultLineOptions.plugins,
                  legend: { display: false },
                },
              }}
            />
          </CardContent>
        </Card>

        <Card className="dashboard-card border-0 bg-transparent shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="dashboard-chart h-72 w-full min-w-0 p-5 sm:h-80">
            <Line
              data={{
                labels: financialData.map((d) => d.name),
                datasets: [
                  {
                    label: "Income",
                    data: financialData.map((d) => d.income),
                    borderColor: "#34d399",
                    backgroundColor: areaFill("#34d399"),
                    fill: true,
                    borderWidth: 2,
                  },
                  {
                    label: "Expense",
                    data: financialData.map((d) => d.expense),
                    borderColor: "#f87171",
                    backgroundColor: areaFill("#f87171"),
                    fill: true,
                    borderWidth: 2,
                  },
                ],
              }}
              options={defaultLineOptions}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SectionGate({
  profile,
  user,
  children,
}: {
  profile: Profile | null;
  user: { email: string | null } | null;
  children: React.ReactNode;
}) {
  if (!profile || !user) return null;
  return <>{children}</>;
}

function SettingsView() {
  const { profile, user, loading } = useAuth();
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="rounded-2xl border border-border/50 bg-background/30 p-6 text-center text-sm text-muted-foreground">
        Missing profile.
      </div>
    );
  }

  return (
    <DashboardClient profile={profile} email={user?.email ?? profile.email} />
  );
}

export function Dashboard() {
  const { active, search } = useDashboardNav();
  const { user, profile, loading } = useAuth();

  const userName = profile?.full_name?.trim() || user?.email || "User";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-72 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-border/50 bg-background/30 p-6 text-center text-sm text-muted-foreground">
        Profile not found. Please sign in again.
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={active}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.16 }}
        className="w-full min-w-0 space-y-5"
      >
        {active === "dashboard" && (
          <div className="space-y-5">
            <WelcomeWidget userName={userName} />
            <StatsGrid />
            <div className="grid w-full grid-cols-1 gap-5 xl:grid-cols-3">
              <div className="min-w-0 space-y-5 xl:col-span-2">
                <PomodoroWidget />
                <TasksWidget search={search} />
              </div>
              <div className="min-w-0 space-y-5">
                <NotificationsCenter />
                <AIAssistantWidget />
              </div>
            </div>
          </div>
        )}

        {active === "portfolio" && <PortfolioWidget search={search} />}
        {active === "projects" && (
          <Card className="dashboard-card border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Portfolio projects and milestones.
              </div>
              <div className="space-y-2">
                {[
                  { name: "Design system polish", status: "In progress" },
                  { name: "PIN security improvements", status: "Completed" },
                  { name: "Dashboard analytics tooltips", status: "In review" },
                  { name: "Recharts performance tuning", status: "Planned" },
                ]
                  .filter((p) => (search ? p.name.toLowerCase().includes(search.toLowerCase()) : true))
                  .map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background/30 px-4 py-3"
                    >
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-xs rounded-full border border-border/60 bg-background/30 px-3 py-1 text-muted-foreground">
                        {p.status}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {active === "tasks" && <TasksWidget search={search} />}
        {active === "pomodoro" && <PomodoroWidget />}
        {active === "cashflow" && <FinancialWidget search={search} />}
        {active === "notifications" && <NotificationsCenter />}
        {active === "assistant" && <AIAssistantWidget />}
        {active === "analytics" && <AnalyticsSection search={search} />}
        {active === "settings" && <SettingsView />}
      </motion.div>
    </AnimatePresence>
  );
}


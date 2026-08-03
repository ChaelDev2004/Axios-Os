"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Flame, Plus, StickyNote, Target, TrendingUp, Zap } from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  useCreateNote,
  useDashboardStats,
  useLandingPageVisits,
  useNotes,
  usePomodoroSessions,
  useTasks,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import { useNotesFocusStore } from "@/features/dashboard/stores/notes-focus.store";
import {
  groupFocusSecondsByDay,
  groupLandingVisitsByDay,
  groupTasksCompletedByDay,
} from "@/features/dashboard/lib/analytics";
import { formatHours, formatPhp } from "@/features/dashboard/lib/format";
import {
  areaFill,
  defaultDoughnutOptions,
  defaultLineOptions,
  Doughnut,
  Line,
  sparklineOptions,
} from "@/lib/chartjs";
import { useDashboardNav } from "@/components/dashboard/dashboard-context";
import { FocusHub } from "@/components/axion/views/focus-view";
import { EmptyState } from "@/components/axion/views/empty-state";
import {
  AnimatedNumber,
  greetingForHour,
  isSameDay,
  todayKey,
} from "@/components/axion/views/shared";

function HeroSection({
  name,
  avatarUrl,
  productivity,
}: {
  name: string;
  avatarUrl: string | null;
  productivity: number;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const greeting = now ? greetingForHour(now.getHours()) : "Welcome";
  const timeLabel = now
    ? now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })
    : "—";
  const dateLabel = now
    ? now.toLocaleDateString("en-PH", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : "";
  const dateShort = now
    ? now.toLocaleDateString("en-PH", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <section className="axion-card relative overflow-hidden pt-10! sm:pt-12!">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-indigo-500/20 via-transparent to-fuchsia-500/15" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
        <div className="min-w-0">
          <div className="axion-kicker">Axion OS · Personal Workspace</div>

          <div className="mt-4 flex min-w-0 items-start gap-3 sm:gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-2 ring-white/10 sm:h-14 sm:w-14"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-fuchsia-500 text-lg font-bold text-white sm:h-14 sm:w-14">
                {(name[0] ?? "U").toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
                {greeting}, {name}
              </h1>
              <p className="axion-body mt-1.5 text-sm leading-relaxed sm:text-base">
                Your operating system for focus, portfolio growth, and calm
                execution.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              {
                icon: <CalendarDays className="h-3.5 w-3.5" />,
                label: dateLabel || "Today",
              },
              { icon: <Zap className="h-3.5 w-3.5" />, label: timeLabel },
              {
                icon: <Flame className="h-3.5 w-3.5" />,
                label: `${productivity}% productivity`,
              },
            ].map((chip) => (
              <span key={chip.label} className="axion-chip">
                {chip.icon}
                {chip.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="axion-soft flex min-w-0 flex-col justify-between gap-2">
            <div className="axion-kicker">Productivity</div>
            <div className="axion-value flex items-baseline gap-1 tabular-nums">
              <span>{productivity}</span>
              <span className="text-sm font-medium text-slate-500 sm:text-base">
                %
              </span>
            </div>
          </div>
          <div className="axion-soft flex min-w-0 flex-col justify-between gap-2">
            <div className="axion-kicker">Date</div>
            <div className="text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
              <span className="sm:hidden">{dateShort || "—"}</span>
              <span className="hidden sm:inline">{dateLabel || "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiGrid() {
  const { data: stats } = useDashboardStats();
  const { data: landingVisits = [] } = useLandingPageVisits({ days: 30 });

  const visitTrend = useMemo(() => {
    const buckets = groupLandingVisitsByDay(landingVisits, 7);
    return {
      values: buckets.map((d) => d.value),
      labels: buckets.map((d) => d.label),
      weekTotal: buckets.reduce((sum, d) => sum + d.value, 0),
    };
  }, [landingVisits]);

  const kpis = [
    {
      label: "Landing page visits",
      value: stats?.portfolioViews ?? landingVisits.length,
      hint:
        visitTrend.weekTotal > 0
          ? `${visitTrend.weekTotal} this week`
          : "Live traffic",
      trend: visitTrend.values,
      labels: visitTrend.labels,
      color: "#60a5fa",
      money: false as const,
      display: undefined as string | undefined,
    },
    {
      label: "Tasks Completed",
      value: stats?.completedTaskCount ?? 0,
      hint: `${stats?.taskCount ?? 0} total`,
      trend: (stats?.tasksByDay ?? []).map((d) => d.value),
      labels: (stats?.tasksByDay ?? []).map((d) => d.label),
      color: "#34d399",
      money: false as const,
      display: undefined as string | undefined,
    },
    {
      label: "Cash Balance",
      value: stats?.balance ?? 0,
      hint: "Income − expense",
      trend: (stats?.cashflowByDay ?? []).map((d) => d.value),
      labels: (stats?.cashflowByDay ?? []).map((d) => d.label),
      color: "#fbbf24",
      money: true as const,
      display: formatPhp(stats?.balance ?? 0),
    },
    {
      label: "Focus Hours",
      value: Math.round((stats?.focusSeconds ?? 0) / 3600),
      hint: formatHours(stats?.focusSeconds ?? 0),
      trend: (stats?.focusByDay ?? []).map((d) => +(d.value / 3600).toFixed(2)),
      labels: (stats?.focusByDay ?? []).map((d) => d.label),
      color: "#818cf8",
      money: false as const,
      display: formatHours(stats?.focusSeconds ?? 0),
    },
  ];

  return (
    <div className="grid w-full min-w-0 grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="axion-card axion-card-glow flex flex-col gap-1.5 p-3! sm:p-3.5!"
        >
          <div className="axion-kicker truncate text-[0.62rem] tracking-[0.12em]">
            {k.label}
          </div>
          <div className="axion-value mt-0! truncate text-lg! tabular-nums leading-none sm:text-xl!">
            {k.money || k.display ? (
              k.display ?? formatPhp(k.value)
            ) : (
              <AnimatedNumber value={k.value} />
            )}
          </div>
          <div className="axion-meta mt-0! flex min-w-0 items-center gap-1 text-[11px] text-emerald-300/90">
            <TrendingUp className="h-3 w-3 shrink-0" />
            <span className="truncate">{k.hint}</span>
          </div>
          {k.trend.length > 0 ? (
            <div className="axion-chart mt-1 h-8 w-full shrink-0">
              <Line
                data={{
                  labels: k.labels.length
                    ? k.labels
                    : k.trend.map((_, idx) => String(idx)),
                  datasets: [
                    {
                      data: k.trend,
                      borderColor: k.color,
                      backgroundColor: areaFill(k.color, 0.25),
                      fill: true,
                    },
                  ],
                }}
                options={sparklineOptions}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

const ACTIVITY_RANGES = [
  { days: 7, short: "7D", label: "Last 7 days", title: "Weekly activity" },
  { days: 14, short: "14D", label: "Last 14 days", title: "Biweekly activity" },
  { days: 30, short: "30D", label: "Last 30 days", title: "Monthly activity" },
] as const;

type ActivityRangeDays = (typeof ACTIVITY_RANGES)[number]["days"];

function OverviewCharts() {
  const { data: stats } = useDashboardStats();
  const { data: tasksList = [] } = useTasks();
  const { data: sessions = [] } = usePomodoroSessions();
  const { data: landingVisits = [] } = useLandingPageVisits({ days: 30 });
  const [rangeDays, setRangeDays] = useState<ActivityRangeDays>(7);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const rangeMeta =
    ACTIVITY_RANGES.find((r) => r.days === rangeDays) ?? ACTIVITY_RANGES[0];

  const tasksByDay = useMemo(
    () => groupTasksCompletedByDay(tasksList, rangeDays),
    [tasksList, rangeDays]
  );
  const focusByDay = useMemo(
    () => groupFocusSecondsByDay(sessions, rangeDays),
    [sessions, rangeDays]
  );
  const viewsByDay = useMemo(
    () => groupLandingVisitsByDay(landingVisits, rangeDays),
    [landingVisits, rangeDays]
  );

  const labels = tasksByDay.map((d) => d.label);
  const focusHours = focusByDay.map((d) => +(d.value / 3600).toFixed(2));
  const tasks = tasksByDay.map((d) => d.value);
  const views = viewsByDay.map((d) => d.value);

  const chartOptions = useMemo(() => {
    const xTickLimit =
      rangeDays <= 7 ? (isCompact ? 4 : 7) : rangeDays <= 14 ? (isCompact ? 5 : 8) : isCompact ? 6 : 10;
    return {
      ...defaultLineOptions,
      layout: {
        padding: isCompact
          ? { top: 2, right: 2, bottom: 0, left: 0 }
          : { top: 4, right: 6, bottom: 0, left: 0 },
      },
      plugins: {
        ...defaultLineOptions.plugins,
        legend: {
          display: true,
          position: isCompact ? ("bottom" as const) : ("top" as const),
          align: "start" as const,
          labels: {
            color: "#94a3b8",
            boxWidth: isCompact ? 8 : 10,
            boxHeight: isCompact ? 8 : 10,
            usePointStyle: true,
            pointStyle: "circle" as const,
            padding: isCompact ? 8 : 14,
            font: { size: isCompact ? 10 : 12, weight: 500 as const },
          },
        },
      },
      scales: {
        ...defaultLineOptions.scales,
        x: {
          ...defaultLineOptions.scales?.x,
          ticks: {
            color: "#94a3b8",
            maxRotation: 0,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: xTickLimit,
            font: { size: isCompact ? 9 : 11 },
          },
        },
        y: {
          ...defaultLineOptions.scales?.y,
          ticks: {
            color: "#94a3b8",
            maxTicksLimit: isCompact ? 5 : 8,
            font: { size: isCompact ? 9 : 11 },
          },
        },
      },
    };
  }, [isCompact, rangeDays]);

  const mix = [
    { name: "Tasks done", value: stats?.completedTaskCount ?? 0, color: "#818cf8" },
    {
      name: "Tasks open",
      value: Math.max(0, (stats?.taskCount ?? 0) - (stats?.completedTaskCount ?? 0)),
      color: "#c084fc",
    },
    { name: "Focus (h)", value: Math.round((stats?.focusSeconds ?? 0) / 3600), color: "#34d399" },
    { name: "Landing visits", value: stats?.portfolioViews ?? 0, color: "#fbbf24" },
  ];
  const mixTotal = mix.reduce((s, m) => s + m.value, 0);
  const hasChartData =
    labels.length > 0 &&
    (focusHours.some((v) => v > 0) ||
      tasks.some((v) => v > 0) ||
      views.some((v) => v > 0));

  return (
    <div className="axion-grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div
        className="axion-card"
        style={{
          padding: isCompact ? "1rem 0.9rem 1.1rem" : undefined,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isCompact ? "column" : "row",
            flexWrap: "wrap",
            alignItems: isCompact ? "stretch" : "flex-start",
            justifyContent: "space-between",
            gap: isCompact ? "0.75rem" : "0.85rem",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 auto" }}>
            <div className="axion-kicker">Performance</div>
            <h3
              className="axion-subtitle"
              style={{
                marginBottom: 0,
                fontSize: isCompact ? "1.05rem" : undefined,
                lineHeight: 1.25,
              }}
            >
              {rangeMeta.title}
            </h3>
            <p
              style={{
                margin: "0.3rem 0 0",
                fontSize: isCompact ? "0.7rem" : "0.75rem",
                lineHeight: 1.35,
                color: "rgba(148, 163, 184, 0.9)",
                letterSpacing: "0.01em",
              }}
            >
              {rangeMeta.label}
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter activity range"
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: isCompact ? "stretch" : "flex-start",
              width: isCompact ? "100%" : "auto",
              gap: "0.2rem",
              padding: isCompact ? "0.2rem" : "0.22rem",
              borderRadius: "999px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(15,18,28,0.55) 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 20px rgba(0,0,0,0.18)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            {ACTIVITY_RANGES.map((r) => {
              const active = rangeDays === r.days;
              return (
                <button
                  key={r.days}
                  type="button"
                  aria-pressed={active}
                  aria-label={r.label}
                  onClick={() => setRangeDays(r.days)}
                  style={{
                    appearance: "none",
                    border: "none",
                    cursor: "pointer",
                    flex: isCompact ? "1 1 0" : "0 0 auto",
                    minWidth: isCompact ? 0 : "3.1rem",
                    padding: isCompact ? "0.48rem 0.4rem" : "0.42rem 0.78rem",
                    borderRadius: "999px",
                    fontSize: isCompact ? "0.68rem" : "0.72rem",
                    fontWeight: 650,
                    letterSpacing: "0.06em",
                    lineHeight: 1,
                    transition:
                      "background 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                    color: active
                      ? "#f8fafc"
                      : "rgba(148, 163, 184, 0.92)",
                    background: active
                      ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 55%, #4338ca 100%)"
                      : "transparent",
                    boxShadow: active
                      ? "0 6px 16px rgba(79, 70, 229, 0.35), inset 0 1px 0 rgba(255,255,255,0.22)"
                      : "none",
                    transform: active ? "translateY(-0.5px)" : "none",
                  }}
                >
                  {r.short}
                </button>
              );
            })}
          </div>
        </div>
        {!hasChartData ? (
          <div style={{ marginTop: isCompact ? "1rem" : "1.25rem" }}>
            <EmptyState description="Complete tasks or focus sessions to populate charts." />
          </div>
        ) : (
          <div
            className="axion-chart"
            style={{
              marginTop: isCompact ? "0.85rem" : "1.25rem",
              height: isCompact ? "14.5rem" : "20rem",
              width: "100%",
              minWidth: 0,
            }}
          >
            <Line
              data={{
                labels,
                datasets: [
                  {
                    label: "Focus (h)",
                    data: focusHours,
                    borderColor: "#818cf8",
                    backgroundColor: areaFill("#818cf8", 0.45),
                    fill: true,
                    borderWidth: isCompact ? 2 : 2.5,
                  },
                  {
                    label: "Tasks",
                    data: tasks,
                    borderColor: "#34d399",
                    backgroundColor: areaFill("#34d399", 0.35),
                    fill: true,
                    borderWidth: 2,
                  },
                  {
                    label: isCompact ? "Visits" : "Landing visits",
                    data: views,
                    borderColor: "#60a5fa",
                    backgroundColor: areaFill("#60a5fa", 0.25),
                    fill: true,
                    borderWidth: 2,
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>
        )}
      </div>

      <div className="axion-card">
        <div className="axion-kicker">Mix</div>
        <h3 className="axion-subtitle">Workload split</h3>
        {mixTotal === 0 ? (
          <div className="mt-4">
            <EmptyState />
          </div>
        ) : (
          <>
            <div className="axion-chart mt-4 h-56">
              <Doughnut
                data={{
                  labels: mix.map((c) => c.name),
                  datasets: [
                    {
                      data: mix.map((c) => c.value),
                      backgroundColor: mix.map((c) => c.color),
                      borderWidth: 0,
                      spacing: 2,
                    },
                  ],
                }}
                options={defaultDoughnutOptions}
              />
            </div>
            <div className="mt-2 space-y-2">
              {mix.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </span>
                  <span className="font-medium tabular-nums">{c.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OverviewGoals() {
  const { data: tasks = [] } = useTasks();
  const day = todayKey();

  const goals = useMemo(() => {
    const dueToday = tasks.filter(
      (t) => !t.completed && t.due_date && isSameDay(t.due_date, day)
    );
    if (dueToday.length > 0) return dueToday.slice(0, 8);
    return tasks.filter((t) => !t.completed).slice(0, 8);
  }, [tasks, day]);

  return (
    <div className="axion-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div className="axion-kicker">Daily Goals</div>
          <h3 className="axion-subtitle" style={{ marginTop: 4 }}>
            Incomplete tasks
          </h3>
        </div>
        <Target style={{ width: 16, height: 16, color: "#a5b4fc" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {goals.length === 0 ? (
          <EmptyState description="No incomplete tasks right now." />
        ) : (
          goals.map((g) => (
            <div
              key={g.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderRadius: 12,
                border: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)",
                background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
                padding: "10px 12px",
                fontSize: 14,
              }}
            >
              <span
                style={{
                  display: "flex",
                  width: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  fontSize: 10,
                  color: "transparent",
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
              <span
                style={{
                  minWidth: 0,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {g.title}
              </span>
              {g.due_date ? (
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 10,
                    color: "var(--muted-foreground)",
                  }}
                >
                  {g.due_date.slice(0, 10)}
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function OverviewNotes() {
  const { setActive } = useDashboardNav();
  const setNotesFocus = useNotesFocusStore((s) => s.setFocus);
  const { data: notes = [], isLoading } = useNotes();
  const createNote = useCreateNote({
    onSuccess: (note) => {
      setNotesFocus({ noteId: note.id });
      setActive("notes");
    },
  });

  const preview = useMemo(() => {
    return [...notes]
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (a.remind_enabled !== b.remind_enabled) return a.remind_enabled ? -1 : 1;
        return b.updated_at.localeCompare(a.updated_at);
      })
      .slice(0, 6);
  }, [notes]);

  const favoriteCount = notes.filter((n) => n.favorite).length;
  const reminderCount = notes.filter((n) => n.remind_enabled).length;

  const openNotes = () => {
    setNotesFocus({});
    setActive("notes");
  };

  const openNote = (noteId: string) => {
    setNotesFocus({ noteId });
    setActive("notes");
  };

  const snippet = (body: string | null) => {
    const text = (body ?? "").trim().replace(/\s+/g, " ");
    if (!text) return "No additional text";
    return text.length > 72 ? `${text.slice(0, 69)}…` : text;
  };

  return (
    <div className="axion-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div className="axion-kicker">Notes</div>
          <h3 className="axion-subtitle" style={{ marginTop: 4 }}>
            Recent &amp; favorites
          </h3>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            onClick={openNotes}
            style={{
              display: "inline-flex",
              height: 32,
              alignItems: "center",
              gap: 6,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
              padding: "0 10px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--foreground)",
              cursor: "pointer",
            }}
          >
            <StickyNote style={{ width: 14, height: 14 }} />
            Open
          </button>
          <button
            type="button"
            disabled={createNote.isPending}
            onClick={() => {
              createNote.mutate({
                title: "Untitled note",
                body: "",
              });
            }}
            style={{
              display: "inline-flex",
              height: 32,
              alignItems: "center",
              gap: 6,
              borderRadius: 12,
              border: "none",
              background: "#6366f1",
              padding: "0 10px",
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              cursor: createNote.isPending ? "not-allowed" : "pointer",
              opacity: createNote.isPending ? 0.6 : 1,
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            New
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          fontSize: 11,
          color: "var(--muted-foreground)",
        }}
      >
        <span
          style={{
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
            padding: "2px 8px",
          }}
        >
          {notes.length} total
        </span>
        {favoriteCount > 0 ? (
          <span
            style={{
              borderRadius: 999,
              border: "1px solid rgba(244,114,182,0.25)",
              background: "rgba(236,72,153,0.1)",
              padding: "2px 8px",
              color: "#fbcfe8",
            }}
          >
            {favoriteCount} favorite
          </span>
        ) : null}
        {reminderCount > 0 ? (
          <span
            style={{
              borderRadius: 999,
              border: "1px solid rgba(251,191,36,0.25)",
              background: "rgba(245,158,11,0.1)",
              padding: "2px 8px",
              color: "#fef3c7",
            }}
          >
            {reminderCount} reminder
          </span>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {isLoading ? (
          <EmptyState title="Loading notes…" />
        ) : preview.length === 0 ? (
          <EmptyState description="Create a note to pin ideas on your overview." />
        ) : (
          preview.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => openNote(note.id)}
              style={{
                display: "flex",
                width: "100%",
                flexDirection: "column",
                gap: 4,
                borderRadius: 12,
                border: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)",
                background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
                padding: "10px 12px",
                textAlign: "left",
                cursor: "pointer",
                color: "inherit",
                fontSize: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  minWidth: 0,
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    minWidth: 0,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 600,
                    color: "var(--foreground)",
                  }}
                >
                  {note.favorite ? "♥ " : ""}
                  {note.pinned ? "📌 " : ""}
                  {note.remind_enabled ? "🔔 " : ""}
                  {note.title}
                </span>
                {note.tag ? (
                  <span
                    style={{
                      flexShrink: 0,
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      padding: "2px 6px",
                      fontSize: 10,
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {note.tag}
                  </span>
                ) : null}
              </div>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                }}
              >
                {snippet(note.body)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function OverviewPulse() {
  const { data: notes = [] } = useNotes();
  const { data: tasks = [] } = useTasks();
  const day = todayKey();
  const dueToday = tasks.filter(
    (t) => !t.completed && t.due_date && isSameDay(t.due_date, day)
  ).length;
  const reminders = notes.filter((n) => n.remind_enabled).length;

  return (
    <div className="axion-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div className="axion-kicker">Pulse</div>
        <h3 className="axion-subtitle" style={{ marginTop: 4 }}>
          Live stats
        </h3>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          fontSize: "0.975rem",
          lineHeight: 1.55,
          color: "var(--foreground)",
        }}
      >
        <p style={{ margin: 0 }}>
          {dueToday > 0
            ? `${dueToday} task${dueToday === 1 ? "" : "s"} due today.`
            : "No tasks due today."}{" "}
          {notes.length > 0
            ? `${notes.length} note${notes.length === 1 ? "" : "s"} in your workspace.`
            : "Notes will appear here once you create one."}
        </p>
        <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
          {reminders > 0
            ? `${reminders} note reminder${reminders === 1 ? "" : "s"} armed — keep Axion open to fire notifications.`
            : "Charts, notes, and KPIs update from Supabase in real time."}
        </p>
      </div>
    </div>
  );
}

function OverviewBottomRow() {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gap: 24,
        gridTemplateColumns: isNarrow
          ? "1fr"
          : "minmax(0, 1.15fr) minmax(0, 1.15fr) minmax(0, 0.85fr)",
        width: "100%",
        minWidth: 0,
      }}
    >
      <OverviewGoals />
      <OverviewNotes />
      <OverviewPulse />
    </div>
  );
}

export function OverviewView() {
  const { user, profile } = useAuth();
  const { data: stats } = useDashboardStats();

  const name =
    profile?.full_name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "User");

  return (
    <>
      <HeroSection
        name={name}
        avatarUrl={profile?.avatar_url ?? null}
        productivity={stats?.productivity ?? 0}
      />
      <KpiGrid />
      <OverviewCharts />
      <FocusHub compact />
      <OverviewBottomRow />
    </>
  );
}

"use client";

import { useMemo } from "react";

import {
  useDashboardStats,
  usePomodoroSessions,
  usePortfolioViewEvents,
  useTasks,
  useTransactions,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import {
  groupFocusSecondsByDay,
  groupPortfolioViewsByDay,
  groupTasksCompletedByDay,
  sumExpense,
  sumIncome,
} from "@/features/dashboard/lib/analytics";
import { formatHours, formatPhp } from "@/features/dashboard/lib/format";
import {
  areaFill,
  Bar,
  defaultBarOptions,
  defaultDoughnutOptions,
  defaultLineOptions,
  Doughnut,
  Line,
} from "@/lib/chartjs";
import { EmptyState } from "@/components/axion/views/empty-state";

export function AnalyticsView() {
  const { data: stats } = useDashboardStats();
  const { data: transactions = [] } = useTransactions();
  const { data: tasks = [] } = useTasks();
  const { data: sessions = [] } = usePomodoroSessions();
  const { data: viewEvents = [] } = usePortfolioViewEvents({ days: 30 });

  const tasksByDay = stats?.tasksByDay ?? groupTasksCompletedByDay(tasks, 7);
  const focusByDay = stats?.focusByDay ?? groupFocusSecondsByDay(sessions, 7);
  const viewsByDay = stats?.viewsByDay ?? groupPortfolioViewsByDay(viewEvents, 7);
  const labels = tasksByDay.map((d) => d.label);

  const incomeByDay = useMemo(() => {
    const map = new Map(labels.map((l, i) => [tasksByDay[i]!.date, 0]));
    for (const tx of transactions) {
      if (tx.type !== "income") continue;
      const key = tx.transaction_date.slice(0, 10);
      if (!map.has(key)) continue;
      map.set(key, (map.get(key) ?? 0) + (Number(tx.amount) || 0));
    }
    return tasksByDay.map((b) => map.get(b.date) ?? 0);
  }, [transactions, tasksByDay, labels]);

  const focusHours = focusByDay.map((d) => +(d.value / 3600).toFixed(2));
  const weekFocus = focusByDay.reduce((s, d) => s + d.value, 0);
  const weekViews = viewsByDay.reduce((s, d) => s + d.value, 0);
  const weekIncome = incomeByDay.reduce((s, v) => s + v, 0);
  const totalIncome = sumIncome(transactions);
  const totalExpense = sumExpense(transactions);

  const statusMix = useMemo(() => {
    const open = tasks.filter((t) => !t.completed).length;
    const done = tasks.filter((t) => t.completed).length;
    return [
      { name: "Open", value: open, color: "#818cf8" },
      { name: "Done", value: done, color: "#34d399" },
    ];
  }, [tasks]);

  const hasAny =
    tasks.length > 0 ||
    sessions.some((s) => s.completed) ||
    transactions.length > 0 ||
    viewEvents.length > 0;

  return (
    <div className="axion-stack">
      <div className="axion-grid-4">
        {[
          {
            label: "Productivity",
            value: `${stats?.productivity ?? 0}%`,
            hint: `${stats?.completedTaskCount ?? 0}/${stats?.taskCount ?? 0} tasks`,
          },
          {
            label: "Focus Hours",
            value: formatHours(weekFocus),
            hint: "This week",
          },
          {
            label: "Landing visits",
            value: String(weekViews),
            hint: "7-day live traffic",
          },
          {
            label: "Income",
            value: formatPhp(weekIncome),
            hint: `All-time ${formatPhp(totalIncome)}`,
          },
        ].map((s) => (
          <div key={s.label} className="axion-card axion-card-glow">
            <div className="axion-kicker">{s.label}</div>
            <div className="axion-value text-2xl sm:text-3xl">{s.value}</div>
            <div className="axion-meta text-emerald-300/90">{s.hint}</div>
          </div>
        ))}
      </div>

      {!hasAny ? (
        <EmptyState description="Add tasks, focus sessions, transactions, or portfolio views to unlock analytics." />
      ) : (
        <>
          <div className="axion-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="axion-kicker">Overview</div>
                <h3 className="axion-subtitle">Tasks & traffic</h3>
              </div>
              <span className="axion-chip text-xs">Last 7 days</span>
            </div>
            <div className="axion-chart mt-5 h-96">
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Tasks completed",
                      data: tasksByDay.map((d) => d.value),
                      borderColor: "#818cf8",
                      backgroundColor: areaFill("#818cf8", 0.4),
                      fill: true,
                      borderWidth: 2.5,
                    },
                    {
                      label: "Landing visits",
                      data: viewsByDay.map((d) => d.value),
                      borderColor: "#60a5fa",
                      backgroundColor: areaFill("#60a5fa", 0.3),
                      fill: true,
                      borderWidth: 2,
                    },
                  ],
                }}
                options={defaultLineOptions}
              />
            </div>
          </div>

          <div className="axion-grid-2-lg">
            <div className="axion-card">
              <div className="axion-kicker">Focus</div>
              <h3 className="axion-subtitle">Hours by day</h3>
              <div className="axion-chart mt-5 h-80">
                <Bar
                  data={{
                    labels,
                    datasets: [
                      {
                        label: "Focus (h)",
                        data: focusHours,
                        backgroundColor: "#c084fc",
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
              </div>
            </div>

            <div className="axion-card">
              <div className="axion-kicker">Revenue</div>
              <h3 className="axion-subtitle">Daily income</h3>
              <div className="axion-chart mt-5 h-80">
                <Line
                  data={{
                    labels,
                    datasets: [
                      {
                        label: "Income (₱)",
                        data: incomeByDay,
                        borderColor: "#fbbf24",
                        backgroundColor: "#fbbf24",
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: false,
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
          </div>

          <div className="axion-grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="axion-card">
              <div className="axion-kicker">Cash</div>
              <h3 className="axion-subtitle">Income vs expense</h3>
              <div className="axion-chart mt-5 h-80">
                <Bar
                  data={{
                    labels: ["Income", "Expense"],
                    datasets: [
                      {
                        label: "Amount",
                        data: [totalIncome, totalExpense],
                        backgroundColor: ["#34d399", "#f87171"],
                        borderRadius: 8,
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
              </div>
            </div>

            <div className="axion-card">
              <div className="axion-kicker">Tasks</div>
              <h3 className="axion-subtitle">Completion mix</h3>
              {tasks.length === 0 ? (
                <div className="mt-4">
                  <EmptyState />
                </div>
              ) : (
                <>
                  <div className="axion-chart mt-4 h-56">
                    <Doughnut
                      data={{
                        labels: statusMix.map((c) => c.name),
                        datasets: [
                          {
                            data: statusMix.map((c) => c.value),
                            backgroundColor: statusMix.map((c) => c.color),
                            borderWidth: 0,
                            spacing: 2,
                          },
                        ],
                      }}
                      options={defaultDoughnutOptions}
                    />
                  </div>
                  <div className="mt-2 space-y-2">
                    {statusMix.map((c) => (
                      <div
                        key={c.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2 text-slate-300">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: c.color }}
                          />
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
        </>
      )}
    </div>
  );
}

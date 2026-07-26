"use client";

import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Banknote,
  Briefcase,
  Car,
  Coffee,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  Utensils,
  Wallet,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateNotification,
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from "@/features/dashboard/hooks/use-dashboard-queries";
import {
  balance,
  groupCashflowByDay,
  sumExpense,
  sumIncome,
} from "@/features/dashboard/lib/analytics";
import { formatPhp } from "@/features/dashboard/lib/format";
import { areaFill, defaultDoughnutOptions, defaultLineOptions, Doughnut, Line } from "@/lib/chartjs";
import { EmptyState } from "@/components/axion/views/empty-state";
import type { Transaction, TransactionType } from "@/features/auth/types/database.types";
import { APP_LOGO_URL } from "@/lib/site-branding-defaults";

function ensureBrowserNotifyPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

function showBrowserNotify(title: string, body: string, tag = "axion-finance") {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: APP_LOGO_URL, tag });
  } catch {
    /* ignore */
  }
}

type CategoryDef = {
  id: string;
  label: string;
  icon: ReactNode;
  color: string;
  types: TransactionType[];
};

const CATEGORIES: CategoryDef[] = [
  { id: "salary", label: "Salary", icon: <Banknote style={{ height: 16, width: 16 }} />, color: "#34d399", types: ["income"] },
  { id: "freelance", label: "Freelance", icon: <Laptop style={{ height: 16, width: 16 }} />, color: "#60a5fa", types: ["income"] },
  { id: "business", label: "Business", icon: <Briefcase style={{ height: 16, width: 16 }} />, color: "#818cf8", types: ["income"] },
  { id: "gift", label: "Gift", icon: <Gift style={{ height: 16, width: 16 }} />, color: "#f472b6", types: ["income", "expense"] },
  { id: "food", label: "Food", icon: <Utensils style={{ height: 16, width: 16 }} />, color: "#fbbf24", types: ["expense"] },
  { id: "coffee", label: "Coffee", icon: <Coffee style={{ height: 16, width: 16 }} />, color: "#d6b48c", types: ["expense"] },
  { id: "transport", label: "Transport", icon: <Car style={{ height: 16, width: 16 }} />, color: "#38bdf8", types: ["expense"] },
  { id: "shopping", label: "Shopping", icon: <ShoppingBag style={{ height: 16, width: 16 }} />, color: "#c084fc", types: ["expense"] },
  { id: "home", label: "Home", icon: <Home style={{ height: 16, width: 16 }} />, color: "#a78bfa", types: ["expense"] },
  { id: "tools", label: "Tools", icon: <Wifi style={{ height: 16, width: 16 }} />, color: "#818cf8", types: ["expense"] },
  { id: "health", label: "Health", icon: <HeartPulse style={{ height: 16, width: 16 }} />, color: "#fb7185", types: ["expense"] },
  { id: "education", label: "Education", icon: <GraduationCap style={{ height: 16, width: 16 }} />, color: "#2dd4bf", types: ["expense"] },
  { id: "savings", label: "Savings", icon: <PiggyBank style={{ height: 16, width: 16 }} />, color: "#4ade80", types: ["expense", "income"] },
  { id: "other", label: "Other", icon: <MoreHorizontal style={{ height: 16, width: 16 }} />, color: "#94a3b8", types: ["income", "expense"] },
];

function normalizeCategoryKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function resolveCategory(name: string | null | undefined): CategoryDef {
  const key = normalizeCategoryKey(name);
  if (!key) {
    return {
      id: "uncategorized",
      label: "Uncategorized",
      icon: <Sparkles style={{ height: 16, width: 16 }} />,
      color: "#94a3b8",
      types: ["income", "expense"],
    };
  }
  const found = CATEGORIES.find((c) => c.id === key || c.label.toLowerCase() === key);
  if (found) return found;
  return {
    id: key,
    label: name!.trim(),
    icon: <Wallet style={{ height: 16, width: 16 }} />,
    color: "#64748b",
    types: ["income", "expense"],
  };
}

/* ---------------------------------- style tokens ---------------------------------- */

const s: Record<string, CSSProperties> = {
  kpiGrid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  kpiTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  kpiValue: {
    fontSize: 26,
    color: "var(--foreground)",
  },
  labelSmall: {
    fontSize: 12,
    color: "var(--muted-foreground)",
  },
  typeRow: {
    marginTop: 16,
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "20px 0",
  },
  typeBtnBase: {
    borderRadius: "9999px",
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 500,
    textTransform: "capitalize",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  },
  formGrid: {
    marginTop: 16,
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  },
  inputBase: {
    marginTop: 4,
    paddingLeft: 16,
    borderColor: "rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
  },
  submitRow: {
    marginTop: 16,
    display: "flex",
    justifyContent: "flex-end",
  },
  chartGrid: {
    display: "grid",
    gap: 24,
    gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
  },
  categoryRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.1)",
    background: "rgba(148,163,184,0.03)",
    padding: "10px 12px",
    fontSize: 14,
  },
  categoryLeft: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: 10,
    color: "var(--foreground)",
  },
  categoryName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 500,
  },
  categoryValue: {
    flexShrink: 0,
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
    color: "var(--foreground)",
  },
  editPanel: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: 16,
  },
  editTypeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  editTypeBtn: {
    borderRadius: "9999px",
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 500,
    textTransform: "capitalize",
    cursor: "pointer",
  },
  editFieldsGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  },
  editActions: {
    display: "flex",
    gap: 8,
  },
  ledgerList: {
    marginTop: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  ledgerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 14,
  },
  ledgerLeft: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: 12,
  },
  ledgerTitle: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 500,
    color: "var(--foreground)",
  },
  ledgerTypeTag: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: 400,
    textTransform: "capitalize",
    color: "var(--muted-foreground)",
  },
  ledgerSub: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 12,
    color: "var(--muted-foreground)",
  },
  ledgerRight: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    borderRadius: 6,
    padding: 4,
    color: "var(--muted-foreground)",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
};

function categoryBadgeStyle(color: string, size: "sm" | "md"): CSSProperties {
  return {
    display: "inline-flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    height: size === "sm" ? 32 : 40,
    width: size === "sm" ? 32 : 40,
    background: `${color}22`,
    border: `1px solid ${color}44`,
    color,
  };
}

function CategoryIconBadge({ category, size = "md" }: { category: CategoryDef; size?: "sm" | "md" }) {
  return <span style={categoryBadgeStyle(category.color, size)}>{category.icon}</span>;
}

function CategoryPicker({
  type,
  value,
  onChange,
}: {
  type: TransactionType;
  value: string;
  onChange: (label: string) => void;
}) {
  const options = CATEGORIES.filter((c) => c.types.includes(type));

  return (
    <div
      className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(130px,1fr))]"
      style={{
        marginTop: 8,
      }}
    >
      {options.map((c) => {
        const selected =
          normalizeCategoryKey(value) === c.id || normalizeCategoryKey(value) === c.label.toLowerCase();
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.label)}
            className="flex min-w-0 items-center gap-2.5"
            style={{
              borderRadius: 12,
              padding: "10px 12px",
              textAlign: "left",
              fontSize: 14,
              cursor: "pointer",
              border: selected ? "1px solid rgba(129,140,248,0.4)" : "1px solid rgba(255,255,255,0.08)",
              background: selected ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
              color: selected ? "#fff" : "var(--muted-foreground)",
              boxShadow: selected ? "0 0 0 1px rgba(129,140,248,0.25)" : "none",
            }}
          >
            <CategoryIconBadge category={c} size="sm" />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
              {c.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function groupIncomeExpenseByDay(transactions: Transaction[], days = 7) {
  const cashflow = groupCashflowByDay(transactions, days);
  const incomeMap = new Map(cashflow.map((b) => [b.date, 0]));
  const expenseMap = new Map(cashflow.map((b) => [b.date, 0]));

  for (const tx of transactions) {
    const key = tx.transaction_date.slice(0, 10);
    if (!incomeMap.has(key)) continue;
    const amount = Number(tx.amount) || 0;
    if (tx.type === "income") {
      incomeMap.set(key, (incomeMap.get(key) ?? 0) + amount);
    } else {
      expenseMap.set(key, (expenseMap.get(key) ?? 0) + amount);
    }
  }

  return cashflow.map((b) => ({
    label: b.label,
    income: incomeMap.get(b.date) ?? 0,
    expense: expenseMap.get(b.date) ?? 0,
  }));
}

export function FinanceView() {
  const { data: transactions = [], isLoading } = useTransactions();
  const createNotification = useCreateNotification();

  const notifyTransaction = useCallback(
    async (tx: Transaction) => {
      ensureBrowserNotifyPermission();
      const amountLabel = formatPhp(Number(tx.amount) || 0);
      const category = tx.category?.trim() || "Uncategorized";
      const isIncome = tx.type === "income";
      const title = isIncome ? "Income added" : "Expense added";
      const message = isIncome
        ? `+${amountLabel} logged under ${category}.`
        : `−${amountLabel} logged under ${category}.`;

      showBrowserNotify(title, message, isIncome ? "axion-finance-income" : "axion-finance-expense");
      toast.success(message);

      try {
        await createNotification.mutateAsync({
          title,
          message,
          type: isIncome ? "finance_income" : "finance_expense",
          read: false,
        });
      } catch {
        /* non-blocking */
      }
    },
    [createNotification]
  );

  const createTx = useCreateTransaction({
    onSuccess: (tx) => {
      void notifyTransaction(tx);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateTx = useUpdateTransaction({
    onSuccess: () => toast.success("Transaction updated"),
    onError: (e) => toast.error(e.message),
  });
  const deleteTx = useDeleteTransaction({
    onSuccess: () => toast.success("Transaction deleted"),
    onError: (e) => toast.error(e.message),
  });

  const [type, setType] = useState<TransactionType>("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Salary");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [editing, setEditing] = useState<Transaction | null>(null);

  const income = sumIncome(transactions);
  const expense = sumExpense(transactions);
  const bal = balance(transactions);
  const savings = Math.max(0, income - expense);
  const series = useMemo(() => groupIncomeExpenseByDay(transactions, 7), [transactions]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== "expense") continue;
      const key = tx.category?.trim() || "Uncategorized";
      map.set(key, (map.get(key) ?? 0) + (Number(tx.amount) || 0));
    }
    return Array.from(map.entries()).map(([name, value]) => {
      const meta = resolveCategory(name);
      return { name: meta.label, value, color: meta.color, icon: meta.icon, meta };
    });
  }, [transactions]);

  const setTypeAndCategory = (next: TransactionType) => {
    setType(next);
    const first = CATEGORIES.find((c) => c.types.includes(next));
    setCategory(first?.label ?? "Other");
  };

  const submit = () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!category.trim()) {
      toast.error("Pick a category");
      return;
    }
    createTx.mutate({
      type,
      amount: amt,
      category: category.trim(),
      description: description.trim() || null,
      transaction_date: date,
    });
    setAmount("");
    setDescription("");
  };

  const saveEdit = () => {
    if (!editing) return;
    updateTx.mutate({
      id: editing.id,
      input: {
        type: editing.type,
        amount: Number(editing.amount),
        category: editing.category,
        description: editing.description,
        transaction_date: editing.transaction_date.slice(0, 10),
      },
    });
    setEditing(null);
  };

  const kpis = [
    { label: "Cash Balance", value: formatPhp(bal), icon: <Wallet style={{ height: 16, width: 16 }} />, color: "#818cf8" },
    { label: "Income", value: formatPhp(income), icon: <Banknote style={{ height: 16, width: 16 }} />, color: "#34d399" },
    { label: "Expenses", value: formatPhp(expense), icon: <ShoppingBag style={{ height: 16, width: 16 }} />, color: "#f87171" },
    { label: "Savings", value: formatPhp(savings), icon: <PiggyBank style={{ height: 16, width: 16 }} />, color: "#fbbf24" },
  ];

  return (
    <div className="axion-stack">
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
        {kpis.map((c) => (
          <div key={c.label} className="axion-card axion-card-glow">
            <div style={s.kpiTop}>
              <div className="min-w-0">
                <div className="axion-kicker">{c.label}</div>
                <div
                  className="axion-value truncate text-xl! sm:text-2xl!"
                  title={c.value}
                >
                  {c.value}
                </div>
              </div>
              <span style={categoryBadgeStyle(c.color, "md")}>{c.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="axion-card">
        <div className="axion-kicker" style={{ padding: "20px 0" }}>Add transaction</div>
        <h3 className="axion-subtitle">Log income or expense</h3>

        <div
          className="grid grid-cols-2 gap-2"
          style={{ marginTop: 16, padding: "20px 0" }}
        >
          {(["income", "expense"] as const).map((t) => {
            const active = type === t;
            const activeColor = t === "income" ? "#6ee7b7" : "#fda4af";
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeAndCategory(t)}
                style={{
                  ...s.typeBtnBase,
                  width: "100%",
                  border: active
                    ? `1px solid ${t === "income" ? "rgba(52,211,153,0.4)" : "rgba(251,113,133,0.4)"}`
                    : "1px solid rgba(255,255,255,0.1)",
                  background: active
                    ? t === "income"
                      ? "rgba(16,185,129,0.15)"
                      : "rgba(244,63,94,0.15)"
                    : "rgba(255,255,255,0.05)",
                  color: active ? activeColor : "var(--muted-foreground)",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 16, padding: "20px 0" }}>
          <Label style={s.labelSmall}>Category</Label>
          <CategoryPicker type={type} value={category} onChange={setCategory} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label style={s.labelSmall}>Amount (₱)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={s.inputBase}
            />
          </div>
          <div>
            <Label style={s.labelSmall}>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={s.inputBase} />
          </div>
          <div className="sm:col-span-2">
            <Label style={s.labelSmall}>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note"
              style={s.inputBase}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-stretch sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            style={{
              borderRadius: "9999px",
              background: "linear-gradient(to right, #6366f1, #d946ef)",
              color: "#fff",
               marginTop: "20px"
            }}
            onClick={submit}
            disabled={createTx.isPending}
          >
            <Plus style={{ marginRight: 4, height: 16, width: 16 }} />
            Add {category || "transaction"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="axion-card">
          <div className="axion-kicker">Cash Flow</div>
          <h3 className="axion-subtitle">Income vs expense</h3>
          {transactions.length === 0 ? (
            <div style={{ marginTop: 20 }}>
              <EmptyState />
            </div>
          ) : (
            <div className="axion-chart mt-5 h-64 sm:h-80">
              <Line
                data={{
                  labels: series.map((d) => d.label),
                  datasets: [
                    { label: "Income", data: series.map((d) => d.income), borderColor: "#34d399", backgroundColor: areaFill("#34d399"), fill: true },
                    { label: "Expense", data: series.map((d) => d.expense), borderColor: "#f87171", backgroundColor: areaFill("#f87171"), fill: true },
                  ],
                }}
                options={defaultLineOptions}
              />
            </div>
          )}
        </div>
        <div className="axion-card">
          <div className="axion-kicker">Categories</div>
          <h3 className="axion-subtitle">Expense breakdown</h3>
          {categories.length === 0 ? (
            <div style={{ marginTop: 16 }}>
              <EmptyState description="No expenses categorized yet." />
            </div>
          ) : (
            <>
              <div className="axion-chart mt-4 h-52 sm:h-56">
                <Doughnut
                  data={{
                    labels: categories.map((c) => c.name),
                    datasets: [{ data: categories.map((c) => c.value), backgroundColor: categories.map((c) => c.color), borderWidth: 0 }],
                  }}
                  options={defaultDoughnutOptions}
                />
              </div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {categories.map((c) => (
                  <div key={c.name} style={s.categoryRow}>
                    <span style={s.categoryLeft}>
                      <CategoryIconBadge category={c.meta} size="sm" />
                      <span style={s.categoryName}>{c.name}</span>
                    </span>
                    <span style={s.categoryValue}>{formatPhp(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="axion-card">
        <div className="axion-kicker">Ledger</div>
        <h3 className="axion-subtitle">All transactions</h3>
        {editing ? (
          <div style={s.editPanel}>
            <div style={s.editTypeRow}>
              {(["income", "expense"] as const).map((t) => {
                const active = editing.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const first = CATEGORIES.find((c) => c.types.includes(t));
                      setEditing({ ...editing, type: t, category: first?.label ?? editing.category });
                    }}
                    style={{
                      ...s.editTypeBtn,
                      border: active ? "1px solid rgba(129,140,248,0.4)" : "1px solid rgba(255,255,255,0.1)",
                      background: active ? "rgba(99,102,241,0.15)" : "transparent",
                      color: active ? "#c7d2fe" : "var(--muted-foreground)",
                     
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <CategoryPicker
              type={editing.type}
              value={editing.category ?? ""}
              onChange={(label) => setEditing({ ...editing, category: label })}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                type="number"
                value={editing.amount}
                onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })}
                style={s.inputBase}
              />
              <Input
                type="date"
                value={editing.transaction_date.slice(0, 10)}
                onChange={(e) => setEditing({ ...editing, transaction_date: e.target.value })}
                style={s.inputBase}
              />
              <div className="flex gap-2 sm:col-span-2">
                <Button
                  className="flex-1 sm:flex-none"
                  style={{ borderRadius: "9999px" }}
                  onClick={saveEdit}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 sm:flex-none"
                  style={{ borderRadius: "9999px" }}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        <div style={s.ledgerList}>
          {isLoading ? (
            <EmptyState title="Loading…" />
          ) : transactions.length === 0 ? (
            <EmptyState />
          ) : (
            transactions.map((tx) => {
              const cat = resolveCategory(tx.category);
              return (
                <div
                  key={tx.id}
                  className="axion-soft flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <CategoryIconBadge category={cat} />
                    <div style={{ minWidth: 0 }}>
                      <div style={s.ledgerTitle}>
                        {cat.label}
                        <span style={s.ledgerTypeTag}>{tx.type}</span>
                      </div>
                      <div style={s.ledgerSub}>
                        {tx.transaction_date.slice(0, 10)}
                        {tx.description ? ` — ${tx.description}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full shrink-0 items-center justify-between gap-2 pl-11 sm:w-auto sm:justify-end sm:pl-0">
                    <span
                      className="min-w-0 truncate font-medium tabular-nums"
                      style={{ color: tx.type === "income" ? "#6ee7b7" : "#fca5a5" }}
                      title={`${tx.type === "income" ? "+" : "−"}${formatPhp(Number(tx.amount))}`}
                    >
                      {tx.type === "income" ? "+" : "−"}
                      {formatPhp(Number(tx.amount))}
                    </span>
                    <button type="button" aria-label="Edit" style={s.iconBtn} onClick={() => setEditing(tx)}>
                      <Pencil style={{ height: 14, width: 14 }} />
                    </button>
                    <button type="button" aria-label="Delete" style={s.iconBtn} onClick={() => deleteTx.mutate(tx.id)}>
                      <Trash2 style={{ height: 14, width: 14 }} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
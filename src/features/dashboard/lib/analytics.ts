export type DayBucket = {
  date: string;
  label: string;
  value: number;
};

function toDateKey(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildDayKeys(days: number, end: Date = new Date()): string[] {
  const keys: string[] = [];
  const endDay = startOfDay(end);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(endDay);
    d.setDate(endDay.getDate() - i);
    keys.push(toDateKey(d));
  }
  return keys;
}

function emptyBuckets(days: number): DayBucket[] {
  return buildDayKeys(days).map((date) => ({
    date,
    label: date.slice(5),
    value: 0,
  }));
}

function monthKey(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function productivityPercent(completed: number, total: number): number {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return Math.round((Math.max(0, completed) / total) * 100);
}

export function groupTasksCompletedByDay(
  tasks: Array<{ completed: boolean; updated_at: string; created_at?: string }>,
  days = 7
): DayBucket[] {
  const buckets = emptyBuckets(days);
  const index = new Map(buckets.map((b, i) => [b.date, i]));

  for (const task of tasks) {
    if (!task.completed) continue;
    const key = toDateKey(task.updated_at || task.created_at || "");
    const i = index.get(key);
    if (i === undefined) continue;
    buckets[i]!.value += 1;
  }

  return buckets;
}

export function groupFocusSecondsByDay(
  sessions: Array<{ duration: number; completed: boolean; started_at: string; ended_at?: string | null }>,
  days = 7
): DayBucket[] {
  const buckets = emptyBuckets(days);
  const index = new Map(buckets.map((b, i) => [b.date, i]));

  for (const session of sessions) {
    if (!session.completed) continue;
    const key = toDateKey(session.ended_at || session.started_at);
    const i = index.get(key);
    if (i === undefined) continue;
    buckets[i]!.value += Math.max(0, session.duration || 0);
  }

  return buckets;
}

export function groupCashflowByDay(
  transactions: Array<{ amount: number; type: "income" | "expense"; transaction_date: string }>,
  days = 7
): DayBucket[] {
  const buckets = emptyBuckets(days);
  const index = new Map(buckets.map((b, i) => [b.date, i]));

  for (const tx of transactions) {
    const key = toDateKey(tx.transaction_date);
    const i = index.get(key);
    if (i === undefined) continue;
    const amount = Number(tx.amount) || 0;
    buckets[i]!.value += tx.type === "income" ? amount : -amount;
  }

  return buckets;
}

export function groupPortfolioViewsByDay(
  events: Array<{ viewed_at: string }>,
  days = 7
): DayBucket[] {
  const buckets = emptyBuckets(days);
  const index = new Map(buckets.map((b, i) => [b.date, i]));

  for (const event of events) {
    const key = toDateKey(event.viewed_at);
    const i = index.get(key);
    if (i === undefined) continue;
    buckets[i]!.value += 1;
  }

  return buckets;
}

export function groupLandingVisitsByDay(
  visits: Array<{ visited_at: string }>,
  days = 7
): DayBucket[] {
  return groupPortfolioViewsByDay(
    visits.map((v) => ({ viewed_at: v.visited_at })),
    days
  );
}

export function sumIncome(
  transactions: Array<{ type: "income" | "expense"; amount: number }>
): number {
  return transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

export function sumExpense(
  transactions: Array<{ type: "income" | "expense"; amount: number }>
): number {
  return transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

export function balance(
  transactions: Array<{ type: "income" | "expense"; amount: number }>
): number {
  return sumIncome(transactions) - sumExpense(transactions);
}

export function monthlyIncome(
  transactions: Array<{ type: "income" | "expense"; amount: number; transaction_date: string }>,
  month: string = monthKey(new Date())
): number {
  return sumIncome(
    transactions.filter((t) => t.type === "income" && monthKey(t.transaction_date) === month)
  );
}

export function monthlyExpense(
  transactions: Array<{ type: "income" | "expense"; amount: number; transaction_date: string }>,
  month: string = monthKey(new Date())
): number {
  return sumExpense(
    transactions.filter((t) => t.type === "expense" && monthKey(t.transaction_date) === month)
  );
}

export function monthlyBalance(
  transactions: Array<{ type: "income" | "expense"; amount: number; transaction_date: string }>,
  month: string = monthKey(new Date())
): number {
  return monthlyIncome(transactions, month) - monthlyExpense(transactions, month);
}

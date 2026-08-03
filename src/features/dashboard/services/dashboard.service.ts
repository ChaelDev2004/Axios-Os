import { createClient } from "@/lib/supabase/client";
import type {
  AiConversation,
  Database,
  LandingPageVisit,
  Note,
  Notification,
  PomodoroSession,
  PortfolioProject,
  PortfolioViewEvent,
  Project,
  Task,
  Transaction,
} from "@/features/auth/types/database.types";
import {
  balance,
  groupCashflowByDay,
  groupFocusSecondsByDay,
  groupLandingVisitsByDay,
  groupTasksCompletedByDay,
  monthlyExpense,
  monthlyIncome,
  productivityPercent,
  sumExpense,
  sumIncome,
} from "@/features/dashboard/lib/analytics";
import { isBrowserOnline } from "@/features/offline/lib/offline-utils";
import {
  cacheNotes,
  cachePomodoroSessions,
  cacheTasks,
  cacheTransactions,
  deleteLocalNote,
  deleteLocalTask,
  deleteLocalTransaction,
  patchLocalNote,
  patchLocalTask,
  readCachedNotes,
  readCachedPomodoroSessions,
  readCachedTasks,
  readCachedTransactions,
  removeCachedNote,
  removeCachedTask,
  removeCachedTransaction,
  upsertLocalNote,
  upsertLocalPomodoroSession,
  upsertLocalTask,
  upsertLocalTransaction,
} from "@/features/offline/services/offline-repository";
import { SyncService } from "@/features/offline/services/sync.service";

type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];
type NoteInsert = Database["public"]["Tables"]["notes"]["Insert"];
type NoteUpdate = Database["public"]["Tables"]["notes"]["Update"];
type PortfolioInsert = Database["public"]["Tables"]["portfolio_projects"]["Insert"];
type PortfolioUpdate = Database["public"]["Tables"]["portfolio_projects"]["Update"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

export type DashboardStats = {
  projectCount: number;
  taskCount: number;
  completedTaskCount: number;
  productivity: number;
  focusSeconds: number;
  income: number;
  expense: number;
  balance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  portfolioViews: number;
  unreadNotifications: number;
  tasksByDay: ReturnType<typeof groupTasksCompletedByDay>;
  focusByDay: ReturnType<typeof groupFocusSecondsByDay>;
  cashflowByDay: ReturnType<typeof groupCashflowByDay>;
  viewsByDay: ReturnType<typeof groupLandingVisitsByDay>;
};

async function requireUserId(): Promise<string> {
  const supabase = createClient();

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch {
    // getSession can throw if storage/auth client is in a bad state
  }

  if (!isBrowserOnline()) {
    throw new Error("Not authenticated. Sign in while online to use offline mode.");
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw new Error(error.message);
    }
    if (!user) {
      throw new Error("Not authenticated.");
    }
    return user.id;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Not authenticated.");
  }
}

function throwOnError(error: { message: string } | null): asserts error is null {
  if (error) {
    throw new Error(error.message);
  }
}

async function softFetch<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!isBrowserOnline()) {
    return fallback;
  }
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function fetchProjects(): Promise<Project[]> {
  if (!isBrowserOnline()) {
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  throwOnError(error);
  return data ?? [];
}

export async function createProject(
  input: Omit<ProjectInsert, "user_id" | "id">
): Promise<Project> {
  const userId = await requireUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  throwOnError(error);
  return data;
}

export async function updateProject(
  id: string,
  input: Omit<ProjectUpdate, "user_id" | "id">
): Promise<Project> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  throwOnError(error);
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  throwOnError(error);
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function fetchTasks(projectId?: string): Promise<Task[]> {
  if (!isBrowserOnline()) {
    return readCachedTasks(projectId);
  }

  try {
    const supabase = createClient();
    let query = supabase.from("tasks").select("*").order("updated_at", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;
    throwOnError(error);
    const rows = data ?? [];
    await cacheTasks(rows);
    return rows;
  } catch {
    return readCachedTasks(projectId);
  }
}

export async function createTask(
  input: Omit<TaskInsert, "user_id" | "id">
): Promise<Task> {
  const userId = await requireUserId();

  if (!isBrowserOnline()) {
    const row = await upsertLocalTask({ ...input, user_id: userId });
    await SyncService.refreshPendingCount();
    return row;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...input, user_id: userId })
      .select()
      .single();

    throwOnError(error);
    await cacheTasks([data]);
    return data;
  } catch {
    const row = await upsertLocalTask({ ...input, user_id: userId });
    await SyncService.refreshPendingCount();
    return row;
  }
}

export async function updateTask(
  id: string,
  input: Omit<TaskUpdate, "user_id" | "id">
): Promise<Task> {
  if (!isBrowserOnline() || id.startsWith("task_") || id.startsWith("local_")) {
    const row = await patchLocalTask(id, input);
    await SyncService.refreshPendingCount();
    return row;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    throwOnError(error);
    await cacheTasks([data]);
    return data;
  } catch {
    const row = await patchLocalTask(id, input);
    await SyncService.refreshPendingCount();
    return row;
  }
}

export async function deleteTask(id: string): Promise<void> {
  if (!isBrowserOnline() || id.startsWith("task_") || id.startsWith("local_")) {
    await deleteLocalTask(id);
    await SyncService.refreshPendingCount();
    return;
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    throwOnError(error);
    await removeCachedTask(id);
  } catch {
    await deleteLocalTask(id);
    await SyncService.refreshPendingCount();
  }
}

export async function toggleTaskComplete(id: string, completed: boolean): Promise<Task> {
  return updateTask(id, {
    completed,
    status: completed ? "done" : "todo",
  });
}

// ---------------------------------------------------------------------------
// Pomodoro
// ---------------------------------------------------------------------------

export async function fetchPomodoroSessions(): Promise<PomodoroSession[]> {
  if (!isBrowserOnline()) {
    return readCachedPomodoroSessions();
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pomodoro_sessions")
      .select("*")
      .order("started_at", { ascending: false });

    throwOnError(error);
    const rows = data ?? [];
    await cachePomodoroSessions(rows);
    return rows;
  } catch {
    return readCachedPomodoroSessions();
  }
}

export async function startPomodoroSession(
  durationSeconds = 0
): Promise<PomodoroSession> {
  const userId = await requireUserId();
  const startedAt = new Date().toISOString();

  if (!isBrowserOnline()) {
    const row = await upsertLocalPomodoroSession({
      user_id: userId,
      duration: durationSeconds,
      completed: false,
      started_at: startedAt,
      ended_at: null,
    });
    await SyncService.refreshPendingCount();
    return row;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pomodoro_sessions")
      .insert({
        user_id: userId,
        duration: durationSeconds,
        completed: false,
        started_at: startedAt,
      })
      .select()
      .single();

    throwOnError(error);
    await cachePomodoroSessions([data]);
    return data;
  } catch {
    const row = await upsertLocalPomodoroSession({
      user_id: userId,
      duration: durationSeconds,
      completed: false,
      started_at: startedAt,
      ended_at: null,
    });
    await SyncService.refreshPendingCount();
    return row;
  }
}

export async function completePomodoroSession(
  id: string,
  durationSeconds: number
): Promise<PomodoroSession> {
  const endedAt = new Date().toISOString();

  if (!isBrowserOnline() || id.startsWith("focus_") || id.startsWith("local_")) {
    const cached = (await readCachedPomodoroSessions()).find((s) => s.id === id);
    const row = await upsertLocalPomodoroSession({
      id,
      user_id: cached?.user_id ?? (await requireUserId()),
      duration: durationSeconds,
      completed: true,
      started_at: cached?.started_at ?? endedAt,
      ended_at: endedAt,
    });
    await SyncService.refreshPendingCount();
    return row;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pomodoro_sessions")
      .update({
        duration: durationSeconds,
        completed: true,
        ended_at: endedAt,
      })
      .eq("id", id)
      .select()
      .single();

    throwOnError(error);
    await cachePomodoroSessions([data]);
    return data;
  } catch {
    const cached = (await readCachedPomodoroSessions()).find((s) => s.id === id);
    const row = await upsertLocalPomodoroSession({
      id,
      user_id: cached?.user_id ?? (await requireUserId()),
      duration: durationSeconds,
      completed: true,
      started_at: cached?.started_at ?? endedAt,
      ended_at: endedAt,
    });
    await SyncService.refreshPendingCount();
    return row;
  }
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export async function fetchTransactions(): Promise<Transaction[]> {
  if (!isBrowserOnline()) {
    return readCachedTransactions();
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("transaction_date", { ascending: false });

    throwOnError(error);
    const rows = data ?? [];
    await cacheTransactions(rows);
    return rows;
  } catch {
    return readCachedTransactions();
  }
}

export async function createTransaction(
  input: Omit<TransactionInsert, "user_id" | "id">
): Promise<Transaction> {
  const userId = await requireUserId();

  if (!isBrowserOnline()) {
    const row = await upsertLocalTransaction({
      ...input,
      user_id: userId,
      type: input.type,
      amount: input.amount,
      category: input.category ?? null,
      description: input.description ?? null,
      transaction_date:
        input.transaction_date ?? new Date().toISOString().slice(0, 10),
    });
    await SyncService.refreshPendingCount();
    return row;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .insert({ ...input, user_id: userId })
      .select()
      .single();

    throwOnError(error);
    await cacheTransactions([data]);
    return data;
  } catch {
    const row = await upsertLocalTransaction({
      ...input,
      user_id: userId,
      type: input.type,
      amount: input.amount,
      category: input.category ?? null,
      description: input.description ?? null,
      transaction_date:
        input.transaction_date ?? new Date().toISOString().slice(0, 10),
    });
    await SyncService.refreshPendingCount();
    return row;
  }
}

export async function updateTransaction(
  id: string,
  input: Omit<TransactionUpdate, "user_id" | "id">
): Promise<Transaction> {
  if (!isBrowserOnline() || id.startsWith("txn_") || id.startsWith("local_")) {
    const existing = (await readCachedTransactions()).find((t) => t.id === id);
    if (!existing) throw new Error("Transaction not found in offline storage.");
    const row = await upsertLocalTransaction({
      ...existing,
      ...input,
      id,
      type: input.type ?? existing.type,
      amount: input.amount ?? existing.amount,
    });
    await SyncService.refreshPendingCount();
    return row;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    throwOnError(error);
    await cacheTransactions([data]);
    return data;
  } catch {
    const existing = (await readCachedTransactions()).find((t) => t.id === id);
    if (!existing) throw new Error("Transaction not found in offline storage.");
    const row = await upsertLocalTransaction({
      ...existing,
      ...input,
      id,
      type: input.type ?? existing.type,
      amount: input.amount ?? existing.amount,
    });
    await SyncService.refreshPendingCount();
    return row;
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  if (!isBrowserOnline() || id.startsWith("txn_") || id.startsWith("local_")) {
    await deleteLocalTransaction(id);
    await SyncService.refreshPendingCount();
    return;
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    throwOnError(error);
    await removeCachedTransaction(id);
  } catch {
    await deleteLocalTransaction(id);
    await SyncService.refreshPendingCount();
  }
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function fetchNotes(filters?: {
  taskId?: string;
  dueDate?: string;
}): Promise<Note[]> {
  if (!isBrowserOnline()) {
    return readCachedNotes(filters);
  }

  try {
    const supabase = createClient();
    let query = supabase.from("notes").select("*").order("updated_at", { ascending: false });
    if (filters?.taskId) query = query.eq("task_id", filters.taskId);
    if (filters?.dueDate) query = query.eq("due_date", filters.dueDate);
    const { data, error } = await query;
    throwOnError(error);
    const rows = data ?? [];
    await cacheNotes(rows);
    return rows;
  } catch {
    return readCachedNotes(filters);
  }
}

export async function createNote(
  input: Omit<NoteInsert, "user_id" | "id">
): Promise<Note> {
  const userId = await requireUserId();

  if (!isBrowserOnline()) {
    const row = await upsertLocalNote({ ...input, user_id: userId });
    await SyncService.refreshPendingCount();
    return row;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notes")
      .insert({ ...input, user_id: userId })
      .select()
      .single();
    throwOnError(error);
    await cacheNotes([data]);
    return data;
  } catch {
    const row = await upsertLocalNote({ ...input, user_id: userId });
    await SyncService.refreshPendingCount();
    return row;
  }
}

export async function updateNote(
  id: string,
  input: Omit<NoteUpdate, "user_id" | "id">
): Promise<Note> {
  if (!isBrowserOnline() || id.startsWith("note_") || id.startsWith("local_")) {
    const row = await patchLocalNote(id, input);
    await SyncService.refreshPendingCount();
    return row;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notes")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    throwOnError(error);
    await cacheNotes([data]);
    return data;
  } catch {
    const row = await patchLocalNote(id, input);
    await SyncService.refreshPendingCount();
    return row;
  }
}

export async function deleteNote(id: string): Promise<void> {
  if (!isBrowserOnline() || id.startsWith("note_") || id.startsWith("local_")) {
    await deleteLocalNote(id);
    await SyncService.refreshPendingCount();
    return;
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.from("notes").delete().eq("id", id);
    throwOnError(error);
    await removeCachedNote(id);
  } catch {
    await deleteLocalNote(id);
    await SyncService.refreshPendingCount();
  }
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export async function fetchPortfolioProjects(): Promise<PortfolioProject[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("portfolio_projects")
    .select("*")
    .order("updated_at", { ascending: false });

  throwOnError(error);
  return data ?? [];
}

export async function createPortfolioProject(
  input: Omit<PortfolioInsert, "user_id" | "id">
): Promise<PortfolioProject> {
  const userId = await requireUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("portfolio_projects")
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  throwOnError(error);
  return data;
}

export async function updatePortfolioProject(
  id: string,
  input: Omit<PortfolioUpdate, "user_id" | "id">
): Promise<PortfolioProject> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("portfolio_projects")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  throwOnError(error);
  return data;
}

export async function deletePortfolioProject(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("portfolio_projects").delete().eq("id", id);
  throwOnError(error);
}

export async function fetchPortfolioViewEvents(options?: {
  days?: number;
  projectId?: string;
}): Promise<PortfolioViewEvent[]> {
  const supabase = createClient();
  const days = options?.days ?? 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  let query = supabase
    .from("portfolio_view_events")
    .select("*")
    .gte("viewed_at", since.toISOString())
    .order("viewed_at", { ascending: false });

  if (options?.projectId) {
    query = query.eq("portfolio_project_id", options.projectId);
  }

  const { data, error } = await query;
  throwOnError(error);
  return data ?? [];
}

export async function fetchLandingPageVisits(options?: {
  days?: number;
}): Promise<LandingPageVisit[]> {
  const supabase = createClient();
  const days = options?.days ?? 3650; // all-time by default for total count
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("landing_page_visits")
    .select("*")
    .gte("visited_at", since.toISOString())
    .order("visited_at", { ascending: false });

  if (error) {
    // Soft-fail until migration is applied
    console.warn("[landing_page_visits]", error.message);
    return [];
  }
  return data ?? [];
}

export async function recordPortfolioView(
  portfolioProjectId: string
): Promise<PortfolioViewEvent> {
  const userId = await requireUserId();
  const supabase = createClient();

  const { data: event, error: eventError } = await supabase
    .from("portfolio_view_events")
    .insert({
      user_id: userId,
      portfolio_project_id: portfolioProjectId,
      viewed_at: new Date().toISOString(),
    })
    .select()
    .single();

  throwOnError(eventError);

  const { data: project, error: fetchError } = await supabase
    .from("portfolio_projects")
    .select("views")
    .eq("id", portfolioProjectId)
    .single();

  throwOnError(fetchError);

  const { error: updateError } = await supabase
    .from("portfolio_projects")
    .update({ views: (project?.views ?? 0) + 1 })
    .eq("id", portfolioProjectId);

  throwOnError(updateError);
  return event;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function fetchNotifications(): Promise<Notification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  throwOnError(error);
  return data ?? [];
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .select()
    .single();

  throwOnError(error);
  return data;
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);

  throwOnError(error);
}

export async function createNotification(
  input: Omit<NotificationInsert, "user_id" | "id">
): Promise<Notification> {
  const userId = await requireUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  throwOnError(error);
  return data;
}

// ---------------------------------------------------------------------------
// AI conversations
// ---------------------------------------------------------------------------

export async function fetchAiConversations(): Promise<AiConversation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .order("created_at", { ascending: false });

  throwOnError(error);
  return data ?? [];
}

export async function createAiConversation(
  prompt: string,
  response: string
): Promise<AiConversation> {
  const userId = await requireUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: userId, prompt, response })
    .select()
    .single();

  throwOnError(error);
  return data;
}

export async function deleteAiConversation(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
  throwOnError(error);
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [projects, tasks, sessions, transactions, landingVisits, notifications] =
    await Promise.all([
      softFetch(fetchProjects, []),
      fetchTasks(),
      fetchPomodoroSessions(),
      fetchTransactions(),
      softFetch(() => fetchLandingPageVisits({ days: 3650 }), []),
      softFetch(fetchNotifications, []),
    ]);

  const completedTaskCount = tasks.filter((t) => t.completed).length;
  const focusSeconds = sessions
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + (s.duration || 0), 0);
  const portfolioViews = landingVisits.length;

  return {
    projectCount: projects.length,
    taskCount: tasks.length,
    completedTaskCount,
    productivity: productivityPercent(completedTaskCount, tasks.length),
    focusSeconds,
    income: sumIncome(transactions),
    expense: sumExpense(transactions),
    balance: balance(transactions),
    monthlyIncome: monthlyIncome(transactions),
    monthlyExpense: monthlyExpense(transactions),
    portfolioViews,
    unreadNotifications: notifications.filter((n) => !n.read).length,
    tasksByDay: groupTasksCompletedByDay(tasks, 7),
    focusByDay: groupFocusSecondsByDay(sessions, 7),
    cashflowByDay: groupCashflowByDay(transactions, 7),
    viewsByDay: groupLandingVisitsByDay(landingVisits, 7),
  };
}

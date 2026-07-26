"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  AiConversation,
  AuthActionResult,
  Database,
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
  monthlyExpense,
  monthlyIncome,
  productivityPercent,
  sumExpense,
  sumIncome,
} from "@/features/dashboard/lib/analytics";
import { formatHours, formatPhp } from "@/features/dashboard/lib/format";

type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];
type PortfolioInsert = Database["public"]["Tables"]["portfolio_projects"]["Insert"];
type PortfolioUpdate = Database["public"]["Tables"]["portfolio_projects"]["Update"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return { supabase, user: null as null, error: error.message };
  }
  if (!user) {
    return { supabase, user: null as null, error: "Not authenticated." };
  }
  return { supabase, user, error: null as null };
}

function fail(error: string): AuthActionResult<never> {
  return { success: false, error };
}

function ok<T>(data: T, message?: string): AuthActionResult<T> {
  return { success: true, data, message };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function fetchProjectsAction(): Promise<AuthActionResult<Project[]>> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return fail(error.message);
  return ok(data ?? []);
}

export async function createProjectAction(
  input: Omit<ProjectInsert, "user_id" | "id">
): Promise<AuthActionResult<Project>> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError || !user) return fail(authError ?? "Not authenticated.");

  const { data, error } = await supabase
    .from("projects")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) return fail(error.message);
  return ok(data);
}

export async function updateProjectAction(
  id: string,
  input: Omit<ProjectUpdate, "user_id" | "id">
): Promise<AuthActionResult<Project>> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { data, error } = await supabase
    .from("projects")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) return fail(error.message);
  return ok(data);
}

export async function deleteProjectAction(id: string): Promise<AuthActionResult> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return fail(error.message);
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function fetchTasksAction(
  projectId?: string
): Promise<AuthActionResult<Task[]>> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  let query = supabase.from("tasks").select("*").order("updated_at", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok(data ?? []);
}

export async function createTaskAction(
  input: Omit<TaskInsert, "user_id" | "id">
): Promise<AuthActionResult<Task>> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError || !user) return fail(authError ?? "Not authenticated.");

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) return fail(error.message);
  return ok(data);
}

export async function updateTaskAction(
  id: string,
  input: Omit<TaskUpdate, "user_id" | "id">
): Promise<AuthActionResult<Task>> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { data, error } = await supabase
    .from("tasks")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) return fail(error.message);
  return ok(data);
}

export async function deleteTaskAction(id: string): Promise<AuthActionResult> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return fail(error.message);
  return ok(undefined);
}

export async function toggleTaskCompleteAction(
  id: string,
  completed: boolean
): Promise<AuthActionResult<Task>> {
  return updateTaskAction(id, {
    completed,
    status: completed ? "done" : "todo",
  });
}

// ---------------------------------------------------------------------------
// Pomodoro
// ---------------------------------------------------------------------------

export async function fetchPomodoroSessionsAction(): Promise<
  AuthActionResult<PomodoroSession[]>
> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .select("*")
    .order("started_at", { ascending: false });

  if (error) return fail(error.message);
  return ok(data ?? []);
}

export async function startPomodoroSessionAction(
  durationSeconds = 0
): Promise<AuthActionResult<PomodoroSession>> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError || !user) return fail(authError ?? "Not authenticated.");

  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .insert({
      user_id: user.id,
      duration: durationSeconds,
      completed: false,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return fail(error.message);
  return ok(data);
}

export async function completePomodoroSessionAction(
  id: string,
  durationSeconds: number
): Promise<AuthActionResult<PomodoroSession>> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .update({
      duration: durationSeconds,
      completed: true,
      ended_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return fail(error.message);
  return ok(data);
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export async function fetchTransactionsAction(): Promise<AuthActionResult<Transaction[]>> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: false });

  if (error) return fail(error.message);
  return ok(data ?? []);
}

export async function createTransactionAction(
  input: Omit<TransactionInsert, "user_id" | "id">
): Promise<AuthActionResult<Transaction>> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError || !user) return fail(authError ?? "Not authenticated.");

  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) return fail(error.message);
  return ok(data);
}

export async function updateTransactionAction(
  id: string,
  input: Omit<TransactionUpdate, "user_id" | "id">
): Promise<AuthActionResult<Transaction>> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { data, error } = await supabase
    .from("transactions")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) return fail(error.message);
  return ok(data);
}

export async function deleteTransactionAction(id: string): Promise<AuthActionResult> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return fail(error.message);
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export async function fetchPortfolioProjectsAction(): Promise<
  AuthActionResult<PortfolioProject[]>
> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { data, error } = await supabase
    .from("portfolio_projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return fail(error.message);
  return ok(data ?? []);
}

export async function createPortfolioProjectAction(
  input: Omit<PortfolioInsert, "user_id" | "id">
): Promise<AuthActionResult<PortfolioProject>> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError || !user) return fail(authError ?? "Not authenticated.");

  const { data, error } = await supabase
    .from("portfolio_projects")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) return fail(error.message);
  return ok(data);
}

export async function updatePortfolioProjectAction(
  id: string,
  input: Omit<PortfolioUpdate, "user_id" | "id">
): Promise<AuthActionResult<PortfolioProject>> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { data, error } = await supabase
    .from("portfolio_projects")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) return fail(error.message);
  return ok(data);
}

export async function deletePortfolioProjectAction(id: string): Promise<AuthActionResult> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { error } = await supabase.from("portfolio_projects").delete().eq("id", id);
  if (error) return fail(error.message);
  return ok(undefined);
}

export async function fetchPortfolioViewEventsAction(options?: {
  days?: number;
  projectId?: string;
}): Promise<AuthActionResult<PortfolioViewEvent[]>> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

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
  if (error) return fail(error.message);
  return ok(data ?? []);
}

export async function recordPortfolioViewAction(
  portfolioProjectId: string
): Promise<AuthActionResult<PortfolioViewEvent>> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError || !user) return fail(authError ?? "Not authenticated.");

  const { data: event, error: eventError } = await supabase
    .from("portfolio_view_events")
    .insert({
      user_id: user.id,
      portfolio_project_id: portfolioProjectId,
      viewed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (eventError) return fail(eventError.message);

  const { data: project, error: fetchError } = await supabase
    .from("portfolio_projects")
    .select("views")
    .eq("id", portfolioProjectId)
    .single();

  if (fetchError) return fail(fetchError.message);

  const { error: updateError } = await supabase
    .from("portfolio_projects")
    .update({ views: (project?.views ?? 0) + 1 })
    .eq("id", portfolioProjectId);

  if (updateError) return fail(updateError.message);
  return ok(event);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function fetchNotificationsAction(): Promise<AuthActionResult<Notification[]>> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return fail(error.message);
  return ok(data ?? []);
}

export async function markNotificationReadAction(
  id: string
): Promise<AuthActionResult<Notification>> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .select()
    .single();

  if (error) return fail(error.message);
  return ok(data);
}

export async function markAllNotificationsReadAction(): Promise<AuthActionResult> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);

  if (error) return fail(error.message);
  return ok(undefined);
}

export async function createNotificationAction(
  input: Omit<NotificationInsert, "user_id" | "id">
): Promise<AuthActionResult<Notification>> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError || !user) return fail(authError ?? "Not authenticated.");

  const { data, error } = await supabase
    .from("notifications")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) return fail(error.message);
  return ok(data);
}

// ---------------------------------------------------------------------------
// AI conversations
// ---------------------------------------------------------------------------

export async function fetchAiConversationsAction(): Promise<
  AuthActionResult<AiConversation[]>
> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return fail(error.message);
  return ok(data ?? []);
}

export async function createAiConversationAction(
  prompt: string,
  response: string
): Promise<AuthActionResult<AiConversation>> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError || !user) return fail(authError ?? "Not authenticated.");

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: user.id, prompt, response })
    .select()
    .single();

  if (error) return fail(error.message);
  return ok(data);
}

export async function deleteAiConversationAction(id: string): Promise<AuthActionResult> {
  const { supabase, error: authError } = await requireUser();
  if (authError) return fail(authError);

  const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
  if (error) return fail(error.message);
  return ok(undefined);
}

function buildInsightFromStats(input: {
  prompt: string;
  taskCount: number;
  completedTaskCount: number;
  focusSeconds: number;
  sessionCount: number;
  income: number;
  expense: number;
  monthlyIncome: number;
  monthlyExpense: number;
  projectCount: number;
}): string {
  const {
    prompt,
    taskCount,
    completedTaskCount,
    focusSeconds,
    sessionCount,
    income,
    expense,
    monthlyIncome: monthIn,
    monthlyExpense: monthOut,
    projectCount,
  } = input;

  const hasAnyData =
    taskCount > 0 || sessionCount > 0 || income > 0 || expense > 0 || projectCount > 0;

  if (!hasAnyData) {
    return [
      `You asked: "${prompt.trim()}"`,
      "",
      "There is not enough dashboard data yet to generate a meaningful insight.",
      "Add projects, complete tasks, log focus sessions, or record transactions — then ask again.",
    ].join("\n");
  }

  const productivity = productivityPercent(completedTaskCount, taskCount);
  const net = balance([
    { type: "income" as const, amount: income },
    { type: "expense" as const, amount: expense },
  ]);
  const lines: string[] = [
    `Insight based on your current data (prompt: "${prompt.trim()}"):`,
    "",
  ];

  if (projectCount > 0 || taskCount > 0) {
    lines.push(
      `Projects: ${projectCount}. Tasks: ${completedTaskCount}/${taskCount} completed (${productivity}% productivity).`
    );
  }

  if (sessionCount > 0) {
    lines.push(
      `Focus: ${sessionCount} completed pomodoro session(s) totaling ${formatHours(focusSeconds)}.`
    );
  } else {
    lines.push("Focus: no completed pomodoro sessions recorded yet.");
  }

  if (income > 0 || expense > 0) {
    lines.push(
      `Cashflow (all time): income ${formatPhp(income)}, expenses ${formatPhp(expense)}, net ${formatPhp(net)}.`
    );
    lines.push(
      `This month: income ${formatPhp(monthIn)}, expenses ${formatPhp(monthOut)}, net ${formatPhp(monthIn - monthOut)}.`
    );
  }

  if (taskCount > 0 && productivity < 50) {
    lines.push(
      "Suggestion: your completion rate is under 50% — prioritize high-priority open tasks or reduce WIP."
    );
  } else if (taskCount > 0 && productivity >= 80) {
    lines.push("Suggestion: strong completion rate — keep batching similar tasks to protect focus time.");
  }

  if (sessionCount === 0 && taskCount > 0) {
    lines.push("Suggestion: you have tasks but no focus sessions — try a short pomodoro on your top priority.");
  }

  if (expense > income && (income > 0 || expense > 0)) {
    lines.push("Suggestion: expenses exceed income in the recorded data — review recent expense categories.");
  }

  return lines.join("\n");
}

export async function generateAiInsightAction(
  prompt: string
): Promise<AuthActionResult<AiConversation>> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return fail("Prompt is required.");
  }

  const { supabase, user, error: authError } = await requireUser();
  if (authError || !user) return fail(authError ?? "Not authenticated.");

  const [tasksRes, sessionsRes, txRes, projectsRes] = await Promise.all([
    supabase.from("tasks").select("id, completed"),
    supabase.from("pomodoro_sessions").select("id, duration, completed"),
    supabase.from("transactions").select("type, amount, transaction_date"),
    supabase.from("projects").select("id"),
  ]);

  if (tasksRes.error) return fail(tasksRes.error.message);
  if (sessionsRes.error) return fail(sessionsRes.error.message);
  if (txRes.error) return fail(txRes.error.message);
  if (projectsRes.error) return fail(projectsRes.error.message);

  const tasks = tasksRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  const transactions = (txRes.data ?? []).map((t) => ({
    type: t.type,
    amount: Number(t.amount),
    transaction_date: t.transaction_date,
  }));
  const completedSessions = sessions.filter((s) => s.completed);

  const response = buildInsightFromStats({
    prompt: trimmed,
    taskCount: tasks.length,
    completedTaskCount: tasks.filter((t) => t.completed).length,
    focusSeconds: completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0),
    sessionCount: completedSessions.length,
    income: sumIncome(transactions),
    expense: sumExpense(transactions),
    monthlyIncome: monthlyIncome(transactions),
    monthlyExpense: monthlyExpense(transactions),
    projectCount: (projectsRes.data ?? []).length,
  });

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: user.id, prompt: trimmed, response })
    .select()
    .single();

  if (error) return fail(error.message);
  return ok(data);
}

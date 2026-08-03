"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
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
import { dashboardKeys } from "@/features/dashboard/query-keys";
import {
  completePomodoroSession,
  createAiConversation,
  createNote,
  createNotification,
  createPortfolioProject,
  createProject,
  createTask,
  createTransaction,
  deleteAiConversation,
  deleteNote,
  deletePortfolioProject,
  deleteProject,
  deleteTask,
  deleteTransaction,
  fetchAiConversations,
  fetchDashboardStats,
  fetchLandingPageVisits,
  fetchNotes,
  fetchNotifications,
  fetchPomodoroSessions,
  fetchPortfolioProjects,
  fetchPortfolioViewEvents,
  fetchProjects,
  fetchTasks,
  fetchTransactions,
  markAllNotificationsRead,
  markNotificationRead,
  recordPortfolioView,
  startPomodoroSession,
  toggleTaskComplete,
  updateNote,
  updatePortfolioProject,
  updateProject,
  updateTask,
  updateTransaction,
  type DashboardStats,
} from "@/features/dashboard/services/dashboard.service";

type ProjectInsert = Omit<Database["public"]["Tables"]["projects"]["Insert"], "user_id" | "id">;
type ProjectUpdate = Omit<Database["public"]["Tables"]["projects"]["Update"], "user_id" | "id">;
type TaskInsert = Omit<Database["public"]["Tables"]["tasks"]["Insert"], "user_id" | "id">;
type TaskUpdate = Omit<Database["public"]["Tables"]["tasks"]["Update"], "user_id" | "id">;
type TransactionInsert = Omit<
  Database["public"]["Tables"]["transactions"]["Insert"],
  "user_id" | "id"
>;
type TransactionUpdate = Omit<
  Database["public"]["Tables"]["transactions"]["Update"],
  "user_id" | "id"
>;
type NoteInsert = Omit<Database["public"]["Tables"]["notes"]["Insert"], "user_id" | "id">;
type NoteUpdate = Omit<Database["public"]["Tables"]["notes"]["Update"], "user_id" | "id">;
type PortfolioInsert = Omit<
  Database["public"]["Tables"]["portfolio_projects"]["Insert"],
  "user_id" | "id"
>;
type PortfolioUpdate = Omit<
  Database["public"]["Tables"]["portfolio_projects"]["Update"],
  "user_id" | "id"
>;
type NotificationInsert = Omit<
  Database["public"]["Tables"]["notifications"]["Insert"],
  "user_id" | "id"
>;

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

type MutationCallbacks<TData, TVariables> = {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
};

function invalidateStats(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useProjects(options?: QueryOpts<Project[]>) {
  return useQuery({
    queryKey: dashboardKeys.projects.list(),
    queryFn: fetchProjects,
    ...options,
  });
}

export function useTasks(
  filters?: { projectId?: string },
  options?: QueryOpts<Task[]>
) {
  return useQuery({
    queryKey: dashboardKeys.tasks.list(filters),
    queryFn: () => fetchTasks(filters?.projectId),
    ...options,
  });
}

export function usePomodoroSessions(options?: QueryOpts<PomodoroSession[]>) {
  return useQuery({
    queryKey: dashboardKeys.pomodoro.list(),
    queryFn: fetchPomodoroSessions,
    ...options,
  });
}

export function useTransactions(options?: QueryOpts<Transaction[]>) {
  return useQuery({
    queryKey: dashboardKeys.transactions.list(),
    queryFn: fetchTransactions,
    ...options,
  });
}

export function useNotes(
  filters?: { taskId?: string; dueDate?: string },
  options?: QueryOpts<Note[]>
) {
  return useQuery({
    queryKey: dashboardKeys.notes.list(filters),
    queryFn: () => fetchNotes(filters),
    ...options,
  });
}

export function usePortfolioProjects(options?: QueryOpts<PortfolioProject[]>) {
  return useQuery({
    queryKey: dashboardKeys.portfolio.list(),
    queryFn: fetchPortfolioProjects,
    ...options,
  });
}

export function usePortfolioViewEvents(
  filters?: { days?: number; projectId?: string },
  options?: QueryOpts<PortfolioViewEvent[]>
) {
  return useQuery({
    queryKey: dashboardKeys.portfolio.views(filters),
    queryFn: () => fetchPortfolioViewEvents(filters),
    ...options,
  });
}

export function useLandingPageVisits(
  filters?: { days?: number },
  options?: QueryOpts<LandingPageVisit[]>
) {
  return useQuery({
    queryKey: dashboardKeys.portfolio.landingVisits(filters),
    queryFn: () => fetchLandingPageVisits(filters),
    ...options,
  });
}

export function useNotifications(options?: QueryOpts<Notification[]>) {
  return useQuery({
    queryKey: dashboardKeys.notifications.list(),
    queryFn: fetchNotifications,
    ...options,
  });
}

export function useAiConversations(options?: QueryOpts<AiConversation[]>) {
  return useQuery({
    queryKey: dashboardKeys.ai.list(),
    queryFn: fetchAiConversations,
    ...options,
  });
}

export function useDashboardStats(options?: QueryOpts<DashboardStats>) {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: fetchDashboardStats,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Project mutations
// ---------------------------------------------------------------------------

export function useCreateProject(callbacks?: MutationCallbacks<Project, ProjectInsert>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.projects.all() });
      invalidateStats(queryClient);
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useUpdateProject(
  callbacks?: MutationCallbacks<Project, { id: string; input: ProjectUpdate }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProjectUpdate }) =>
      updateProject(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.projects.list() });
      const previous = queryClient.getQueryData<Project[]>(dashboardKeys.projects.list());
      queryClient.setQueryData<Project[]>(dashboardKeys.projects.list(), (old) =>
        old?.map((p) => (p.id === id ? { ...p, ...input } : p))
      );
      return { previous };
    },
    onError: (error, variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(dashboardKeys.projects.list(), ctx.previous);
      }
      callbacks?.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.projects.all() });
      invalidateStats(queryClient);
    },
  });
}

export function useDeleteProject(callbacks?: MutationCallbacks<void, string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProject,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.projects.list() });
      const previous = queryClient.getQueryData<Project[]>(dashboardKeys.projects.list());
      queryClient.setQueryData<Project[]>(dashboardKeys.projects.list(), (old) =>
        old?.filter((p) => p.id !== id)
      );
      return { previous };
    },
    onError: (error, variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(dashboardKeys.projects.list(), ctx.previous);
      }
      callbacks?.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.projects.all() });
      invalidateStats(queryClient);
    },
  });
}

// ---------------------------------------------------------------------------
// Task mutations
// ---------------------------------------------------------------------------

export function useCreateTask(callbacks?: MutationCallbacks<Task, TaskInsert>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.tasks.all() });
      invalidateStats(queryClient);
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useUpdateTask(
  callbacks?: MutationCallbacks<Task, { id: string; input: TaskUpdate }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaskUpdate }) => updateTask(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.tasks.all() });
      const snapshots = queryClient.getQueriesData<Task[]>({
        queryKey: dashboardKeys.tasks.all(),
      });
      queryClient.setQueriesData<Task[]>({ queryKey: dashboardKeys.tasks.all() }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...input } : t))
      );
      return { snapshots };
    },
    onError: (error, variables, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      callbacks?.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.tasks.all() });
      invalidateStats(queryClient);
    },
  });
}

export function useDeleteTask(callbacks?: MutationCallbacks<void, string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.tasks.all() });
      const snapshots = queryClient.getQueriesData<Task[]>({
        queryKey: dashboardKeys.tasks.all(),
      });
      queryClient.setQueriesData<Task[]>({ queryKey: dashboardKeys.tasks.all() }, (old) =>
        old?.filter((t) => t.id !== id)
      );
      return { snapshots };
    },
    onError: (error, variables, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      callbacks?.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.tasks.all() });
      invalidateStats(queryClient);
    },
  });
}

export function useToggleTaskComplete(
  callbacks?: MutationCallbacks<Task, { id: string; completed: boolean }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      toggleTaskComplete(id, completed),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.tasks.all() });
      const snapshots = queryClient.getQueriesData<Task[]>({
        queryKey: dashboardKeys.tasks.all(),
      });
      queryClient.setQueriesData<Task[]>({ queryKey: dashboardKeys.tasks.all() }, (old) =>
        old?.map((t) =>
          t.id === id ? { ...t, completed, status: completed ? "done" : "todo" } : t
        )
      );
      return { snapshots };
    },
    onError: (error, variables, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      callbacks?.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.tasks.all() });
      invalidateStats(queryClient);
    },
  });
}

// ---------------------------------------------------------------------------
// Pomodoro mutations
// ---------------------------------------------------------------------------

export function useStartPomodoroSession(
  callbacks?: MutationCallbacks<PomodoroSession, number | undefined>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (durationSeconds: number | undefined = 0) =>
      startPomodoroSession(durationSeconds ?? 0),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.pomodoro.all() });
      invalidateStats(queryClient);
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useCompletePomodoroSession(
  callbacks?: MutationCallbacks<PomodoroSession, { id: string; durationSeconds: number }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, durationSeconds }: { id: string; durationSeconds: number }) =>
      completePomodoroSession(id, durationSeconds),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.pomodoro.all() });
      invalidateStats(queryClient);
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

// ---------------------------------------------------------------------------
// Transaction mutations
// ---------------------------------------------------------------------------

export function useCreateTransaction(
  callbacks?: MutationCallbacks<Transaction, TransactionInsert>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.transactions.all() });
      invalidateStats(queryClient);
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useUpdateTransaction(
  callbacks?: MutationCallbacks<Transaction, { id: string; input: TransactionUpdate }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransactionUpdate }) =>
      updateTransaction(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.transactions.list() });
      const previous = queryClient.getQueryData<Transaction[]>(
        dashboardKeys.transactions.list()
      );
      queryClient.setQueryData<Transaction[]>(dashboardKeys.transactions.list(), (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...input } : t))
      );
      return { previous };
    },
    onError: (error, variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(dashboardKeys.transactions.list(), ctx.previous);
      }
      callbacks?.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.transactions.all() });
      invalidateStats(queryClient);
    },
  });
}

export function useDeleteTransaction(callbacks?: MutationCallbacks<void, string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTransaction,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.transactions.list() });
      const previous = queryClient.getQueryData<Transaction[]>(
        dashboardKeys.transactions.list()
      );
      queryClient.setQueryData<Transaction[]>(dashboardKeys.transactions.list(), (old) =>
        old?.filter((t) => t.id !== id)
      );
      return { previous };
    },
    onError: (error, variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(dashboardKeys.transactions.list(), ctx.previous);
      }
      callbacks?.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.transactions.all() });
      invalidateStats(queryClient);
    },
  });
}

// ---------------------------------------------------------------------------
// Note mutations
// ---------------------------------------------------------------------------

export function useCreateNote(callbacks?: MutationCallbacks<Note, NoteInsert>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNote,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.notes.all() });
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useUpdateNote(
  callbacks?: MutationCallbacks<Note, { id: string; input: NoteUpdate }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: NoteUpdate }) => updateNote(id, input),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.notes.all() });
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useDeleteNote(callbacks?: MutationCallbacks<void, string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteNote,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.notes.all() });
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

// ---------------------------------------------------------------------------
// Portfolio mutations
// ---------------------------------------------------------------------------

export function useCreatePortfolioProject(
  callbacks?: MutationCallbacks<PortfolioProject, PortfolioInsert>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPortfolioProject,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.portfolio.all() });
      invalidateStats(queryClient);
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useUpdatePortfolioProject(
  callbacks?: MutationCallbacks<PortfolioProject, { id: string; input: PortfolioUpdate }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PortfolioUpdate }) =>
      updatePortfolioProject(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.portfolio.list() });
      const previous = queryClient.getQueryData<PortfolioProject[]>(
        dashboardKeys.portfolio.list()
      );
      queryClient.setQueryData<PortfolioProject[]>(dashboardKeys.portfolio.list(), (old) =>
        old?.map((p) => (p.id === id ? { ...p, ...input } : p))
      );
      return { previous };
    },
    onError: (error, variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(dashboardKeys.portfolio.list(), ctx.previous);
      }
      callbacks?.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.portfolio.all() });
      invalidateStats(queryClient);
    },
  });
}

export function useDeletePortfolioProject(callbacks?: MutationCallbacks<void, string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePortfolioProject,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.portfolio.list() });
      const previous = queryClient.getQueryData<PortfolioProject[]>(
        dashboardKeys.portfolio.list()
      );
      queryClient.setQueryData<PortfolioProject[]>(dashboardKeys.portfolio.list(), (old) =>
        old?.filter((p) => p.id !== id)
      );
      return { previous };
    },
    onError: (error, variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(dashboardKeys.portfolio.list(), ctx.previous);
      }
      callbacks?.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.portfolio.all() });
      invalidateStats(queryClient);
    },
  });
}

export function useRecordPortfolioView(callbacks?: MutationCallbacks<PortfolioViewEvent, string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordPortfolioView,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.portfolio.all() });
      invalidateStats(queryClient);
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

// ---------------------------------------------------------------------------
// Notification mutations
// ---------------------------------------------------------------------------

export function useCreateNotification(
  callbacks?: MutationCallbacks<Notification, NotificationInsert>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNotification,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.notifications.all() });
      invalidateStats(queryClient);
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useMarkNotificationRead(callbacks?: MutationCallbacks<Notification, string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.notifications.list() });
      const previous = queryClient.getQueryData<Notification[]>(
        dashboardKeys.notifications.list()
      );
      queryClient.setQueryData<Notification[]>(dashboardKeys.notifications.list(), (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      return { previous };
    },
    onError: (error, variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(dashboardKeys.notifications.list(), ctx.previous);
      }
      callbacks?.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.notifications.all() });
      invalidateStats(queryClient);
    },
  });
}

export function useMarkAllNotificationsRead(callbacks?: MutationCallbacks<void, void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.notifications.list() });
      const previous = queryClient.getQueryData<Notification[]>(
        dashboardKeys.notifications.list()
      );
      queryClient.setQueryData<Notification[]>(dashboardKeys.notifications.list(), (old) =>
        old?.map((n) => ({ ...n, read: true }))
      );
      return { previous };
    },
    onError: (error, variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(dashboardKeys.notifications.list(), ctx.previous);
      }
      callbacks?.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.notifications.all() });
      invalidateStats(queryClient);
    },
  });
}

// ---------------------------------------------------------------------------
// AI mutations
// ---------------------------------------------------------------------------

export function useCreateAiConversation(
  callbacks?: MutationCallbacks<AiConversation, { prompt: string; response: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ prompt, response }: { prompt: string; response: string }) =>
      createAiConversation(prompt, response),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.ai.all() });
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useDeleteAiConversation(callbacks?: MutationCallbacks<void, string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAiConversation,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.ai.list() });
      const previous = queryClient.getQueryData<AiConversation[]>(dashboardKeys.ai.list());
      queryClient.setQueryData<AiConversation[]>(dashboardKeys.ai.list(), (old) =>
        old?.filter((c) => c.id !== id)
      );
      return { previous };
    },
    onError: (error, variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(dashboardKeys.ai.list(), ctx.previous);
      }
      callbacks?.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      callbacks?.onSuccess?.(data, variables);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.ai.all() });
    },
  });
}

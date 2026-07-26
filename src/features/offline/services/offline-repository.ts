import { offlineDb } from "@/features/offline/db/axion-db";
import {
  createOfflineId,
  createOfflineMeta,
  enqueueSync,
  isBrowserOnline,
  nowIso,
} from "@/features/offline/lib/offline-utils";
import type {
  OfflinePomodoroSession,
  OfflineTask,
  OfflineTransaction,
} from "@/features/offline/types";
import type { PomodoroSession, Task, Transaction } from "@/features/auth/types/database.types";

function stripOfflineMeta<T extends { _offline?: unknown }>(row: T): Omit<T, "_offline"> {
  const { _offline: _ignored, ...rest } = row;
  return rest;
}

function toOfflineTask(task: Task, dirty = false): OfflineTask {
  return {
    ...task,
    _offline: createOfflineMeta({
      dirty,
      deleted: false,
      updatedAt: task.updated_at,
      syncedAt: dirty ? null : nowIso(),
    }),
  };
}

function toOfflineTransaction(tx: Transaction, dirty = false): OfflineTransaction {
  return {
    ...tx,
    _offline: createOfflineMeta({
      dirty,
      deleted: false,
      updatedAt: tx.created_at,
      syncedAt: dirty ? null : nowIso(),
    }),
  };
}

function toOfflineSession(session: PomodoroSession, dirty = false): OfflinePomodoroSession {
  return {
    ...session,
    _offline: createOfflineMeta({
      dirty,
      deleted: false,
      updatedAt: session.ended_at ?? session.started_at,
      syncedAt: dirty ? null : nowIso(),
    }),
  };
}

export async function cacheTasks(tasks: Task[]): Promise<void> {
  for (const task of tasks) {
    const existing = await offlineDb.tasks.get(task.id);
    if (existing?._offline.dirty || existing?._offline.deleted) {
      // Keep local pending changes; sync queue will reconcile
      if (
        existing.updated_at &&
        task.updated_at &&
        existing.updated_at > task.updated_at
      ) {
        continue;
      }
      if (existing._offline.dirty || existing._offline.deleted) continue;
    }
    await offlineDb.tasks.put(toOfflineTask(task, false));
  }
}

export async function cacheTransactions(rows: Transaction[]): Promise<void> {
  for (const tx of rows) {
    const existing = await offlineDb.transactions.get(tx.id);
    if (existing?._offline.dirty || existing?._offline.deleted) continue;
    await offlineDb.transactions.put(toOfflineTransaction(tx, false));
  }
}

export async function cachePomodoroSessions(rows: PomodoroSession[]): Promise<void> {
  for (const session of rows) {
    const existing = await offlineDb.pomodoro_sessions.get(session.id);
    if (existing?._offline.dirty || existing?._offline.deleted) continue;
    await offlineDb.pomodoro_sessions.put(toOfflineSession(session, false));
  }
}

export async function readCachedTasks(projectId?: string): Promise<Task[]> {
  const all = await offlineDb.tasks
    .filter((t) => !t._offline.deleted)
    .toArray();
  const filtered = projectId
    ? all.filter((t) => t.project_id === projectId)
    : all;
  return filtered
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((row) => stripOfflineMeta(row) as Task);
}

export async function readCachedTransactions(): Promise<Transaction[]> {
  const all = await offlineDb.transactions
    .filter((t) => !t._offline.deleted)
    .toArray();
  return all
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    .map((row) => stripOfflineMeta(row) as Transaction);
}

export async function readCachedPomodoroSessions(): Promise<PomodoroSession[]> {
  const all = await offlineDb.pomodoro_sessions
    .filter((t) => !t._offline.deleted)
    .toArray();
  return all
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .map((row) => stripOfflineMeta(row) as PomodoroSession);
}

export async function upsertLocalTask(
  input: {
    id?: string;
    user_id: string;
    project_id?: string | null;
    title: string;
    description?: string | null;
    priority?: string;
    status?: string;
    due_date?: string | null;
    completed?: boolean;
  }
): Promise<Task> {
  const stamp = nowIso();
  const id = input.id ?? createOfflineId("task");
  const existing = await offlineDb.tasks.get(id);
  const row: OfflineTask = {
    id,
    user_id: input.user_id,
    project_id: input.project_id ?? null,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority ?? "medium",
    status: input.status ?? "todo",
    due_date: input.due_date ?? null,
    completed: input.completed ?? false,
    created_at: existing?.created_at ?? stamp,
    updated_at: stamp,
    _offline: createOfflineMeta({ dirty: true, deleted: false, updatedAt: stamp }),
  };
  await offlineDb.tasks.put(row);
  await enqueueSync({
    entity: "tasks",
    operation: existing ? "UPDATE" : "CREATE",
    recordId: id,
    payload: stripOfflineMeta(row) as unknown as Record<string, unknown>,
  });
  return stripOfflineMeta(row) as Task;
}

export async function patchLocalTask(
  id: string,
  patch: Partial<Omit<Task, "id" | "user_id">>
): Promise<Task> {
  const existing = await offlineDb.tasks.get(id);
  if (!existing || existing._offline.deleted) {
    throw new Error("Task not found in offline storage.");
  }
  const stamp = nowIso();
  const next: OfflineTask = {
    ...existing,
    ...patch,
    updated_at: stamp,
    _offline: createOfflineMeta({ dirty: true, deleted: false, updatedAt: stamp }),
  };
  await offlineDb.tasks.put(next);
  await enqueueSync({
    entity: "tasks",
    operation: "UPDATE",
    recordId: id,
    payload: stripOfflineMeta(next) as unknown as Record<string, unknown>,
  });
  return stripOfflineMeta(next) as Task;
}

export async function removeCachedTask(id: string): Promise<void> {
  await offlineDb.tasks.delete(id);
}

export async function removeCachedTransaction(id: string): Promise<void> {
  await offlineDb.transactions.delete(id);
}

export async function removeCachedPomodoroSession(id: string): Promise<void> {
  await offlineDb.pomodoro_sessions.delete(id);
}

export async function deleteLocalTask(id: string): Promise<void> {
  const existing = await offlineDb.tasks.get(id);
  if (!existing) return;
  if (id.startsWith("task_") || id.startsWith("local_")) {
    await offlineDb.tasks.delete(id);
  } else {
    await offlineDb.tasks.put({
      ...existing,
      _offline: createOfflineMeta({
        dirty: true,
        deleted: true,
        updatedAt: nowIso(),
      }),
    });
  }
  await enqueueSync({
    entity: "tasks",
    operation: "DELETE",
    recordId: id,
    payload: null,
  });
}

export async function upsertLocalTransaction(
  input: Omit<Transaction, "id" | "created_at"> & { id?: string; created_at?: string }
): Promise<Transaction> {
  const stamp = nowIso();
  const id = input.id ?? createOfflineId("txn");
  const existing = await offlineDb.transactions.get(id);
  const row: OfflineTransaction = {
    id,
    user_id: input.user_id,
    type: input.type,
    amount: input.amount,
    category: input.category ?? null,
    description: input.description ?? null,
    transaction_date: input.transaction_date,
    created_at: existing?.created_at ?? input.created_at ?? stamp,
    _offline: createOfflineMeta({ dirty: true, deleted: false, updatedAt: stamp }),
  };
  await offlineDb.transactions.put(row);
  await enqueueSync({
    entity: "transactions",
    operation: existing ? "UPDATE" : "CREATE",
    recordId: id,
    payload: stripOfflineMeta(row) as unknown as Record<string, unknown>,
  });
  return stripOfflineMeta(row) as Transaction;
}

export async function deleteLocalTransaction(id: string): Promise<void> {
  const existing = await offlineDb.transactions.get(id);
  if (!existing) return;
  if (id.startsWith("txn_") || id.startsWith("local_")) {
    await offlineDb.transactions.delete(id);
  } else {
    await offlineDb.transactions.put({
      ...existing,
      _offline: createOfflineMeta({
        dirty: true,
        deleted: true,
        updatedAt: nowIso(),
      }),
    });
  }
  await enqueueSync({
    entity: "transactions",
    operation: "DELETE",
    recordId: id,
    payload: null,
  });
}

export async function upsertLocalPomodoroSession(
  input: Omit<PomodoroSession, "id"> & { id?: string }
): Promise<PomodoroSession> {
  const stamp = nowIso();
  const id = input.id ?? createOfflineId("focus");
  const existing = await offlineDb.pomodoro_sessions.get(id);
  const row: OfflinePomodoroSession = {
    id,
    user_id: input.user_id,
    duration: input.duration,
    completed: input.completed,
    started_at: input.started_at,
    ended_at: input.ended_at ?? null,
    _offline: createOfflineMeta({ dirty: true, deleted: false, updatedAt: stamp }),
  };
  await offlineDb.pomodoro_sessions.put(row);
  await enqueueSync({
    entity: "pomodoro_sessions",
    operation: existing ? "UPDATE" : "CREATE",
    recordId: id,
    payload: stripOfflineMeta(row) as unknown as Record<string, unknown>,
  });
  return stripOfflineMeta(row) as PomodoroSession;
}

export { isBrowserOnline };

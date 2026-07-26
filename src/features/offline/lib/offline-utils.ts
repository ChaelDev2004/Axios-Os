import { offlineDb } from "@/features/offline/db/axion-db";
import type {
  OfflineMeta,
  SyncEntity,
  SyncOperation,
  SyncQueueItem,
} from "@/features/offline/types";
import { useConnectivityStore } from "@/features/offline/stores/connectivity.store";

export function nowIso(): string {
  return new Date().toISOString();
}

export function createOfflineId(prefix = "local"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createOfflineMeta(partial?: Partial<OfflineMeta>): OfflineMeta {
  const stamp = nowIso();
  return {
    dirty: partial?.dirty ?? true,
    deleted: partial?.deleted ?? false,
    updatedAt: partial?.updatedAt ?? stamp,
    syncedAt: partial?.syncedAt ?? null,
  };
}

/**
 * Prefer the connectivity store (kept accurate by Capacitor Network on native).
 * Falls back to navigator.onLine for the first tick before OfflineProvider runs.
 */
export function isBrowserOnline(): boolean {
  if (typeof window === "undefined") return true;
  return useConnectivityStore.getState().online;
}

export async function enqueueSync(item: {
  entity: SyncEntity;
  operation: SyncOperation;
  recordId: string;
  payload?: Record<string, unknown> | null;
}): Promise<void> {
  await offlineDb.sync_queue.add({
    entity: item.entity,
    operation: item.operation,
    recordId: item.recordId,
    payload: item.payload ?? null,
    createdAt: nowIso(),
    attempts: 0,
    lastError: null,
  });
}

export async function getPendingSyncCount(): Promise<number> {
  return offlineDb.sync_queue.count();
}

export async function listSyncQueue(): Promise<SyncQueueItem[]> {
  return offlineDb.sync_queue.orderBy("createdAt").toArray();
}

export async function clearSyncQueue(): Promise<void> {
  await offlineDb.sync_queue.clear();
}

export async function estimateOfflineStorage(): Promise<{
  usedBytes: number;
  quotaBytes: number | null;
  taskCount: number;
  transactionCount: number;
  sessionCount: number;
  queueCount: number;
}> {
  const [taskCount, transactionCount, sessionCount, queueCount] = await Promise.all([
    offlineDb.tasks.count(),
    offlineDb.transactions.count(),
    offlineDb.pomodoro_sessions.count(),
    offlineDb.sync_queue.count(),
  ]);

  let usedBytes = 0;
  let quotaBytes: number | null = null;
  if (typeof navigator !== "undefined" && "storage" in navigator && navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    usedBytes = estimate.usage ?? 0;
    quotaBytes = estimate.quota ?? null;
  }

  return {
    usedBytes,
    quotaBytes,
    taskCount,
    transactionCount,
    sessionCount,
    queueCount,
  };
}

export async function clearOfflineCache(): Promise<void> {
  await Promise.all([
    offlineDb.tasks.clear(),
    offlineDb.transactions.clear(),
    offlineDb.pomodoro_sessions.clear(),
    offlineDb.sync_queue.clear(),
  ]);
}

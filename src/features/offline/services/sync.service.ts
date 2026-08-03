"use client";

import { createClient } from "@/lib/supabase/client";
import { offlineDb } from "@/features/offline/db/axion-db";
import {
  getPendingSyncCount,
  isBrowserOnline,
  listSyncQueue,
  nowIso,
} from "@/features/offline/lib/offline-utils";
import {
  cacheNotes,
  cachePomodoroSessions,
  cacheTasks,
  cacheTransactions,
} from "@/features/offline/services/offline-repository";
import { useConnectivityStore } from "@/features/offline/stores/connectivity.store";
import type { SyncQueueItem } from "@/features/offline/types";
import type { Note, PomodoroSession, Task, Transaction } from "@/features/auth/types/database.types";

type SyncResult = {
  processed: number;
  failed: number;
  remaining: number;
};

async function applyQueueItem(item: SyncQueueItem): Promise<void> {
  const supabase = createClient();
  const { entity, operation, recordId, payload } = item;

  if (entity === "tasks") {
    if (operation === "DELETE") {
      const { error } = await supabase.from("tasks").delete().eq("id", recordId);
      if (error) throw new Error(error.message);
      await offlineDb.tasks.delete(recordId);
      return;
    }
    if (!payload) throw new Error("Missing task payload");
    const row = payload as unknown as Task;
    if (operation === "CREATE") {
      // Local ids must be replaced with server ids
      const { id: _localId, ...insert } = row;
      const { data, error } = await supabase
        .from("tasks")
        .insert(insert)
        .select()
        .single();
      if (error) throw new Error(error.message);
      await offlineDb.tasks.delete(recordId);
      if (data) {
        await offlineDb.tasks.put({
          ...data,
          _offline: {
            dirty: false,
            deleted: false,
            updatedAt: data.updated_at,
            syncedAt: nowIso(),
          },
        });
      }
      return;
    }
    const { id: _id, user_id: _userId, ...update } = row;
    const { data, error } = await supabase
      .from("tasks")
      .update(update)
      .eq("id", recordId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (data) {
      await offlineDb.tasks.put({
        ...data,
        _offline: {
          dirty: false,
          deleted: false,
          updatedAt: data.updated_at,
          syncedAt: nowIso(),
        },
      });
    }
    return;
  }

  if (entity === "transactions") {
    if (operation === "DELETE") {
      const { error } = await supabase.from("transactions").delete().eq("id", recordId);
      if (error) throw new Error(error.message);
      await offlineDb.transactions.delete(recordId);
      return;
    }
    if (!payload) throw new Error("Missing transaction payload");
    const row = payload as unknown as Transaction;
    if (operation === "CREATE") {
      const { id: _localId, ...insert } = row;
      const { data, error } = await supabase
        .from("transactions")
        .insert(insert)
        .select()
        .single();
      if (error) throw new Error(error.message);
      await offlineDb.transactions.delete(recordId);
      if (data) {
        await offlineDb.transactions.put({
          ...data,
          _offline: {
            dirty: false,
            deleted: false,
            updatedAt: data.created_at,
            syncedAt: nowIso(),
          },
        });
      }
      return;
    }
    const { id: _id, user_id: _userId, ...update } = row;
    const { data, error } = await supabase
      .from("transactions")
      .update(update)
      .eq("id", recordId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (data) {
      await offlineDb.transactions.put({
        ...data,
        _offline: {
          dirty: false,
          deleted: false,
          updatedAt: data.created_at,
          syncedAt: nowIso(),
        },
      });
    }
    return;
  }

  if (entity === "pomodoro_sessions") {
    if (operation === "DELETE") {
      const { error } = await supabase.from("pomodoro_sessions").delete().eq("id", recordId);
      if (error) throw new Error(error.message);
      await offlineDb.pomodoro_sessions.delete(recordId);
      return;
    }
    if (!payload) throw new Error("Missing focus payload");
    const row = payload as unknown as PomodoroSession;
    if (operation === "CREATE") {
      const { id: _localId, ...insert } = row;
      const { data, error } = await supabase
        .from("pomodoro_sessions")
        .insert(insert)
        .select()
        .single();
      if (error) throw new Error(error.message);
      await offlineDb.pomodoro_sessions.delete(recordId);
      if (data) {
        await offlineDb.pomodoro_sessions.put({
          ...data,
          _offline: {
            dirty: false,
            deleted: false,
            updatedAt: data.ended_at ?? data.started_at,
            syncedAt: nowIso(),
          },
        });
      }
      return;
    }
    const { id: _id, user_id: _userId, ...update } = row;
    const { data, error } = await supabase
      .from("pomodoro_sessions")
      .update(update)
      .eq("id", recordId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (data) {
      await offlineDb.pomodoro_sessions.put({
        ...data,
        _offline: {
          dirty: false,
          deleted: false,
          updatedAt: data.ended_at ?? data.started_at,
          syncedAt: nowIso(),
        },
      });
    }
    return;
  }

  if (entity === "notes") {
    if (operation === "DELETE") {
      const { error } = await supabase.from("notes").delete().eq("id", recordId);
      if (error) throw new Error(error.message);
      await offlineDb.notes.delete(recordId);
      return;
    }
    if (!payload) throw new Error("Missing note payload");
    const row = payload as unknown as Note;
    if (operation === "CREATE") {
      const { id: _localId, ...insert } = row;
      const { data, error } = await supabase
        .from("notes")
        .insert(insert)
        .select()
        .single();
      if (error) throw new Error(error.message);
      await offlineDb.notes.delete(recordId);
      if (data) {
        await offlineDb.notes.put({
          ...data,
          _offline: {
            dirty: false,
            deleted: false,
            updatedAt: data.updated_at,
            syncedAt: nowIso(),
          },
        });
      }
      return;
    }
    const { id: _id, user_id: _userId, ...update } = row;
    const { data, error } = await supabase
      .from("notes")
      .update(update)
      .eq("id", recordId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (data) {
      await offlineDb.notes.put({
        ...data,
        _offline: {
          dirty: false,
          deleted: false,
          updatedAt: data.updated_at,
          syncedAt: nowIso(),
        },
      });
    }
  }
}

export const SyncService = {
  async refreshPendingCount(): Promise<number> {
    const count = await getPendingSyncCount();
    useConnectivityStore.getState().setPendingCount(count);
    return count;
  },

  async pullAndCache(): Promise<void> {
    if (!isBrowserOnline()) return;
    const supabase = createClient();
    const [tasksRes, txRes, focusRes, notesRes] = await Promise.all([
      supabase.from("tasks").select("*").order("updated_at", { ascending: false }),
      supabase.from("transactions").select("*").order("transaction_date", { ascending: false }),
      supabase.from("pomodoro_sessions").select("*").order("started_at", { ascending: false }),
      supabase.from("notes").select("*").order("updated_at", { ascending: false }),
    ]);
    if (!tasksRes.error && tasksRes.data) await cacheTasks(tasksRes.data);
    if (!txRes.error && txRes.data) await cacheTransactions(txRes.data);
    if (!focusRes.error && focusRes.data) await cachePomodoroSessions(focusRes.data);
    if (!notesRes.error && notesRes.data) await cacheNotes(notesRes.data);
  },

  async flushQueue(): Promise<SyncResult> {
    if (!isBrowserOnline()) {
      return { processed: 0, failed: 0, remaining: await this.refreshPendingCount() };
    }

    const store = useConnectivityStore.getState();
    if (store.syncing) {
      return { processed: 0, failed: 0, remaining: store.pendingCount };
    }

    store.setSyncing(true);
    let processed = 0;
    let failed = 0;

    try {
      const queue = await listSyncQueue();
      for (const item of queue) {
        if (!item.id) continue;
        try {
          await applyQueueItem(item);
          await offlineDb.sync_queue.delete(item.id);
          processed += 1;
        } catch (err) {
          failed += 1;
          await offlineDb.sync_queue.update(item.id, {
            attempts: (item.attempts ?? 0) + 1,
            lastError: err instanceof Error ? err.message : "Sync failed",
          });
        }
      }

      if (processed > 0) {
        await this.pullAndCache();
      }

      const remaining = await this.refreshPendingCount();
      const stamp = nowIso();
      store.setLastSyncedAt(stamp);
      if (processed > 0 && remaining === 0) {
        store.setLastSyncMessage("Everything has been synchronized.");
      } else if (failed > 0) {
        store.setLastSyncMessage(`${failed} change(s) still pending retry.`);
      }
      return { processed, failed, remaining };
    } finally {
      store.setSyncing(false);
    }
  },
};

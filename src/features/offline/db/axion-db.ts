import Dexie, { type EntityTable } from "dexie";
import type {
  OfflineNote,
  OfflinePomodoroSession,
  OfflineSettings,
  OfflineTask,
  OfflineTransaction,
  SyncQueueItem,
} from "@/features/offline/types";

export class AxionOfflineDb extends Dexie {
  tasks!: EntityTable<OfflineTask, "id">;
  transactions!: EntityTable<OfflineTransaction, "id">;
  pomodoro_sessions!: EntityTable<OfflinePomodoroSession, "id">;
  notes!: EntityTable<OfflineNote, "id">;
  settings!: EntityTable<OfflineSettings, "id">;
  sync_queue!: EntityTable<SyncQueueItem, "id">;

  constructor() {
    super("axion-os-offline");
    this.version(1).stores({
      tasks: "id, user_id, updated_at, completed, project_id",
      transactions: "id, user_id, transaction_date, type, created_at",
      pomodoro_sessions: "id, user_id, started_at, completed",
      settings: "id, user_id",
      sync_queue: "++id, entity, recordId, createdAt",
    });
    this.version(2).stores({
      tasks: "id, user_id, updated_at, completed, project_id",
      transactions: "id, user_id, transaction_date, type, created_at",
      pomodoro_sessions: "id, user_id, started_at, completed",
      notes: "id, user_id, task_id, due_date, updated_at, pinned",
      settings: "id, user_id",
      sync_queue: "++id, entity, recordId, createdAt",
    });
    this.version(3).stores({
      tasks: "id, user_id, updated_at, completed, project_id",
      transactions: "id, user_id, transaction_date, type, created_at",
      pomodoro_sessions: "id, user_id, started_at, completed",
      notes: "id, user_id, task_id, due_date, updated_at, pinned, favorite",
      settings: "id, user_id",
      sync_queue: "++id, entity, recordId, createdAt",
    });
    this.version(4).stores({
      tasks: "id, user_id, updated_at, completed, project_id",
      transactions: "id, user_id, transaction_date, type, created_at",
      pomodoro_sessions: "id, user_id, started_at, completed",
      notes:
        "id, user_id, task_id, due_date, updated_at, pinned, favorite, remind_enabled, remind_weekday",
      settings: "id, user_id",
      sync_queue: "++id, entity, recordId, createdAt",
    });
  }
}

export const offlineDb = new AxionOfflineDb();

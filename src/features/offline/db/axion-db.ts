import Dexie, { type EntityTable } from "dexie";
import type {
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
  }
}

export const offlineDb = new AxionOfflineDb();

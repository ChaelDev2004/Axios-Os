export type SyncEntity =
  | "tasks"
  | "transactions"
  | "pomodoro_sessions"
  | "projects"
  | "notes"
  | "settings";

export type SyncOperation = "CREATE" | "UPDATE" | "DELETE";

export type SyncQueueItem = {
  id?: number;
  entity: SyncEntity;
  operation: SyncOperation;
  recordId: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  attempts: number;
  lastError: string | null;
};

export type OfflineMeta = {
  dirty: boolean;
  deleted: boolean;
  updatedAt: string;
  syncedAt: string | null;
};

export type OfflineTask = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
  _offline: OfflineMeta;
};

export type OfflineTransaction = {
  id: string;
  user_id: string;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  description: string | null;
  transaction_date: string;
  created_at: string;
  _offline: OfflineMeta;
};

export type OfflinePomodoroSession = {
  id: string;
  user_id: string;
  duration: number;
  completed: boolean;
  started_at: string;
  ended_at: string | null;
  _offline: OfflineMeta;
};

export type OfflineSettings = {
  id: string;
  user_id: string;
  autoSync: boolean;
  accentColor: string;
  notificationsEnabled: boolean;
  updated_at: string;
  _offline: OfflineMeta;
};

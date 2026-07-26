const DB_NAME = "axion-focus-music";
const DB_VERSION = 1;
const STORE = "tracks";
const MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
  "audio/m4a",
]);

export type StoredFocusTrackMeta = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  addedAt: string;
};

type StoredFocusTrackRecord = StoredFocusTrackMeta & {
  blob: Blob;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error("Failed to open music library."));
  });
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error("Music library request failed."));
  });
}

function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled track";
}

function isAllowedAudio(file: File): boolean {
  if (file.type && ALLOWED_TYPES.has(file.type)) return true;
  const lower = file.name.toLowerCase();
  return (
    lower.endsWith(".mp3") ||
    lower.endsWith(".wav") ||
    lower.endsWith(".ogg") ||
    lower.endsWith(".m4a") ||
    lower.endsWith(".aac") ||
    lower.endsWith(".webm")
  );
}

export async function listDownloadedFocusTracks(): Promise<StoredFocusTrackMeta[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const rows = await requestToPromise(store.getAll() as IDBRequest<StoredFocusTrackRecord[]>);
    return (rows ?? [])
      .map(({ id, title, fileName, mimeType, size, addedAt }) => ({
        id,
        title,
        fileName,
        mimeType,
        size,
        addedAt,
      }))
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  } finally {
    db.close();
  }
}

export async function addDownloadedFocusTrack(file: File): Promise<StoredFocusTrackMeta> {
  if (!file || file.size <= 0) {
    throw new Error("Choose an audio file to upload.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Audio file must be 20MB or smaller.");
  }
  if (!isAllowedAudio(file)) {
    throw new Error("Use MP3, WAV, OGG, M4A, AAC, or WebM.");
  }

  const record: StoredFocusTrackRecord = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: titleFromFileName(file.name),
    fileName: file.name,
    mimeType: file.type || "audio/mpeg",
    size: file.size,
    addedAt: new Date().toISOString(),
    blob: file,
  };

  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await requestToPromise(tx.objectStore(STORE).put(record));
  } finally {
    db.close();
  }

  const { blob: _blob, ...meta } = record;
  return meta;
}

export async function removeDownloadedFocusTrack(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await requestToPromise(tx.objectStore(STORE).delete(id));
  } finally {
    db.close();
  }
}

export async function getDownloadedFocusTrackObjectUrl(
  id: string
): Promise<{ url: string; meta: StoredFocusTrackMeta } | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const row = await requestToPromise(
      tx.objectStore(STORE).get(id) as IDBRequest<StoredFocusTrackRecord | undefined>
    );
    if (!row?.blob) return null;
    const url = URL.createObjectURL(row.blob);
    return {
      url,
      meta: {
        id: row.id,
        title: row.title,
        fileName: row.fileName,
        mimeType: row.mimeType,
        size: row.size,
        addedAt: row.addedAt,
      },
    };
  } finally {
    db.close();
  }
}

export function formatTrackBytes(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

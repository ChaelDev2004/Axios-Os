"use client";

import { useCallback, useEffect, useState } from "react";
import { Cloud, CloudOff, HardDrive, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  clearOfflineCache,
  estimateOfflineStorage,
} from "@/features/offline/lib/offline-utils";
import { SyncService } from "@/features/offline/services/sync.service";
import { useConnectivityStore } from "@/features/offline/stores/connectivity.store";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

export function OfflineSettingsPanel() {
  const online = useConnectivityStore((s) => s.online);
  const syncing = useConnectivityStore((s) => s.syncing);
  const pendingCount = useConnectivityStore((s) => s.pendingCount);
  const lastSyncedAt = useConnectivityStore((s) => s.lastSyncedAt);
  const autoSync = useConnectivityStore((s) => s.autoSync);
  const setAutoSync = useConnectivityStore((s) => s.setAutoSync);

  const [storage, setStorage] = useState<Awaited<
    ReturnType<typeof estimateOfflineStorage>
  > | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [estimate] = await Promise.all([
      estimateOfflineStorage(),
      SyncService.refreshPendingCount(),
    ]);
    setStorage(estimate);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, pendingCount, lastSyncedAt]);

  const onManualSync = async () => {
    if (!online) {
      toast.message("You're offline", {
        description: "Reconnect to sync with the cloud.",
      });
      return;
    }
    setBusy(true);
    try {
      const result = await SyncService.flushQueue();
      await SyncService.pullAndCache();
      await refresh();
      if (result.remaining === 0) {
        toast.success("Everything has been synchronized.");
      } else if (result.failed > 0) {
        toast.message("Sync partially complete", {
          description: `${result.remaining} item(s) still pending.`,
        });
      } else {
        toast.message("Already up to date");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  };

  const onClearCache = async () => {
    if (pendingCount > 0) {
      toast.error("Sync pending changes before clearing the offline cache.");
      return;
    }
    setBusy(true);
    try {
      await clearOfflineCache();
      await refresh();
      toast.success("Offline cache cleared.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not clear cache");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="axion-card mt-6">
      <div className="axion-kicker">Offline</div>
      <h2 className="axion-title">Sync &amp; storage</h2>
      <p className="axion-body">
        Axion OS keeps tasks, finance, and focus sessions available without
        internet. Changes queue locally and sync when you reconnect.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
            online
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          )}
        >
          {online ? (
            <Cloud className="h-3.5 w-3.5" />
          ) : (
            <CloudOff className="h-3.5 w-3.5" />
          )}
          {online ? "Online" : "Offline Mode"}
        </span>
        {pendingCount > 0 ? (
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {pendingCount} queued
          </span>
        ) : null}
        {lastSyncedAt ? (
          <span className="text-xs text-slate-500">
            Last sync {new Date(lastSyncedAt).toLocaleString()}
          </span>
        ) : null}
      </div>

      <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div>
          <div className="text-sm font-medium text-foreground">Auto sync</div>
          <div className="text-xs text-slate-500">
            Flush the queue when online and on a timer
          </div>
        </div>
        <input
          type="checkbox"
          className="h-4 w-4 accent-indigo-500"
          checked={autoSync}
          onChange={(e) => setAutoSync(e.target.checked)}
        />
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <HardDrive className="h-3.5 w-3.5" />
            Storage usage
          </div>
          <div className="mt-2 text-lg font-semibold text-foreground">
            {storage ? formatBytes(storage.usedBytes) : "—"}
            {storage?.quotaBytes ? (
              <span className="text-sm font-normal text-slate-500">
                {" "}
                / {formatBytes(storage.quotaBytes)}
              </span>
            ) : null}
          </div>
          {storage ? (
            <p className="mt-1 text-xs text-slate-500">
              {storage.taskCount} tasks · {storage.transactionCount} txns ·{" "}
              {storage.sessionCount} focus · {storage.queueCount} queued
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy || syncing}
            onClick={() => void onManualSync()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-4 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/25 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", (busy || syncing) && "animate-spin")} />
            Sync now
          </button>
          <button
            type="button"
            disabled={busy || pendingCount > 0}
            onClick={() => void onClearCache()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:border-rose-400/30 hover:bg-rose-500/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Clear offline cache
          </button>
        </div>
      </div>
    </div>
  );
}

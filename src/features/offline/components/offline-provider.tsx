"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  getDeviceOnlineStatus,
  subscribeAppResume,
  subscribeDeviceNetwork,
} from "@/lib/capacitor/network";
import { SyncService } from "@/features/offline/services/sync.service";
import { useConnectivityStore } from "@/features/offline/stores/connectivity.store";

const AUTO_SYNC_INTERVAL_MS = 45_000;

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const setOnline = useConnectivityStore((s) => s.setOnline);
  const autoSync = useConnectivityStore((s) => s.autoSync);
  const lastSyncMessage = useConnectivityStore((s) => s.lastSyncMessage);
  const setLastSyncMessage = useConnectivityStore((s) => s.setLastSyncMessage);
  const wasOffline = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let unsubNetwork: (() => void) | undefined;
    let unsubResume: (() => void) | undefined;

    const handleOnline = () => {
      setOnline(true);
      if (wasOffline.current && useConnectivityStore.getState().autoSync) {
        void SyncService.flushQueue()
          .then((result) => {
            if (result.processed > 0 && result.remaining === 0) {
              toast.success("Everything has been synchronized.");
            }
          })
          .catch(() => undefined);
      }
      wasOffline.current = false;
    };

    const handleOffline = () => {
      wasOffline.current = true;
      setOnline(false);
      toast.message("Offline Mode", {
        description: "Changes are saved on this device and will sync when you reconnect.",
      });
    };

    const applyStatus = (online: boolean) => {
      if (cancelled) return;
      if (online) handleOnline();
      else handleOffline();
    };

    void (async () => {
      const online = await getDeviceOnlineStatus();
      if (cancelled) return;

      wasOffline.current = !online;
      setOnline(online);
      void SyncService.refreshPendingCount();

      if (online) {
        void SyncService.pullAndCache().catch(() => undefined);
        if (useConnectivityStore.getState().autoSync) {
          void SyncService.flushQueue().catch(() => undefined);
        }
      }

      unsubNetwork = await subscribeDeviceNetwork((next) => {
        if (cancelled) return;
        const prev = useConnectivityStore.getState().online;
        if (next === prev) return;
        applyStatus(next);
      });

      // Capacitor: re-check when app returns from background (Wi‑Fi may have changed).
      unsubResume = await subscribeAppResume(() => {
        void getDeviceOnlineStatus().then((next) => {
          if (cancelled) return;
          const prev = useConnectivityStore.getState().online;
          if (next !== prev) {
            applyStatus(next);
            return;
          }
          if (next && useConnectivityStore.getState().autoSync) {
            void SyncService.flushQueue().catch(() => undefined);
          }
        });
      });
    })();

    return () => {
      cancelled = true;
      unsubNetwork?.();
      unsubResume?.();
    };
  }, [setOnline]);

  useEffect(() => {
    if (!autoSync) return;
    const id = window.setInterval(() => {
      if (!useConnectivityStore.getState().online) return;
      void SyncService.flushQueue().catch(() => undefined);
    }, AUTO_SYNC_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [autoSync]);

  useEffect(() => {
    if (!lastSyncMessage) return;
    const t = window.setTimeout(() => setLastSyncMessage(null), 4000);
    return () => window.clearTimeout(t);
  }, [lastSyncMessage, setLastSyncMessage]);

  return <>{children}</>;
}

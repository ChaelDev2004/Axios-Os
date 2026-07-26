"use client";

import { create } from "zustand";

type ConnectivityState = {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastSyncMessage: string | null;
  autoSync: boolean;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setPendingCount: (count: number) => void;
  setLastSyncedAt: (iso: string | null) => void;
  setLastSyncMessage: (message: string | null) => void;
  setAutoSync: (autoSync: boolean) => void;
};

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  // Always start online so SSR HTML matches the first client render.
  // OfflineProvider / Capacitor Network update this after mount.
  online: true,
  syncing: false,
  pendingCount: 0,
  lastSyncedAt: null,
  lastSyncMessage: null,
  autoSync: true,
  setOnline: (online) => set({ online }),
  setSyncing: (syncing) => set({ syncing }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setLastSyncMessage: (lastSyncMessage) => set({ lastSyncMessage }),
  setAutoSync: (autoSync) => set({ autoSync }),
}));

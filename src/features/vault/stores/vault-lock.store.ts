"use client";

import { create } from "zustand";
import {
  clearVaultSessionKey,
  createKdfSalt,
  deriveVaultKey,
  setVaultSessionKey,
} from "@/features/vault/lib/crypto";
import { hashPin, verifyPin } from "@/features/auth/lib/pin.utils";
import type { VaultAutoLockMinutes } from "@/features/vault/types";
import {
  fetchVaultSettings,
  setupVaultSettings,
  updateVaultAutoLock,
} from "@/features/vault/services/vault.service";

type VaultLockState = {
  unlocked: boolean;
  ready: boolean;
  hasSetup: boolean;
  autoLockMinutes: VaultAutoLockMinutes;
  lastActivityAt: number;
  error: string | null;
  bootstrap: () => Promise<void>;
  setupPin: (pin: string) => Promise<boolean>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  touch: () => void;
  setAutoLockMinutes: (minutes: VaultAutoLockMinutes) => Promise<void>;
  checkAutoLock: () => void;
};

export const useVaultLockStore = create<VaultLockState>((set, get) => ({
  unlocked: false,
  ready: false,
  hasSetup: false,
  autoLockMinutes: 5,
  lastActivityAt: Date.now(),
  error: null,

  bootstrap: async () => {
    try {
      const settings = await fetchVaultSettings();
      set({
        ready: true,
        hasSetup: Boolean(settings),
        autoLockMinutes: settings?.autoLockMinutes ?? 5,
        error: null,
      });
    } catch {
      set({ ready: true, hasSetup: false, error: null });
    }
  },

  setupPin: async (pin: string) => {
    if (!/^\d{4,8}$/.test(pin)) {
      set({ error: "PIN must be 4–8 digits." });
      return false;
    }
    try {
      const salt = createKdfSalt();
      const pinHash = await hashPin(pin);
      await setupVaultSettings({ pinHash, kdfSalt: salt, autoLockMinutes: 5 });
      const key = await deriveVaultKey(pin, salt);
      setVaultSessionKey(key);
      set({
        unlocked: true,
        hasSetup: true,
        autoLockMinutes: 5,
        lastActivityAt: Date.now(),
        error: null,
      });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Could not set up vault PIN.",
      });
      return false;
    }
  },

  unlock: async (pin: string) => {
    try {
      const settings = await fetchVaultSettings();
      if (!settings) {
        set({ error: "Vault is not set up yet.", hasSetup: false });
        return false;
      }
      const ok = await verifyPin(pin, settings.pinHash);
      if (!ok) {
        set({ error: "Incorrect PIN." });
        return false;
      }
      const key = await deriveVaultKey(pin, settings.kdfSalt);
      setVaultSessionKey(key);
      set({
        unlocked: true,
        hasSetup: true,
        autoLockMinutes: settings.autoLockMinutes,
        lastActivityAt: Date.now(),
        error: null,
      });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Could not unlock vault.",
      });
      return false;
    }
  },

  lock: () => {
    clearVaultSessionKey();
    set({ unlocked: false, error: null });
  },

  touch: () => {
    if (!get().unlocked) return;
    set({ lastActivityAt: Date.now() });
  },

  setAutoLockMinutes: async (minutes) => {
    await updateVaultAutoLock(minutes);
    set({ autoLockMinutes: minutes, lastActivityAt: Date.now() });
  },

  checkAutoLock: () => {
    const { unlocked, autoLockMinutes, lastActivityAt } = get();
    if (!unlocked || autoLockMinutes === 0) return;
    const elapsed = Date.now() - lastActivityAt;
    if (elapsed >= autoLockMinutes * 60_000) {
      get().lock();
    }
  },
}));

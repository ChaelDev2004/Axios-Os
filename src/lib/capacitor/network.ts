import { Capacitor } from "@capacitor/core";

/**
 * Reliable online detection for Capacitor + web.
 * Android WebViews often leave navigator.onLine stuck at true.
 */
export async function getDeviceOnlineStatus(): Promise<boolean> {
  if (typeof window === "undefined") return true;

  if (Capacitor.isNativePlatform()) {
    try {
      const { Network } = await import("@capacitor/network");
      const status = await Network.getStatus();
      return Boolean(status.connected);
    } catch {
      // fall through to navigator
    }
  }

  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export type NetworkUnsubscribe = () => void;

/**
 * Subscribe to connectivity changes (Capacitor Network on native, window events on web).
 */
export async function subscribeDeviceNetwork(
  onChange: (online: boolean) => void
): Promise<NetworkUnsubscribe> {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const { Network } = await import("@capacitor/network");
      const listener = await Network.addListener("networkStatusChange", (status) => {
        onChange(Boolean(status.connected));
      });
      return () => {
        void listener.remove();
      };
    } catch {
      // fall through to window events
    }
  }

  const onOnline = () => onChange(true);
  const onOffline = () => onChange(false);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

/**
 * When the native app returns to foreground, re-check network and run `onResume`.
 */
export async function subscribeAppResume(
  onResume: () => void
): Promise<NetworkUnsubscribe> {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return () => undefined;
  }

  try {
    const { App } = await import("@capacitor/app");
    const listener = await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) onResume();
    });
    return () => {
      void listener.remove();
    };
  } catch {
    return () => undefined;
  }
}

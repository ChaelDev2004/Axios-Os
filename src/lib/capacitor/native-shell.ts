import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

import { getDeviceOnlineStatus } from "@/lib/capacitor/network";
import { useConnectivityStore } from "@/features/offline/stores/connectivity.store";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function initNativeShell(): Promise<void> {
  if (!isNativeApp()) return;

  document.documentElement.classList.add("is-native-app");
  document.body.classList.add("is-native-app");

  // Seed connectivity early — WebView navigator.onLine is unreliable on Android.
  try {
    const online = await getDeviceOnlineStatus();
    useConnectivityStore.getState().setOnline(online);
  } catch {
    /* ignore */
  }

  try {
    // Light status-bar content (icons) on dark background
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#09090b" });
  } catch {
    /* web / unsupported */
  }

  try {
    await SplashScreen.hide();
  } catch {
    /* ignore */
  }

  CapApp.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
      return;
    }
    void CapApp.exitApp();
  });
}

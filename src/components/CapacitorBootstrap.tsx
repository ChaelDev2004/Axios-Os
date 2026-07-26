"use client";

import { useEffect } from "react";

import { initNativeShell, isNativeApp } from "@/lib/capacitor/native-shell";

/** Boots Capacitor plugins when running inside the native Android/iOS shell. */
export function CapacitorBootstrap() {
  useEffect(() => {
    void initNativeShell();

    // Native apps should land on login, not the WebGL portfolio home.
    if (
      isNativeApp() &&
      typeof window !== "undefined" &&
      window.location.pathname === "/"
    ) {
      window.location.replace("/auth/login");
    }
  }, []);

  return null;
}

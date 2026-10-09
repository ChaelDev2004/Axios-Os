import { Capacitor, registerPlugin } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource, type PermissionStatus } from "@capacitor/camera";

import { isNativeApp } from "@/lib/capacitor/native-shell";

/** `blocked` = Android will no longer show the system prompt; only App Settings can grant it. */
export type CameraPermission = "granted" | "denied" | "blocked" | "web";

interface AppSettingsPlugin {
  open: () => Promise<void>;
}

const AppSettings = registerPlugin<AppSettingsPlugin>("AppSettings");

const CANCEL_PATTERN = /cancel/i;

export function hasNativeCamera(): boolean {
  return isNativeApp() && Capacitor.isPluginAvailable("Camera");
}

function isGranted(status: PermissionStatus): boolean {
  return status.camera === "granted" || status.camera === "limited";
}

export async function getCameraPermission(): Promise<CameraPermission> {
  if (!hasNativeCamera()) return "web";
  try {
    const status = await Camera.checkPermissions();
    if (isGranted(status)) return "granted";
    return status.camera === "denied" ? "blocked" : "denied";
  } catch {
    return "denied";
  }
}

export async function ensureCameraPermission(): Promise<CameraPermission> {
  const current = await getCameraPermission();
  if (current !== "denied") return current;
  try {
    const requested = await Camera.requestPermissions({ permissions: ["camera"] });
    if (isGranted(requested)) return "granted";
    return requested.camera === "denied" ? "blocked" : "denied";
  } catch {
    return "denied";
  }
}

export async function openAppSettings(): Promise<boolean> {
  if (!isNativeApp() || !Capacitor.isPluginAvailable("AppSettings")) return false;
  try {
    await AppSettings.open();
    return true;
  } catch {
    return false;
  }
}

/** Opens the phone's built-in camera app. Resolves `null` when the user cancels. */
export async function takeSystemPhoto(): Promise<Blob | null> {
  try {
    const photo = await Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.Uri,
      quality: 90,
      correctOrientation: true,
      saveToGallery: false,
    });
    if (!photo.webPath) return null;
    const response = await fetch(photo.webPath);
    return await response.blob();
  } catch (error) {
    if (error instanceof Error && CANCEL_PATTERN.test(error.message)) return null;
    throw error;
  }
}

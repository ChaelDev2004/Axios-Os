import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

import { isNativeApp } from "@/lib/capacitor/native-shell";

export type CameraPermission = "granted" | "denied" | "web";

const CANCEL_PATTERN = /cancel/i;

export async function ensureCameraPermission(): Promise<CameraPermission> {
  if (!isNativeApp()) return "web";
  try {
    const current = await Camera.checkPermissions();
    if (current.camera === "granted" || current.camera === "limited") return "granted";
    const requested = await Camera.requestPermissions({ permissions: ["camera"] });
    return requested.camera === "granted" || requested.camera === "limited" ? "granted" : "denied";
  } catch {
    return "denied";
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

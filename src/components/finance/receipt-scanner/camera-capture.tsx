"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Camera, CameraOff, Image as ImageIcon, Keyboard, Loader2, Settings, Zap, ZapOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { canvasToBlob, type CropRect } from "@/features/finance/lib/receipt-image";
import {
  ensureCameraPermission,
  getCameraPermission,
  hasNativeCamera,
  openAppSettings,
  takeSystemPhoto,
} from "@/lib/capacitor/camera";

interface CameraCaptureProps {
  onCapture: (blob: Blob, crop?: CropRect) => void;
  onClose: () => void;
  onManual: () => void;
}

type CameraIssue = "denied" | "blocked" | "unavailable" | "insecure" | "systemCamera";

interface TorchCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

interface TorchConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
}

const FRAME_MARGIN = 0.03;

const CAMERA_ISSUE_MESSAGES: Record<CameraIssue, { title: string; message: string }> = {
  denied: {
    title: "Camera access denied",
    message: "Tap Allow camera, then choose Allow on the camera prompt.",
  },
  blocked: {
    title: "Camera is turned off",
    message: "Tap Open Settings, go to Permissions > Camera, and choose Allow. Then return to the app.",
  },
  systemCamera: {
    title: "Use your phone camera",
    message: "Tap Take photo to open your phone's camera, then confirm the picture.",
  },
  unavailable: {
    title: "Camera unavailable",
    message: "No camera could be opened on this device. Choose a photo from your gallery instead.",
  },
  insecure: {
    title: "Camera needs a secure connection",
    message: "Live camera only works over HTTPS. Use your phone camera or gallery below.",
  },
};

function frameCrop(video: HTMLVideoElement, frame: HTMLElement): CropRect | undefined {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return undefined;

  const videoRect = video.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  const scale = Math.max(videoRect.width / vw, videoRect.height / vh);
  const offsetX = (videoRect.width - vw * scale) / 2;
  const offsetY = (videoRect.height - vh * scale) / 2;

  const x = (frameRect.left - videoRect.left - offsetX) / scale / vw - FRAME_MARGIN;
  const y = (frameRect.top - videoRect.top - offsetY) / scale / vh - FRAME_MARGIN;
  const width = frameRect.width / scale / vw + FRAME_MARGIN * 2;
  const height = frameRect.height / scale / vh + FRAME_MARGIN * 2;

  const left = Math.max(0, x);
  const top = Math.max(0, y);
  return {
    x: left,
    y: top,
    width: Math.min(1 - left, width - (left - x)),
    height: Math.min(1 - top, height - (top - y)),
  };
}

export function CameraCapture({ onCapture, onClose, onManual }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const nativeCameraRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [issue, setIssue] = useState<CameraIssue | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let stream: MediaStream | null = null;

    async function start() {
      const permission = await ensureCameraPermission();
      if (isCancelled) return;
      if (permission === "denied" || permission === "blocked") {
        setIssue(permission);
        return;
      }
      const isNative = permission === "granted";
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setIssue(isNative ? "systemCamera" : window.isSecureContext ? "unavailable" : "insecure");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const [track] = stream.getVideoTracks();
        trackRef.current = track ?? null;
        const capabilities = track?.getCapabilities?.() as TorchCapabilities | undefined;
        setHasTorch(Boolean(capabilities?.torch));
        setIsReady(true);
      } catch (e) {
        if (isCancelled) return;
        const name = e instanceof DOMException ? e.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setIssue((await getCameraPermission()) === "blocked" ? "blocked" : "denied");
        } else setIssue(isNative ? "systemCamera" : "unavailable");
      }
    }

    void start();
    return () => {
      isCancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
    };
  }, [attempt]);

  const isPermissionIssue = issue === "denied" || issue === "blocked";

  useEffect(() => {
    if (!isPermissionIssue) return;
    async function recheck() {
      if (document.visibilityState === "visible" && (await getCameraPermission()) === "granted") restartCamera();
    }
    document.addEventListener("visibilitychange", recheck);
    return () => document.removeEventListener("visibilitychange", recheck);
  }, [isPermissionIssue]);

  function restartCamera() {
    setIssue(null);
    setIsReady(false);
    setAttempt((n) => n + 1);
  }

  async function allowCamera() {
    if (isRequestingPermission) return;
    setIsRequestingPermission(true);
    try {
      const permission = await ensureCameraPermission();
      if (permission === "blocked") {
        setIssue("blocked");
        await openAppSettings();
        return;
      }
      if (permission === "denied") {
        setIssue("denied");
        return;
      }
      restartCamera();
    } finally {
      setIsRequestingPermission(false);
    }
  }

  async function takePhoto() {
    if (!hasNativeCamera()) {
      nativeCameraRef.current?.click();
      return;
    }
    if (isOpeningCamera) return;
    setIsOpeningCamera(true);
    try {
      const permission = await ensureCameraPermission();
      if (permission === "denied" || permission === "blocked") {
        setIssue(permission);
        return;
      }
      const blob = await takeSystemPhoto();
      if (blob) onCapture(blob);
    } catch {
      nativeCameraRef.current?.click();
    } finally {
      setIsOpeningCamera(false);
    }
  }

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track) return;
    const next = !isTorchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as TorchConstraintSet] });
      setIsTorchOn(next);
    } catch {
      setHasTorch(false);
    }
  }

  async function capture() {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame || !video.videoWidth || isCapturing) return;
    setIsCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
      onCapture(blob, frameCrop(video, frame));
    } catch {
      setIssue("unavailable");
    } finally {
      setIsCapturing(false);
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onCapture(file);
  }

  const issueCopy = issue ? CAMERA_ISSUE_MESSAGES[issue] : null;

  return (
    <div className="relative flex h-full flex-col bg-black text-white">
      <header
        className="relative z-10 flex items-center justify-between gap-2 px-3! pb-3!"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scanner"
          className="flex size-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-base font-semibold">Scan Receipt</h2>
        {hasTorch ? (
          <button
            type="button"
            onClick={() => void toggleTorch()}
            aria-label={isTorchOn ? "Turn flash off" : "Turn flash on"}
            aria-pressed={isTorchOn}
            className="flex size-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
          >
            {isTorchOn ? <Zap className="size-5 text-amber-300" /> : <ZapOff className="size-5" />}
          </button>
        ) : (
          <span className="size-11" aria-hidden />
        )}
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
          autoPlay
          aria-label="Camera preview"
        />

        {issueCopy ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6! text-center" role="alert">
            <CameraOff className="size-10 text-white/70" aria-hidden />
            <div className="max-w-sm">
              <p className="text-lg font-semibold">{issueCopy.title}</p>
              <p className="mt-2! text-sm leading-relaxed text-white/70">{issueCopy.message}</p>
            </div>
            <div className="mt-2! flex w-full max-w-xs flex-col gap-3">
              {isPermissionIssue && (
                <Button
                  className="h-12 w-full rounded-full px-5!"
                  onClick={() => void allowCamera()}
                  disabled={isRequestingPermission}
                  aria-busy={isRequestingPermission}
                >
                  {isRequestingPermission ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : issue === "blocked" ? (
                    <Settings aria-hidden />
                  ) : (
                    <Camera aria-hidden />
                  )}
                  {issue === "blocked" ? "Open Settings" : "Allow camera"}
                </Button>
              )}
              <Button
                variant={isPermissionIssue ? "outline" : "default"}
                className={
                  isPermissionIssue
                    ? "h-12 w-full rounded-full border-white/20 bg-white/5 px-5! text-white hover:bg-white/10"
                    : "h-12 w-full rounded-full px-5!"
                }
                onClick={() => void takePhoto()}
                disabled={isOpeningCamera}
                aria-busy={isOpeningCamera}
              >
                {isOpeningCamera ? <Loader2 className="animate-spin" aria-hidden /> : <Camera />}
                {isOpeningCamera ? "Opening camera..." : "Take photo"}
              </Button>
              <Button
                variant="outline"
                className="h-12 w-full rounded-full border-white/20 bg-white/5 px-5! text-white hover:bg-white/10"
                onClick={() => galleryRef.current?.click()}
              >
                <ImageIcon /> Choose from gallery
              </Button>
              <Button variant="ghost" className="h-12 w-full rounded-full px-5! text-white hover:bg-white/10" onClick={onManual}>
                <Keyboard /> Enter manually
              </Button>
            </div>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-5 px-6!">
            <div
              ref={frameRef}
              className="relative aspect-[3/4.2] w-[min(82vw,420px)] max-h-[68%] rounded-2xl"
              style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)" }}
            >
              {(["left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl", "left-0 bottom-0 border-b-4 border-l-4 rounded-bl-2xl", "right-0 bottom-0 border-b-4 border-r-4 rounded-br-2xl"] as const).map((pos) => (
                <span key={pos} className={`absolute size-8 border-white ${pos}`} aria-hidden />
              ))}
            </div>
            <p className="relative rounded-full bg-black/60 px-4! py-2! text-sm">
              {isReady ? "Position the receipt inside the frame" : "Starting camera..."}
            </p>
          </div>
        )}
      </div>

      <footer
        className="relative z-10 flex items-center justify-around gap-4 px-6! pt-5!"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="flex w-16 flex-col items-center gap-1.5 rounded-lg py-1! text-xs text-white/80 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-white/10">
            <ImageIcon className="size-5" />
          </span>
          Gallery
        </button>
        <button
          type="button"
          onClick={() => void capture()}
          disabled={!isReady || isCapturing || Boolean(issue)}
          aria-label="Capture receipt"
          className="flex size-[72px] items-center justify-center rounded-full border-4 border-white transition-transform duration-150 active:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/70"
        >
          <span className="size-14 rounded-full bg-white" />
        </button>
        <button
          type="button"
          onClick={onManual}
          className="flex w-16 flex-col items-center gap-1.5 rounded-lg py-1! text-xs text-white/80 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-white/10">
            <Keyboard className="size-5" />
          </span>
          Manual
        </button>
      </footer>

      <input ref={galleryRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={handleFile} />
      <input
        ref={nativeCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={handleFile}
      />
    </div>
  );
}

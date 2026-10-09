"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Camera, CameraOff, Image as ImageIcon, Keyboard, Zap, ZapOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { canvasToBlob, type CropRect } from "@/features/finance/lib/receipt-image";

interface CameraCaptureProps {
  onCapture: (blob: Blob, crop?: CropRect) => void;
  onClose: () => void;
  onManual: () => void;
}

type CameraIssue = "denied" | "unavailable" | "insecure";

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
    message: "Allow camera access in your browser or app settings, or choose a photo from your gallery.",
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

  useEffect(() => {
    let isCancelled = false;
    let stream: MediaStream | null = null;

    async function start() {
      if (!window.isSecureContext) {
        setIssue("insecure");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setIssue("unavailable");
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
        setIssue(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
      }
    }

    void start();
    return () => {
      isCancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
    };
  }, []);

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
        className="relative z-10 flex items-center justify-between gap-2 px-3 pb-2"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" role="alert">
            <CameraOff className="size-10 text-white/70" aria-hidden />
            <div>
              <p className="text-lg font-semibold">{issueCopy.title}</p>
              <p className="mt-1 text-sm text-white/70">{issueCopy.message}</p>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-2">
              <Button className="h-11 w-full rounded-full" onClick={() => nativeCameraRef.current?.click()}>
                <Camera /> Take photo
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={() => galleryRef.current?.click()}
              >
                <ImageIcon /> Choose from gallery
              </Button>
              <Button variant="ghost" className="h-11 w-full rounded-full text-white hover:bg-white/10" onClick={onManual}>
                <Keyboard /> Enter manually
              </Button>
            </div>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
            <div
              ref={frameRef}
              className="relative aspect-[3/4.2] w-[min(82vw,420px)] max-h-[68%] rounded-2xl"
              style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)" }}
            >
              {(["left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl", "left-0 bottom-0 border-b-4 border-l-4 rounded-bl-2xl", "right-0 bottom-0 border-b-4 border-r-4 rounded-br-2xl"] as const).map((pos) => (
                <span key={pos} className={`absolute size-8 border-white ${pos}`} aria-hidden />
              ))}
            </div>
            <p className="relative rounded-full bg-black/60 px-4 py-1.5 text-sm">
              {isReady ? "Position the receipt inside the frame" : "Starting camera..."}
            </p>
          </div>
        )}
      </div>

      <footer
        className="relative z-10 flex items-center justify-around gap-4 px-6 pt-4"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="flex w-16 flex-col items-center gap-1 text-xs text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-lg"
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
          className="flex w-16 flex-col items-center gap-1 text-xs text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-lg"
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

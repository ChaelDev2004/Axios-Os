import { AlertCircle, ArrowLeft, Camera, Keyboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ScanError as ScanErrorDetails } from "@/components/finance/receipt-scanner/use-receipt-scanner";

interface ScanErrorProps {
  error: ScanErrorDetails;
  previewUrl: string | null;
  onClose: () => void;
  onRetake: () => void;
  onManual: () => void;
}

export function ScanError({ error, previewUrl, onClose, onRetake, onManual }: ScanErrorProps) {
  return (
    <div className="flex h-full flex-col bg-black text-white">
      <header className="px-3 pb-2" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scanner"
          className="flex size-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
        >
          <ArrowLeft className="size-5" />
        </button>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center" role="alert">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img src={previewUrl} alt="Captured receipt" className="max-h-[32vh] rounded-xl border border-white/10 object-contain opacity-70" />
        ) : null}
        <AlertCircle className="size-10 text-amber-300" aria-hidden />
        <div className="max-w-sm">
          <p className="text-lg font-semibold">{error.title}</p>
          <p className="mt-1 text-sm text-white/70">{error.message}</p>
        </div>
        <div
          className="flex w-full max-w-xs flex-col gap-2"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        >
          <Button className="h-12 w-full rounded-full" onClick={onRetake}>
            <Camera /> Retake Photo
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
            onClick={onManual}
          >
            <Keyboard /> Enter Amount Manually
          </Button>
        </div>
      </div>
    </div>
  );
}

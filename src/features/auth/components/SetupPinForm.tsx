"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setupPinAction } from "@/features/auth/actions/auth.actions";
import { rememberPinLoginPreference } from "@/features/auth/lib/pin-preference";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { PinDots } from "@/features/auth/components/PinDots";
import { PinKeypad } from "@/features/auth/components/PinKeypad";
import { Button } from "@/components/ui/button";

type Step = "enter" | "confirm";

interface SetupPinFormProps {
  mode?: "setup" | "reset";
}

export function SetupPinForm({ mode = "setup" }: SetupPinFormProps) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>("enter");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  const activePin = step === "enter" ? pin : confirmPin;
  const setActivePin = step === "enter" ? setPin : setConfirmPin;

  const handleContinue = async () => {
    if (step === "enter") {
      if (pin.length !== 6) {
        toast.error("PIN must be 6 digits.");
        return;
      }
      setStep("confirm");
      return;
    }

    if (confirmPin !== pin) {
      toast.error("PINs do not match.");
      setConfirmPin("");
      return;
    }

    setLoading(true);
    const action = mode === "reset"
      ? (await import("@/features/auth/actions/auth.actions")).resetPinAction
      : setupPinAction;

    const result = await action({ pin, confirmPin });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message ?? "PIN saved.");
    rememberPinLoginPreference(user?.email ?? profile?.email ?? undefined);
    router.push("/dashboard");
    router.refresh();
  };

  const handleBack = () => {
    setStep("enter");
    setConfirmPin("");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">
          {step === "enter"
            ? "Choose a 6-digit numeric PIN for fast login."
            : "Confirm your PIN to continue."}
        </p>
        <PinDots length={activePin.length} />
      </div>

      <PinKeypad value={activePin} onChange={setActivePin} disabled={loading} />

      <div className="flex gap-3">
        {step === "confirm" && (
          <Button type="button" variant="outline" className="flex-1" onClick={handleBack}>
            Back
          </Button>
        )}
        <Button
          type="button"
          className="flex-1"
          disabled={loading || activePin.length !== 6}
          onClick={handleContinue}
        >
          {loading
            ? "Saving…"
            : step === "enter"
              ? "Continue"
              : mode === "reset"
                ? "Reset PIN"
                : "Save PIN"}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  changePinSchema,
  type ChangePinInput,
} from "@/features/auth/schemas/auth.schemas";
import {
  changePinAction,
  disablePinAction,
  logoutAction,
} from "@/features/auth/actions/auth.actions";
import { clearPinLoginPreference } from "@/features/auth/lib/pin-preference";
import type { Profile } from "@/features/auth/types/database.types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PinDots } from "@/features/auth/components/PinDots";
import { PinKeypad } from "@/features/auth/components/PinKeypad";
import { MfaSettingsCard } from "@/features/auth/components/MfaSettingsCard";

interface DashboardClientProps {
  profile: Profile;
  email: string;
}

const s: Record<string, CSSProperties> = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  bodyText: {
    marginBottom: 24,
  },
  cardGrid: {
    display: "grid",
    gap: 24,
  },
  statusBox: {
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--muted, rgba(148,163,184,0.08))",
    padding: "12px 16px",
    fontSize: 14,
    color: "var(--foreground)",
  },
  statusEnabled: {
    color: "#22c55e",
  },
  statusDisabled: {
    color: "var(--muted-foreground)",
  },
  pinFlow: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  pinPrompt: {
    textAlign: "center",
    fontSize: 14,
    color: "var(--muted-foreground)",
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  btnRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
};

export function DashboardClient({ profile, email }: DashboardClientProps) {
  const router = useRouter();
  const [pinStep, setPinStep] = useState<"idle" | "current" | "new" | "confirm">("idle");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const handleDisablePin = async () => {
    const result = await disablePinAction();
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    clearPinLoginPreference();
    toast.success(result.message);
    router.refresh();
  };

  const handlePinFlow = async () => {
    if (pinStep === "idle") {
      setPinStep("current");
      return;
    }

    if (pinStep === "current") {
      if (currentPin.length !== 6) {
        toast.error("Enter your current 6-digit PIN.");
        return;
      }
      setPinStep("new");
      return;
    }

    if (pinStep === "new") {
      if (newPin.length !== 6) {
        toast.error("Enter a new 6-digit PIN.");
        return;
      }
      setPinStep("confirm");
      return;
    }

    if (confirmNewPin !== newPin) {
      toast.error("PINs do not match.");
      setConfirmNewPin("");
      return;
    }

    const payload: ChangePinInput = {
      currentPin,
      newPin,
      confirmNewPin,
    };

    const parsed = changePinSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid PIN");
      return;
    }

    setPinLoading(true);
    const result = await changePinAction(parsed.data);
    setPinLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    setPinStep("idle");
    setCurrentPin("");
    setNewPin("");
    setConfirmNewPin("");
    router.refresh();
  };

  const activePinValue =
    pinStep === "current"
      ? currentPin
      : pinStep === "new"
        ? newPin
        : pinStep === "confirm"
          ? confirmNewPin
          : "";

  const setActivePinValue = (value: string) => {
    if (pinStep === "current") setCurrentPin(value);
    else if (pinStep === "new") setNewPin(value);
    else if (pinStep === "confirm") setConfirmNewPin(value);
  };

  return (
    <div style={s.wrap}>
      <div className="axion-kicker">Security</div>
      <h2 className="axion-title">PIN & session</h2>
      <p className="axion-body" style={s.bodyText}>
        Manage PIN login and sign out for {email}.
      </p>

      <div style={s.cardGrid}>
        <Card className="auth-glass" style={{ borderColor: "var(--border)" }}>
          <CardHeader>
            <CardTitle>PIN Login</CardTitle>
            <CardDescription>
              {profile.has_pin
                ? "Fast PIN login is enabled for your account."
                : "PIN login is not set up yet."}
            </CardDescription>
          </CardHeader>
          <CardContent style={s.cardContent}>
            <div style={s.statusBox}>
              Status:{" "}
              <span style={profile.has_pin ? s.statusEnabled : s.statusDisabled}>
                {profile.has_pin ? "Enabled" : "Disabled"}
              </span>
            </div>

            {profile.has_pin && pinStep !== "idle" && (
              <div style={s.pinFlow}>
                <p style={s.pinPrompt}>
                  {pinStep === "current" && "Enter current PIN"}
                  {pinStep === "new" && "Enter new PIN"}
                  {pinStep === "confirm" && "Confirm new PIN"}
                </p>
                <PinDots length={activePinValue.length} />
                <PinKeypad
                  value={activePinValue}
                  onChange={setActivePinValue}
                  disabled={pinLoading}
                />
              </div>
            )}

            <div style={s.btnRow}>
              {profile.has_pin ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePinFlow}
                    disabled={pinLoading}
                  >
                    {pinStep === "idle" ? "Change PIN" : "Continue"}
                  </Button>
                  {pinStep !== "idle" && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setPinStep("idle");
                        setCurrentPin("");
                        setNewPin("");
                        setConfirmNewPin("");
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDisablePin}
                  >
                    Disable PIN
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => router.push("/auth/setup-pin")}
                >
                  Set up PIN
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="auth-glass" style={{ borderColor: "var(--border)" }}>
          <CardHeader>
            <CardTitle>Authenticator MFA</CardTitle>
            <CardDescription>
              Require a one-time code after password login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MfaSettingsCard />
          </CardContent>
        </Card>

        <Card className="auth-glass" style={{ borderColor: "var(--border)" }}>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Sign out of your account on this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={logoutAction}>
              <Button type="submit" variant="outline">
                Log out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
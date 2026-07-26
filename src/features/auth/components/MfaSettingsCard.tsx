"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  enrollMfaAction,
  unenrollMfaAction,
  verifyMfaEnrollmentAction,
} from "@/features/auth/actions/mfa.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MfaSettingsCard() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [enabledFactorId, setEnabledFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find((f) => f.status === "verified");
      setEnabledFactorId(verified?.id ?? null);
    })();
  }, []);

  const startEnroll = async () => {
    setLoading(true);
    const result = await enrollMfaAction();
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setFactorId(result.data.factorId);
    setQrCode(result.data.qrCode);
    setSecret(result.data.secret);
  };

  const confirmEnroll = async () => {
    if (!factorId) return;
    setLoading(true);
    const result = await verifyMfaEnrollmentAction({ factorId, code });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "MFA enabled");
    setEnabledFactorId(factorId);
    setFactorId(null);
    setQrCode(null);
    setSecret(null);
    setCode("");
  };

  const removeMfa = async () => {
    if (!enabledFactorId) return;
    setLoading(true);
    const result = await unenrollMfaAction(enabledFactorId);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "MFA removed");
    setEnabledFactorId(null);
  };

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold">Multi-factor authentication</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add an authenticator app (TOTP) for a second factor after password
          login.
        </p>
      </div>

      {enabledFactorId ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-emerald-500">MFA enabled</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={removeMfa}
          >
            Disable MFA
          </Button>
        </div>
      ) : qrCode && factorId ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Scan this QR code, then enter the 6-digit code to confirm.
          </p>
          <div className="overflow-hidden rounded-lg bg-white p-3 w-fit">
            {/* qrCode from Supabase is an SVG data URL / markup */}
            {qrCode.startsWith("data:") || qrCode.startsWith("http") ? (
              <Image src={qrCode} alt="MFA QR code" width={180} height={180} />
            ) : (
              <div
                className="h-[180px] w-[180px] [&_svg]:h-full [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
            )}
          </div>
          {secret ? (
            <p className="break-all font-mono text-xs text-muted-foreground">
              Secret: {secret}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="mfa-enroll-code">Authentication code</Label>
            <Input
              id="mfa-enroll-code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={loading || code.length !== 6}
            onClick={confirmEnroll}
          >
            Confirm MFA
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" disabled={loading} onClick={startEnroll}>
          Enable MFA
        </Button>
      )}
    </div>
  );
}

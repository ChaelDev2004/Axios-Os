"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { verifyMfaLoginAction } from "@/features/auth/actions/mfa.actions";

export default function MfaVerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const result = await verifyMfaLoginAction({ code: code.trim() });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Verified");
    router.replace(result.data?.redirectTo ?? "/dashboard");
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur"
      >
        <h1 className="text-xl font-semibold text-white">Two-factor authentication</h1>
        <p className="text-sm text-white/60">
          Enter the 6-digit code from your authenticator app to continue.
        </p>
        <label className="block text-xs uppercase tracking-wider text-white/50">
          Authentication code
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-lg tracking-[0.3em] text-white outline-none focus:border-lime-300"
            placeholder="000000"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full rounded-lg bg-[#CCFF00] px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-black disabled:opacity-50"
        >
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>
    </main>
  );
}

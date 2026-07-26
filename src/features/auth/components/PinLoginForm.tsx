"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Delete } from "lucide-react";
import { toast } from "sonner";

import { pinLoginAction } from "@/features/auth/actions/auth.actions";
import {
  getRememberedLoginEmail,
  rememberPinLoginPreference,
} from "@/features/auth/lib/pin-preference";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;
const MAX_PIN = 6;

export function PinLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    setEmail(getRememberedLoginEmail());
  }, []);

  const handleSubmit = useCallback(
    async (nextPin?: string) => {
      if (submittingRef.current) return;

      const activePin = nextPin ?? pin;
      const trimmedEmail = email.trim() || getRememberedLoginEmail();

      if (!trimmedEmail) {
        toast.error("Sign in with email once, then you can unlock with PIN only.");
        return;
      }
      if (activePin.length !== MAX_PIN) {
        return;
      }

      submittingRef.current = true;
      setLoading(true);
      try {
        const result = await pinLoginAction({
          email: trimmedEmail,
          pin: activePin,
        });
        if (!result.success) {
          toast.error(result.error);
          setPin("");
          return;
        }

        rememberPinLoginPreference(trimmedEmail);
        toast.success("Welcome back!");
        router.push(result.data.redirectTo);
        router.refresh();
      } catch {
        toast.error("Something went wrong. Please try again.");
        setPin("");
      } finally {
        submittingRef.current = false;
        setLoading(false);
      }
    },
    [email, pin, router]
  );

  const pressKey = (key: (typeof KEYS)[number]) => {
    if (loading || submittingRef.current) return;
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (!key || pin.length >= MAX_PIN) return;

    const next = `${pin}${key}`;
    setPin(next);
    if (next.length === MAX_PIN) {
      void handleSubmit(next);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (loading || submittingRef.current) return;
      if (event.key === "Backspace") {
        event.preventDefault();
        setPin((p) => p.slice(0, -1));
        return;
      }
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        setPin((prev) => {
          if (prev.length >= MAX_PIN) return prev;
          const next = `${prev}${event.key}`;
          if (next.length === MAX_PIN) {
            queueMicrotask(() => void handleSubmit(next));
          }
          return next;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSubmit, loading]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col items-center gap-3 py-2">
        <p className="text-sm text-zinc-400">Enter your 6-digit PIN</p>
        {email ? (
          <p className="max-w-full truncate text-xs text-zinc-500">{email}</p>
        ) : (
          <p className="text-center text-xs text-amber-400/90">
            No saved account yet — use email login once first.
          </p>
        )}
        <div
          className="flex items-center justify-center gap-3 pt-2"
          aria-label={`PIN entry: ${pin.length} of ${MAX_PIN} digits`}
          role="status"
        >
          {Array.from({ length: MAX_PIN }).map((_, index) => (
            <span
              key={index}
              className={[
                "h-3 w-3 rounded-full border transition-all duration-200",
                index < pin.length
                  ? "scale-110 border-blue-500 bg-blue-500"
                  : "border-zinc-500 bg-transparent",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      <div
        className="grid grid-cols-3 gap-3"
        role="group"
        aria-label="PIN keypad"
      >
        {KEYS.map((key, index) => {
          if (key === "") {
            return <div key={`empty-${index}`} />;
          }

          const isDelete = key === "del";

          return (
            <button
              key={key}
              type="button"
              disabled={loading}
              aria-label={isDelete ? "Delete digit" : `Digit ${key}`}
              onClick={() => pressKey(key)}
              className="flex h-14 touch-manipulation items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/70 text-lg font-semibold text-zinc-100 transition hover:bg-zinc-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:h-16 sm:text-xl"
            >
              {isDelete ? <Delete className="h-5 w-5 text-zinc-300" /> : key}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-center text-sm font-medium text-zinc-400">Signing in…</p>
      ) : null}
    </div>
  );
}

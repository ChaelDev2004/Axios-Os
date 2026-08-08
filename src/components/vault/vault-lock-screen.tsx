"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { useVaultLockStore } from "@/features/vault/stores/vault-lock.store";
import type { VaultAutoLockMinutes } from "@/features/vault/types";

const AUTO_LOCK_OPTIONS: Array<{ value: VaultAutoLockMinutes; label: string }> = [
  { value: 1, label: "1 minute" },
  { value: 5, label: "5 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 0, label: "Never" },
];

const shell: CSSProperties = {
  display: "flex",
  minHeight: "min(70vh, 560px)",
  alignItems: "center",
  justifyContent: "center",
};

const card: CSSProperties = {
  width: "min(100%, 380px)",
  display: "flex",
  flexDirection: "column",
  gap: 18,
  padding: "28px 24px",
  borderRadius: 20,
  border: "1px solid var(--border)",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--foreground) 4%, transparent), transparent)",
  textAlign: "center",
};

const pinInput: CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
  color: "var(--foreground)",
  textAlign: "center",
  fontSize: 22,
  letterSpacing: "0.45em",
  outline: "none",
};

const primaryBtn: CSSProperties = {
  height: 44,
  borderRadius: 12,
  border: "none",
  background: "#6366f1",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

export function VaultLockScreen() {
  const ready = useVaultLockStore((s) => s.ready);
  const hasSetup = useVaultLockStore((s) => s.hasSetup);
  const error = useVaultLockStore((s) => s.error);
  const bootstrap = useVaultLockStore((s) => s.bootstrap);
  const setupPin = useVaultLockStore((s) => s.setupPin);
  const unlock = useVaultLockStore((s) => s.unlock);
  const autoLockMinutes = useVaultLockStore((s) => s.autoLockMinutes);
  const setAutoLockMinutes = useVaultLockStore((s) => s.setAutoLockMinutes);

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (!hasSetup) {
        if (pin !== confirm) return;
        await setupPin(pin);
      } else {
        await unlock(pin);
      }
    } finally {
      setBusy(false);
      setPin("");
      setConfirm("");
    }
  };

  if (!ready) {
    return (
      <div className="axion-card" style={shell}>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Loading vault…</p>
      </div>
    );
  }

  return (
    <div className="axion-card" style={shell}>
      <form onSubmit={(e) => void onSubmit(e)} style={card}>
        <div
          style={{
            margin: "0 auto",
            width: 56,
            height: 56,
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            background: "rgba(99,102,241,0.18)",
            color: "#a5b4fc",
          }}
        >
          {hasSetup ? <Lock style={{ width: 24, height: 24 }} /> : <ShieldCheck style={{ width: 24, height: 24 }} />}
        </div>
        <div>
          <div className="axion-kicker">AXION VAULT</div>
          <h2 className="axion-subtitle" style={{ marginTop: 6 }}>
            {hasSetup ? "Vault Locked" : "Create Vault PIN"}
          </h2>
          <p className="axion-body" style={{ marginTop: 8, fontSize: 13 }}>
            {hasSetup
              ? "Enter your PIN to unlock encrypted credentials."
              : "Set a 4–8 digit PIN. This unlocks encryption for your secrets."}
          </p>
        </div>

        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="••••"
          style={pinInput}
          aria-label="Vault PIN"
        />

        {!hasSetup ? (
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="Confirm PIN"
            style={pinInput}
            aria-label="Confirm Vault PIN"
          />
        ) : null}

        {hasSetup ? (
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, textAlign: "left", color: "var(--muted-foreground)" }}>
            Auto-lock
            <select
              value={autoLockMinutes}
              onChange={(e) => void setAutoLockMinutes(Number(e.target.value) as VaultAutoLockMinutes)}
              style={{
                height: 40,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
                color: "var(--foreground)",
                padding: "0 10px",
              }}
            >
              {AUTO_LOCK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {error ? (
          <p style={{ margin: 0, color: "#fca5a5", fontSize: 13 }} role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || pin.length < 4 || (!hasSetup && pin !== confirm)}
          style={{
            ...primaryBtn,
            opacity: busy || pin.length < 4 || (!hasSetup && pin !== confirm) ? 0.55 : 1,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {hasSetup ? "Unlock" : "Create & Unlock"}
        </button>
      </form>
    </div>
  );
}

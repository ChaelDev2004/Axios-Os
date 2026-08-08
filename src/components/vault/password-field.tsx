"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Copy, Eye, EyeOff, Wand2 } from "lucide-react";
import { copySecure } from "@/features/vault/lib/clipboard";

type PasswordFieldProps = {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  autoHideMs?: number;
  onGenerateClick?: () => void;
  showGenerate?: boolean;
  showCopy?: boolean;
  label?: string;
  id?: string;
};

const inputWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
  padding: "0 8px 0 12px",
  minHeight: 42,
};

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "var(--foreground)",
  fontSize: 14,
  padding: "10px 0",
};

export function PasswordField({
  value,
  onChange,
  readOnly = false,
  placeholder = "••••••••••••",
  autoHideMs = 12_000,
  onGenerateClick,
  showGenerate = false,
  showCopy = true,
  label,
  id,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!visible || autoHideMs <= 0) return;
    const timer = window.setTimeout(() => setVisible(false), autoHideMs);
    return () => window.clearTimeout(timer);
  }, [visible, autoHideMs, value]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label ? (
        <label htmlFor={id} style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--muted-foreground)" }}>
          {label}
        </label>
      ) : null}
      <div style={inputWrap}>
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onChange?.(e.target.value)}
          style={inputStyle}
        />
        <button
          type="button"
          className="vault-icon-btn"
          style={{ background: "transparent", border: "none" }}
          aria-label={visible ? "Hide secret" : "Show secret"}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </button>
        {showCopy ? (
          <button
            type="button"
            className="vault-icon-btn"
            style={{ background: "transparent", border: "none" }}
            aria-label="Copy"
            onClick={() => void copySecure(value, "Password")}
          >
            <Copy aria-hidden />
          </button>
        ) : null}
        {showGenerate ? (
          <button
            type="button"
            className="vault-icon-btn"
            style={{ background: "transparent", border: "none" }}
            aria-label="Generate password"
            onClick={onGenerateClick}
          >
            <Wand2 aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}

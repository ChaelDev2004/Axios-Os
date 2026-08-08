"use client";

import { useState, type CSSProperties } from "react";
import { Copy, RefreshCw } from "lucide-react";
import {
  DEFAULT_PASSWORD_OPTIONS,
  generatePassword,
  type PasswordGeneratorOptions,
} from "@/features/vault/lib/password-generator";
import { copySecure } from "@/features/vault/lib/clipboard";

type PasswordGeneratorProps = {
  onUse: (password: string) => void;
  onClose: () => void;
};

const panel: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: 16,
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "color-mix(in srgb, var(--background) 92%, #6366f1)",
};

export function PasswordGenerator({ onUse, onClose }: PasswordGeneratorProps) {
  const [options, setOptions] = useState<PasswordGeneratorOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [preview, setPreview] = useState(() => generatePassword(DEFAULT_PASSWORD_OPTIONS));

  const regenerate = (next = options) => {
    setPreview(generatePassword(next));
  };

  return (
    <div style={panel} role="dialog" aria-label="Password generator">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 14 }}>Password generator</strong>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--muted-foreground)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Close
        </button>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
        Length: {options.length}
        <input
          type="range"
          min={12}
          max={32}
          value={options.length}
          onChange={(e) => {
            const next = { ...options, length: Number(e.target.value) };
            setOptions(next);
            regenerate(next);
          }}
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
        {(
          [
            ["uppercase", "Uppercase"],
            ["lowercase", "Lowercase"],
            ["numbers", "Numbers"],
            ["symbols", "Symbols"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={options[key]}
              onChange={(e) => {
                const next = { ...options, [key]: e.target.checked };
                setOptions(next);
                regenerate(next);
              }}
              style={{ accentColor: "#6366f1" }}
            />
            {label}
          </label>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 13,
          wordBreak: "break-all",
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>{preview}</span>
        <button
          type="button"
          aria-label="Regenerate"
          onClick={() => regenerate()}
          style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted-foreground)" }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} />
        </button>
        <button
          type="button"
          aria-label="Copy generated password"
          onClick={() => void copySecure(preview, "Password")}
          style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted-foreground)" }}
        >
          <Copy style={{ width: 14, height: 14 }} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onUse(preview)}
        style={{
          height: 40,
          borderRadius: 12,
          border: "none",
          background: "#6366f1",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Use password
      </button>
    </div>
  );
}

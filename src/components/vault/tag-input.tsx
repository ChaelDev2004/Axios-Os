"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { MAX_VAULT_TAGS } from "@/features/vault/types";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

const wrap: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
  minHeight: 42,
  padding: "6px 10px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
};

export function TagInput({ tags, onChange }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const value = raw.trim().toLowerCase().replace(/,/g, "");
    if (!value) return;
    if (tags.includes(value)) {
      setDraft("");
      return;
    }
    if (tags.length >= MAX_VAULT_TAGS) return;
    onChange([...tags, value]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div style={wrap}>
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            borderRadius: 999,
            border: "1px solid var(--border)",
            padding: "2px 8px",
            fontSize: 12,
            background: "rgba(99,102,241,0.12)",
            color: "#c7d2fe",
          }}
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit", display: "inline-flex", padding: 0 }}
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={tags.length ? "" : "dev, work"}
        disabled={tags.length >= MAX_VAULT_TAGS}
        style={{
          flex: 1,
          minWidth: 80,
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--foreground)",
          fontSize: 14,
          padding: "4px 0",
        }}
      />
    </div>
  );
}

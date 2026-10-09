import type { CSSProperties } from "react";

import {
  CATEGORIES,
  normalizeCategoryKey,
  type CategoryDef,
} from "@/features/finance/lib/categories";
import type { TransactionType } from "@/features/auth/types/database.types";

export function categoryBadgeStyle(color: string, size: "sm" | "md"): CSSProperties {
  return {
    display: "inline-flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    height: size === "sm" ? 32 : 40,
    width: size === "sm" ? 32 : 40,
    background: `${color}22`,
    border: `1px solid ${color}44`,
    color,
  };
}

export function CategoryIconBadge({ category, size = "md" }: { category: CategoryDef; size?: "sm" | "md" }) {
  return <span style={categoryBadgeStyle(category.color, size)}>{category.icon}</span>;
}

export function CategoryPicker({
  type,
  value,
  onChange,
}: {
  type: TransactionType;
  value: string;
  onChange: (label: string) => void;
}) {
  const options = CATEGORIES.filter((c) => c.types.includes(type));

  return (
    <div
      className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(130px,1fr))]"
      style={{
        marginTop: 8,
      }}
    >
      {options.map((c) => {
        const selected =
          normalizeCategoryKey(value) === c.id || normalizeCategoryKey(value) === c.label.toLowerCase();
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.label)}
            aria-pressed={selected}
            className="flex min-w-0 items-center gap-2.5"
            style={{
              borderRadius: 12,
              padding: "10px 12px",
              textAlign: "left",
              fontSize: 14,
              cursor: "pointer",
              border: selected ? "1px solid rgba(129,140,248,0.4)" : "1px solid rgba(255,255,255,0.08)",
              background: selected ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
              color: selected ? "#fff" : "var(--muted-foreground)",
              boxShadow: selected ? "0 0 0 1px rgba(129,140,248,0.25)" : "none",
            }}
          >
            <CategoryIconBadge category={c} size="sm" />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
              {c.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

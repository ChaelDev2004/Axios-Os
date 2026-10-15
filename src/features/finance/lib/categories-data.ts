import type { TransactionType } from "@/features/auth/types/database.types";

export interface CategoryMeta {
  id: string;
  label: string;
  color: string;
  types: TransactionType[];
}

export const CATEGORY_META: CategoryMeta[] = [
  { id: "salary", label: "Salary", color: "#34d399", types: ["income"] },
  { id: "freelance", label: "Freelance", color: "#60a5fa", types: ["income"] },
  { id: "business", label: "Business", color: "#818cf8", types: ["income"] },
  { id: "gift", label: "Gift", color: "#f472b6", types: ["income", "expense"] },
  { id: "food", label: "Food", color: "#fbbf24", types: ["expense"] },
  { id: "coffee", label: "Coffee", color: "#d6b48c", types: ["expense"] },
  { id: "transport", label: "Transport", color: "#38bdf8", types: ["expense"] },
  { id: "shopping", label: "Shopping", color: "#c084fc", types: ["expense"] },
  { id: "home", label: "Home", color: "#a78bfa", types: ["expense"] },
  { id: "tools", label: "Tools", color: "#818cf8", types: ["expense"] },
  { id: "health", label: "Health", color: "#fb7185", types: ["expense"] },
  { id: "education", label: "Education", color: "#2dd4bf", types: ["expense"] },
  { id: "savings", label: "Savings", color: "#4ade80", types: ["expense", "income"] },
  { id: "other", label: "Other", color: "#94a3b8", types: ["income", "expense"] },
];

export function normalizeCategoryKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function firstCategoryFor(type: TransactionType): string {
  return CATEGORY_META.find((c) => c.types.includes(type))?.label ?? "Other";
}

export function isCategoryAllowed(label: string, type: TransactionType): boolean {
  const key = normalizeCategoryKey(label);
  return CATEGORY_META.some(
    (c) => c.types.includes(type) && (c.id === key || c.label.toLowerCase() === key)
  );
}

export function findCategoryMeta(name: string | null | undefined): CategoryMeta | null {
  const key = normalizeCategoryKey(name);
  if (!key) return null;
  return CATEGORY_META.find((c) => c.id === key || c.label.toLowerCase() === key) ?? null;
}

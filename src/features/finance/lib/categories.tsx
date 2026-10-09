import type { ReactNode } from "react";
import {
  Banknote,
  Briefcase,
  Car,
  Coffee,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  MoreHorizontal,
  PiggyBank,
  ShoppingBag,
  Sparkles,
  Utensils,
  Wallet,
  Wifi,
} from "lucide-react";

import type { TransactionType } from "@/features/auth/types/database.types";

export type CategoryDef = {
  id: string;
  label: string;
  icon: ReactNode;
  color: string;
  types: TransactionType[];
};

export const CATEGORIES: CategoryDef[] = [
  { id: "salary", label: "Salary", icon: <Banknote style={{ height: 16, width: 16 }} />, color: "#34d399", types: ["income"] },
  { id: "freelance", label: "Freelance", icon: <Laptop style={{ height: 16, width: 16 }} />, color: "#60a5fa", types: ["income"] },
  { id: "business", label: "Business", icon: <Briefcase style={{ height: 16, width: 16 }} />, color: "#818cf8", types: ["income"] },
  { id: "gift", label: "Gift", icon: <Gift style={{ height: 16, width: 16 }} />, color: "#f472b6", types: ["income", "expense"] },
  { id: "food", label: "Food", icon: <Utensils style={{ height: 16, width: 16 }} />, color: "#fbbf24", types: ["expense"] },
  { id: "coffee", label: "Coffee", icon: <Coffee style={{ height: 16, width: 16 }} />, color: "#d6b48c", types: ["expense"] },
  { id: "transport", label: "Transport", icon: <Car style={{ height: 16, width: 16 }} />, color: "#38bdf8", types: ["expense"] },
  { id: "shopping", label: "Shopping", icon: <ShoppingBag style={{ height: 16, width: 16 }} />, color: "#c084fc", types: ["expense"] },
  { id: "home", label: "Home", icon: <Home style={{ height: 16, width: 16 }} />, color: "#a78bfa", types: ["expense"] },
  { id: "tools", label: "Tools", icon: <Wifi style={{ height: 16, width: 16 }} />, color: "#818cf8", types: ["expense"] },
  { id: "health", label: "Health", icon: <HeartPulse style={{ height: 16, width: 16 }} />, color: "#fb7185", types: ["expense"] },
  { id: "education", label: "Education", icon: <GraduationCap style={{ height: 16, width: 16 }} />, color: "#2dd4bf", types: ["expense"] },
  { id: "savings", label: "Savings", icon: <PiggyBank style={{ height: 16, width: 16 }} />, color: "#4ade80", types: ["expense", "income"] },
  { id: "other", label: "Other", icon: <MoreHorizontal style={{ height: 16, width: 16 }} />, color: "#94a3b8", types: ["income", "expense"] },
];

export function normalizeCategoryKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function resolveCategory(name: string | null | undefined): CategoryDef {
  const key = normalizeCategoryKey(name);
  if (!key) {
    return {
      id: "uncategorized",
      label: "Uncategorized",
      icon: <Sparkles style={{ height: 16, width: 16 }} />,
      color: "#94a3b8",
      types: ["income", "expense"],
    };
  }
  const found = CATEGORIES.find((c) => c.id === key || c.label.toLowerCase() === key);
  if (found) return found;
  return {
    id: key,
    label: name!.trim(),
    icon: <Wallet style={{ height: 16, width: 16 }} />,
    color: "#64748b",
    types: ["income", "expense"],
  };
}

export function firstCategoryFor(type: TransactionType): string {
  return CATEGORIES.find((c) => c.types.includes(type))?.label ?? "Other";
}

export function isCategoryAllowed(label: string, type: TransactionType): boolean {
  const key = normalizeCategoryKey(label);
  return CATEGORIES.some(
    (c) => c.types.includes(type) && (c.id === key || c.label.toLowerCase() === key)
  );
}

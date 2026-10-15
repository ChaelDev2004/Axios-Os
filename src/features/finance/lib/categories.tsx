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

import {
  CATEGORY_META,
  findCategoryMeta,
  firstCategoryFor,
  isCategoryAllowed,
  normalizeCategoryKey,
  type CategoryMeta,
} from "@/features/finance/lib/categories-data";

export type CategoryDef = CategoryMeta & { icon: ReactNode };

const ICON_STYLE = { height: 16, width: 16 };

const CATEGORY_ICONS: Record<string, ReactNode> = {
  salary: <Banknote style={ICON_STYLE} />,
  freelance: <Laptop style={ICON_STYLE} />,
  business: <Briefcase style={ICON_STYLE} />,
  gift: <Gift style={ICON_STYLE} />,
  food: <Utensils style={ICON_STYLE} />,
  coffee: <Coffee style={ICON_STYLE} />,
  transport: <Car style={ICON_STYLE} />,
  shopping: <ShoppingBag style={ICON_STYLE} />,
  home: <Home style={ICON_STYLE} />,
  tools: <Wifi style={ICON_STYLE} />,
  health: <HeartPulse style={ICON_STYLE} />,
  education: <GraduationCap style={ICON_STYLE} />,
  savings: <PiggyBank style={ICON_STYLE} />,
  other: <MoreHorizontal style={ICON_STYLE} />,
};

export const CATEGORIES: CategoryDef[] = CATEGORY_META.map((category) => ({
  ...category,
  icon: CATEGORY_ICONS[category.id] ?? <Wallet style={ICON_STYLE} />,
}));

export function resolveCategory(name: string | null | undefined): CategoryDef {
  const found = findCategoryMeta(name);
  if (!found) {
    const key = normalizeCategoryKey(name);
    if (!key) {
      return {
        id: "uncategorized",
        label: "Uncategorized",
        icon: <Sparkles style={ICON_STYLE} />,
        color: "#94a3b8",
        types: ["income", "expense"],
      };
    }
    return {
      id: key,
      label: name!.trim(),
      icon: <Wallet style={ICON_STYLE} />,
      color: "#64748b",
      types: ["income", "expense"],
    };
  }

  return {
    ...found,
    icon: CATEGORY_ICONS[found.id] ?? <Wallet style={ICON_STYLE} />,
  };
}

export { firstCategoryFor, isCategoryAllowed, normalizeCategoryKey };

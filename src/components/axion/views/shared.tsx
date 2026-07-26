"use client";

import { useEffect, useState } from "react";
import { useMotionValueEvent, useSpring, useTransform } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString("en-PH"));
  const [text, setText] = useState("0");

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useMotionValueEvent(display, "change", (v) => setText(v));

  return <span>{text}</span>;
}

export function DashboardSkeleton() {
  return (
    <div className="axion-stack">
      <Skeleton className="h-48 w-full rounded-3xl" />
      <div className="axion-grid-3">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-3xl" />
    </div>
  );
}

export function greetingForHour(h: number) {
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function isSameDay(iso: string | null | undefined, day = todayKey()) {
  if (!iso) return false;
  return iso.slice(0, 10) === day;
}

export function normalizePriority(priority: string): "low" | "medium" | "high" {
  const p = priority.toLowerCase();
  if (p === "high") return "high";
  if (p === "low") return "low";
  return "medium";
}

export function priorityBadgeClass(priority: string) {
  const p = normalizePriority(priority);
  return cn(
    "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
    p === "high" && "bg-red-500/15 text-red-300",
    p === "medium" && "bg-amber-500/15 text-amber-300",
    p === "low" && "bg-emerald-500/15 text-emerald-300"
  );
}

export type KanbanColumnId = "todo" | "in_progress" | "done";

export function taskColumn(task: {
  status: string;
  completed: boolean;
}): KanbanColumnId {
  if (task.completed || task.status === "done") return "done";
  const s = task.status.toLowerCase();
  if (s === "in_progress" || s === "doing" || s === "progress" || s === "review") {
    return "in_progress";
  }
  return "todo";
}

export function columnToStatus(col: KanbanColumnId): {
  status: string;
  completed: boolean;
} {
  if (col === "done") return { status: "done", completed: true };
  if (col === "in_progress") return { status: "in_progress", completed: false };
  return { status: "todo", completed: false };
}

export function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || `item-${Date.now()}`
  );
}

"use client";

import { cn } from "@/lib/utils";

interface PinDotsProps {
  length: number;
  maxLength?: number;
  className?: string;
}

export function PinDots({ length, maxLength = 6, className }: PinDotsProps) {
  return (
    <div
      className={cn("flex items-center justify-center gap-3", className)}
      aria-label={`PIN entry: ${length} of ${maxLength} digits`}
      role="status"
    >
      {Array.from({ length: maxLength }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-3 w-3 rounded-full border transition-all duration-200",
            index < length
              ? "scale-110 border-primary bg-primary"
              : "border-muted-foreground/40 bg-transparent"
          )}
        />
      ))}
    </div>
  );
}

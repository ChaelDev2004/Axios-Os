"use client";

import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PinKeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export function PinKeypad({
  value,
  onChange,
  maxLength = 6,
  disabled = false,
}: PinKeypadProps) {
  const handlePress = (key: (typeof KEYS)[number]) => {
    if (disabled) return;

    if (key === "del") {
      onChange(value.slice(0, -1));
      return;
    }

    if (!key || value.length >= maxLength) return;
    onChange(`${value}${key}`);
  };

  return (
    <div
      className="grid grid-cols-3 gap-3"
      role="group"
      aria-label="PIN keypad"
    >
      {KEYS.map((key, index) => {
        if (key === "") {
          return <div key={`empty-${index}`} />;
        }

        const isDelete = key === "del";

        return (
          <Button
            key={key}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={isDelete ? "Delete digit" : `Digit ${key}`}
            className={cn(
              "h-14 text-lg font-semibold sm:h-16 sm:text-xl",
              "touch-manipulation active:scale-95"
            )}
            onClick={() => handlePress(key)}
          >
            {isDelete ? <Delete className="h-5 w-5" /> : key}
          </Button>
        );
      })}
    </div>
  );
}

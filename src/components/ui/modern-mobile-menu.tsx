"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
} from "react";
import { Home, Briefcase, Calendar, Shield, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

type IconComponentType = ElementType<{ className?: string }>;

export interface InteractiveMenuItem {
  label: string;
  icon: IconComponentType;
}

export interface InteractiveMenuProps {
  items?: InteractiveMenuItem[];
  accentColor?: string;
  /** Controlled active index. Pass `-1` for none. */
  activeIndex?: number;
  onItemSelect?: (index: number) => void;
  className?: string;
}

const defaultItems: InteractiveMenuItem[] = [
  { label: "home", icon: Home },
  { label: "strategy", icon: Briefcase },
  { label: "period", icon: Calendar },
  { label: "security", icon: Shield },
  { label: "settings", icon: Settings },
];

const defaultAccentColor = "var(--component-active-color-default)";

export function InteractiveMenu({
  items,
  accentColor,
  activeIndex: activeIndexProp,
  onItemSelect,
  className,
}: InteractiveMenuProps) {
  const finalItems = useMemo(() => {
    const isValid =
      items && Array.isArray(items) && items.length >= 2 && items.length <= 5;
    if (!isValid) {
      return defaultItems;
    }
    return items;
  }, [items]);

  const [uncontrolledIndex, setUncontrolledIndex] = useState(0);
  const isControlled = activeIndexProp !== undefined;
  const activeIndex = isControlled ? activeIndexProp : uncontrolledIndex;

  useEffect(() => {
    if (isControlled) return;
    if (uncontrolledIndex >= finalItems.length) {
      setUncontrolledIndex(0);
    }
  }, [finalItems, uncontrolledIndex, isControlled]);

  const textRefs = useRef<(HTMLElement | null)[]>([]);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const setLineWidth = () => {
      if (activeIndex < 0) return;
      const activeItemElement = itemRefs.current[activeIndex];
      const activeTextElement = textRefs.current[activeIndex];

      if (activeItemElement && activeTextElement) {
        const textWidth = activeTextElement.offsetWidth;
        activeItemElement.style.setProperty("--lineWidth", `${textWidth}px`);
      }
    };

    setLineWidth();
    window.addEventListener("resize", setLineWidth);
    return () => window.removeEventListener("resize", setLineWidth);
  }, [activeIndex, finalItems]);

  const handleItemClick = (index: number) => {
    if (!isControlled) setUncontrolledIndex(index);
    onItemSelect?.(index);
  };

  const navStyle = useMemo(() => {
    const activeColor = accentColor || defaultAccentColor;
    return { "--component-active-color": activeColor } as CSSProperties;
  }, [accentColor]);

  return (
    <nav
      className={cn("menu interactive-menu", className)}
      role="navigation"
      aria-label="Primary"
      style={navStyle}
    >
      {finalItems.map((item, index) => {
        const isActive = index === activeIndex;
        const IconComponent = item.icon;

        return (
          <button
            key={item.label}
            type="button"
            className={cn("menu__item", isActive && "active")}
            onClick={() => handleItemClick(index)}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            style={{ "--lineWidth": "0px" } as CSSProperties}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
          >
            <div className="menu__icon">
              <IconComponent className="icon" aria-hidden />
            </div>
            <strong
              className={cn("menu__text", isActive && "active")}
              ref={(el) => {
                textRefs.current[index] = el;
              }}
            >
              {item.label}
            </strong>
          </button>
        );
      })}
    </nav>
  );
}

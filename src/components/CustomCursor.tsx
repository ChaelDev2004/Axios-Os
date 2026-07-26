"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR =
  "button, a, input, textarea, select, label, [role='button'], .menu-item";

export default function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -200, y: -200 });
  const currentRef = useRef({ x: -200, y: -200 });
  const hoveringRef = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove);

    const isDarkSurface = () =>
      document.documentElement.classList.contains("dark") ||
      Boolean(document.querySelector(".axion.dark"));

    const cursorColor = () => (isDarkSurface() ? "#f8fafc" : "#0f172a");

    const expandRing = () => {
      if (!ringRef.current || hoveringRef.current) return;
      hoveringRef.current = true;
      ringRef.current.style.width = "40px";
      ringRef.current.style.height = "40px";
      ringRef.current.style.borderColor = cursorColor();
    };

    const shrinkRing = () => {
      if (!ringRef.current || !hoveringRef.current) return;
      hoveringRef.current = false;
      ringRef.current.style.width = "16px";
      ringRef.current.style.height = "16px";
      ringRef.current.style.borderColor = cursorColor();
    };

    const onPointerOver = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest(INTERACTIVE_SELECTOR);
      if (target) expandRing();
    };

    const onPointerOut = (e: PointerEvent) => {
      const from = (e.target as Element | null)?.closest(INTERACTIVE_SELECTOR);
      const to = (e.relatedTarget as Element | null)?.closest(INTERACTIVE_SELECTOR);
      if (from && !to) shrinkRing();
    };

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);

    let frame = 0;
    const animate = () => {
      const ring = ringRef.current;
      const dot = dotRef.current;
      if (ring && dot) {
        currentRef.current.x +=
          (mouseRef.current.x - currentRef.current.x) * 0.12;
        currentRef.current.y +=
          (mouseRef.current.y - currentRef.current.y) * 0.12;
        ring.style.left = `${currentRef.current.x}px`;
        ring.style.top = `${currentRef.current.y}px`;
        dot.style.left = `${mouseRef.current.x}px`;
        dot.style.top = `${mouseRef.current.y}px`;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
    };
  }, []);

  return (
    <>
      <div id="cursor" ref={ringRef} aria-hidden />
      <div id="cursor-dot" ref={dotRef} aria-hidden />
    </>
  );
}

"use client";

import { useEffect, type RefObject } from "react";

export function useAos(scopeRef?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = scopeRef?.current ?? document;
    const elements = root.querySelectorAll<HTMLElement>("[data-aos]");
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const el = entry.target as HTMLElement;
          const delay = el.dataset.aosDelay;
          const duration = el.dataset.aosDuration;

          if (delay) el.style.setProperty("--aos-delay", `${delay}ms`);
          if (duration) el.style.setProperty("--aos-duration", `${duration}ms`);

          el.classList.add("aos-animate");
          observer.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [scopeRef]);
}

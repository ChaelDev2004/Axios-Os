"use client";

import { useEffect, useMemo, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { usePortfolio } from "@/context/PortfolioContext";
import { DEFAULT_SITE_BRANDING } from "@/lib/site-branding-defaults";
import { useHeroContent } from "@/features/cms/hooks/use-hero-content";
import { DEFAULT_HERO_CONTENT } from "@/lib/hero-content-defaults";
import HeroInkReveal from "@/components/HeroInkReveal";

const ExperienceScene = dynamic(
  () => import("@/components/ui/experience-hero-scene"),
  { ssr: false }
);

type DeckItem =
  | { id: string; title: string; val: string; type: "progress" }
  | {
      id: string;
      title: string;
      val: string;
      type: "data";
      rows: Array<{ label: string; value: string }>;
    }
  | { id: string; title: string; val: string; type: "text" };

export function ExperienceHero() {
  const { openDrawer, setHeroVisible } = usePortfolio();
  const { data } = useHeroContent();
  const containerRef = useRef<HTMLElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  const brand = DEFAULT_SITE_BRANDING.appName;
  const stats = data?.stats ?? DEFAULT_HERO_CONTENT.stats;

  const deck: DeckItem[] = useMemo(
    () => [
      {
        id: "001",
        title: "AVAILABILITY",
        val: "Open",
        type: "progress",
      },
      {
        id: "002",
        title: "STUDIO STATS",
        val: `${stats[0]?.value ?? "50+"} Wins`,
        type: "data",
        rows: [
          { label: stats[0]?.label ?? "Projects", value: stats[0]?.value ?? "50+" },
          { label: stats[1]?.label ?? "Experience", value: stats[1]?.value ?? "5yr" },
        ],
      },
      {
        id: "003",
        title: "EXPERTISE",
        val: "Creative Dev",
        type: "text",
      },
    ],
    [stats]
  );

  useEffect(() => {
    const img = document.getElementById("imgWrap");
    if (img) {
      gsap.set(img, { opacity: 1, y: 0 });
    }
    setHeroVisible(true);
  }, [setHeroVisible]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const ctx = gsap.context(() => {
      if (!prefersReduced && revealRef.current) {
        gsap.fromTo(
          ".xp-hero-ui",
          { filter: "blur(24px)", opacity: 0, scale: 1.02 },
          {
            filter: "blur(0px)",
            opacity: 1,
            scale: 1,
            duration: 2,
            ease: "expo.out",
          }
        );

        gsap.from(".xp-command-cell", {
          x: 48,
          opacity: 0,
          stagger: 0.1,
          duration: 1.4,
          ease: "power4.out",
          delay: 0.85,
          clearProps: "all",
        });
      }

      const handleMouseMove = (e: MouseEvent) => {
        if (!ctaRef.current || prefersReduced) return;
        const rect = ctaRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        if (dist < 150) {
          gsap.to(ctaRef.current, {
            x: (e.clientX - cx) * 0.35,
            y: (e.clientY - cy) * 0.35,
            duration: 0.55,
          });
        } else {
          gsap.to(ctaRef.current, {
            x: 0,
            y: 0,
            duration: 0.8,
            ease: "elastic.out(1, 0.3)",
          });
        }
      };

      window.addEventListener("mousemove", handleMouseMove);
      return () => window.removeEventListener("mousemove", handleMouseMove);
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="hero xp-hero"
      id="hero"
      aria-label="Hero"
    >
      <div className="xp-hero-canvas" aria-hidden>
        <Suspense fallback={null}>
          <ExperienceScene />
        </Suspense>
      </div>

      <div ref={revealRef} className="xp-hero-inner">
        <div className="xp-hero-media" aria-hidden={false}>
          <HeroInkReveal />
        </div>

        <div className="xp-hero-left xp-hero-ui">
          <div className="xp-hero-brand">
            <span className="xp-hero-live">
              <span className="xp-hero-live-ping" />
            </span>
            <span className="xp-hero-brand-name">{brand}</span>
          </div>

          <div className="xp-hero-copy">
            <h1 className="xp-hero-title">
              CREATIVE
              <br />
              <span className="xp-hero-title-outline">AGENCY</span>
            </h1>
            <p className="xp-hero-sub">
              We engineer immersive digital experiences through spatial logic
              and advanced WebGL.
            </p>
          </div>

          <button
            ref={ctaRef}
            type="button"
            className="xp-hero-cta"
            onClick={openDrawer}
          >
            <span className="xp-hero-cta-orb" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 17L17 7M17 7H8M17 7V16"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="xp-hero-cta-label">Start a Project</span>
          </button>
        </div>

        <div className="xp-hero-deck xp-hero-ui">
          {deck.map((item) => (
            <div key={item.id} className="xp-command-cell xp-glass-panel">
              <span className="xp-cell-meta">
                {item.id}{" // "}{item.title}
              </span>
              {item.type === "progress" ? (
                <div className="xp-cell-progress">
                  <h4 className="xp-cell-value">{item.val}</h4>
                  <div className="xp-cell-bar">
                    <div className="xp-cell-bar-fill" />
                  </div>
                </div>
              ) : item.type === "data" ? (
                <div className="xp-cell-data">
                  {item.rows.map((row) => (
                    <div key={row.label} className="xp-cell-row">
                      <span>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <h3 className="xp-cell-text">
                  Transforming static interfaces into{" "}
                  <em>narrative apertures</em>.
                </h3>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ExperienceHero;

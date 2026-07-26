"use client";

import { STACK_BADGES } from "@/lib/constants";
import { usePortfolio } from "@/context/PortfolioContext";
import HeroInkReveal from "@/components/HeroInkReveal";
import RotatingWord from "@/components/RotatingWord";
import { ExperienceHero } from "@/components/ui/experience-hero";
import { useHeroContent } from "@/features/cms/hooks/use-hero-content";
import { DEFAULT_HERO_CONTENT, type HeroContent } from "@/lib/hero-content-defaults";

export default function Hero() {
  const { openDrawer, openPanel, theme } = usePortfolio();
  const { data } = useHeroContent();
  const content: HeroContent = data ?? {
    termTag: DEFAULT_HERO_CONTENT.termTag,
    headlineTop: DEFAULT_HERO_CONTENT.headlineTop,
    rotatingWords: [...DEFAULT_HERO_CONTENT.rotatingWords],
    bioName: DEFAULT_HERO_CONTENT.bioName,
    bioBody: DEFAULT_HERO_CONTENT.bioBody,
    stats: DEFAULT_HERO_CONTENT.stats.map((stat) => ({ ...stat })) as HeroContent["stats"],
  };

  if (theme === "dark") {
    return <ExperienceHero />;
  }

  return (
    <section className="hero" id="hero">
      <main>
        <div className="left-col">
          <div className="term-tag hero-content-item">{content.termTag}</div>
          <span className="headline-top hero-content-item">{content.headlineTop}</span>
          <RotatingWord words={content.rotatingWords} />
          <div className="stack-badges hero-content-item">
            {STACK_BADGES.map((badge) => (
              <span key={badge} className="badge">
                {badge}
              </span>
            ))}
          </div>
          <button
            type="button"
            className="btn-view hero-content-item"
            onClick={() => {
              openDrawer();
              setTimeout(() => openPanel("projects", "Projects"), 350);
            }}
          >
            View Projects <span className="arrow">→</span>
          </button>
        </div>

        <div className="right-col">
          <HeroInkReveal />
          <div className="bio-panel hero-bio-item">
            <div className="bio-code-block">
              <p className="bio-text">
                I&apos;m <em>{content.bioName}</em> — {content.bioBody}
                <span className="cursor-blink" />
              </p>
            </div>
            <div className="stat-row">
              {content.stats.map((stat) => (
                <div key={stat.label} className="stat">
                  <div className="stat-num">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </section>
  );
}

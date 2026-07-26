"use client";

import {
  Component,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { LANYARD_CARD_IMAGE } from "@/lib/constants";
import { usePortfolio } from "@/context/PortfolioContext";
import { useAboutContent } from "@/features/cms/hooks/use-about-content";
import {
  DEFAULT_ABOUT_CONTENT,
  resolveAboutCvHref,
  type AboutContent,
} from "@/lib/about-content-defaults";

type LanyardComponent = ComponentType<{
  position?: [number, number, number];
  fov?: number;
  gravity?: [number, number, number];
  frontImage?: string;
  backImage?: string;
  imageFit?: "cover" | "contain";
  lanyardWidth?: number;
  onReady?: () => void;
}>;

function isChunkLoadError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "ChunkLoadError" ||
    error.message.includes("Loading chunk") ||
    error.message.includes("Failed to fetch dynamically imported module") ||
    error.message.includes("Failed to fetch")
  );
}

async function loadLanyardModule(attempt = 0): Promise<LanyardComponent> {
  try {
    const mod = await import("@/components/Lanyard/Lanyard");
    return mod.default;
  } catch (error) {
    if (isChunkLoadError(error) && attempt < 2) {
      await new Promise((resolve) => window.setTimeout(resolve, 600 * (attempt + 1)));
      return loadLanyardModule(attempt + 1);
    }
    throw error;
  }
}

class LanyardErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

interface AboutSectionProps {
  onScrollTo?: (id: string) => void;
}

export default function AboutSection({ onScrollTo }: AboutSectionProps) {
  const lanyardRef = useRef<HTMLDivElement>(null);
  const { releaseParticles, openDrawer, openPanel } = usePortfolio();
  const { data } = useAboutContent();
  const content: AboutContent = data ?? {
    leadText: DEFAULT_ABOUT_CONTENT.leadText,
    hireButtonLabel: DEFAULT_ABOUT_CONTENT.hireButtonLabel,
    cvButtonLabel: DEFAULT_ABOUT_CONTENT.cvButtonLabel,
    cvUrl: DEFAULT_ABOUT_CONTENT.cvUrl,
    cvFileName: DEFAULT_ABOUT_CONTENT.cvFileName,
    cvRedirectUrl: DEFAULT_ABOUT_CONTENT.cvRedirectUrl,
    lanyardHint: DEFAULT_ABOUT_CONTENT.lanyardHint,
    features: DEFAULT_ABOUT_CONTENT.features.map((feature) => ({
      ...feature,
    })) as AboutContent["features"],
  };
  const cvHref = resolveAboutCvHref(content);
  const [mountLanyard, setMountLanyard] = useState(false);
  const [Lanyard, setLanyard] = useState<LanyardComponent | null>(null);
  const [lanyardReady, setLanyardReady] = useState(false);
  const [lanyardFailed, setLanyardFailed] = useState(false);
  const [fallbackSrc, setFallbackSrc] = useState(LANYARD_CARD_IMAGE);

  useEffect(() => {
    const el = lanyardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          releaseParticles();
          window.setTimeout(() => setMountLanyard(true), 250);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [releaseParticles]);

  useEffect(() => {
    if (!mountLanyard || lanyardFailed || Lanyard) return;

    let cancelled = false;

    loadLanyardModule()
      .then((Component) => {
        if (!cancelled) setLanyard(() => Component);
      })
      .catch(() => {
        if (!cancelled) setLanyardFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [mountLanyard, lanyardFailed, Lanyard]);

  const showFallback = lanyardFailed || !lanyardReady;

  return (
    <section className="about-section" id="about">
      <div className="about-split">
        <div className="about-lanyard-col" ref={lanyardRef}>
          <div className="about-lanyard-reveal">
            <div className="about-lanyard-stage">
              <span className="about-lanyard-hint" aria-hidden="true">
                {content.lanyardHint}
              </span>
              {showFallback && (
                <img
                  src={fallbackSrc}
                  alt="Chael"
                  className={`about-lanyard-fallback${lanyardReady ? " is-hidden" : ""}`}
                  onError={() => {
                    if (fallbackSrc !== "/homeImg1.png") {
                      setFallbackSrc("/homeImg1.png");
                    }
                  }}
                />
              )}
              {Lanyard && !lanyardFailed && (
                <LanyardErrorBoundary onError={() => setLanyardFailed(true)}>
                  <Lanyard
                    position={[0, -0.5, 18]}
                    fov={14}
                    gravity={[0, -40, 0]}
                    frontImage={LANYARD_CARD_IMAGE}
                    backImage={LANYARD_CARD_IMAGE}
                    imageFit="contain"
                    lanyardWidth={1.15}
                    onReady={() => setLanyardReady(true)}
                  />
                </LanyardErrorBoundary>
              )}
            </div>
          </div>
        </div>

        <div className="about-content-col">
          <p className="about-lead reveal-line">{content.leadText}</p>

          <div className="about-actions reveal-line">
            <button
              type="button"
              className="about-btn"
              onClick={() => onScrollTo?.("contact")}
            >
              {content.hireButtonLabel}
            </button>
            <button
              type="button"
              className="about-btn"
              onClick={() => {
                if (cvHref) {
                  window.open(cvHref, "_blank", "noopener,noreferrer");
                  return;
                }
                openDrawer();
                window.setTimeout(() => openPanel("resume", "Résumé"), 350);
              }}
            >
              {content.cvButtonLabel}
            </button>
          </div>

          <div className="about-features">
            {content.features.map((feature) => (
              <div key={feature.num} className="feature-block reveal-line">
                <span className="feature-num">{feature.num}</span>
                <span className="feature-title">{feature.title}</span>
                <p className="feature-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

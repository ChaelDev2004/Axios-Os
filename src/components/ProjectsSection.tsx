"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import AnimatedHeaderSection from "@/components/AnimatedHeaderSection";
import { useProjectsContent } from "@/features/cms/hooks/use-projects-content";
import {
  applyProjectsContent,
  DEFAULT_PROJECTS_CONTENT,
  type ProjectsContent,
} from "@/lib/projects-content-defaults";

const PREVIEW_OFFSET = 24;
const DESKTOP_MIN_WIDTH = 768;

function ArrowUpRightIcon() {
  return (
    <svg
      className="project-row-arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

export default function ProjectsSection() {
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previewSizeRef = useRef({ width: 560, height: 315 });

  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const activeIndexRef = useRef<number | null>(null);
  const { data } = useProjectsContent();
  const content: ProjectsContent = data ?? {
    subTitle: DEFAULT_PROJECTS_CONTENT.subTitle,
    title: DEFAULT_PROJECTS_CONTENT.title,
    intro: DEFAULT_PROJECTS_CONTENT.intro,
    projects: DEFAULT_PROJECTS_CONTENT.projects.map((project) => ({
      ...project,
      imageUrl: "",
      frameworks: [...project.frameworks],
    })),
  };
  const projects = applyProjectsContent(content);

  const moveX = useRef<gsap.QuickToFunc | null>(null);
  const moveY = useRef<gsap.QuickToFunc | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const getPreviewPoint = useCallback((clientX: number, clientY: number) => {
    const { width, height } = previewSizeRef.current;
    const x = clientX + PREVIEW_OFFSET;
    const y = clientY + PREVIEW_OFFSET;
    const maxX = window.innerWidth - width - PREVIEW_OFFSET;
    const maxY = window.innerHeight - height - PREVIEW_OFFSET;

    return {
      x: Math.min(Math.max(PREVIEW_OFFSET, x), maxX),
      y: Math.min(Math.max(PREVIEW_OFFSET, y), maxY),
    };
  }, []);

  const setPreviewPosition = useCallback(
    (clientX: number, clientY: number, immediate = false) => {
      const preview = previewRef.current;
      if (!preview || window.innerWidth < DESKTOP_MIN_WIDTH) return;

      const { x, y } = getPreviewPoint(clientX, clientY);

      if (immediate) {
        gsap.set(preview, { x, y });
        return;
      }

      moveX.current?.(x);
      moveY.current?.(y);
    },
    [getPreviewPoint]
  );

  const initPreview = useCallback(
    (node: HTMLDivElement | null) => {
      previewRef.current = node;
      if (!node) return;

      previewSizeRef.current = {
        width: node.offsetWidth,
        height: node.offsetHeight,
      };

      moveX.current = gsap.quickTo(node, "x", {
        duration: 0.55,
        ease: "power3.out",
      });
      moveY.current = gsap.quickTo(node, "y", {
        duration: 0.55,
        ease: "power3.out",
      });

      gsap.set(node, { opacity: 0, scale: 0.95, x: 0, y: 0 });
    },
    []
  );

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const list = listRef.current;
    if (!list) return;

    const rowTween = gsap.from(".project-row", {
      y: 100,
      opacity: 0,
      delay: 0.5,
      duration: 1,
      stagger: 0.3,
      ease: "back.out",
      scrollTrigger: {
        trigger: list,
        start: "top 85%",
        toggleActions: "play none none none",
        once: true,
      },
    });

    return () => {
      rowTween.scrollTrigger?.kill();
      rowTween.kill();
    };
  }, []);

  const handleMouseEnter = (index: number, e: React.MouseEvent) => {
    if (window.innerWidth < DESKTOP_MIN_WIDTH) return;
    activeIndexRef.current = index;
    setCurrentIndex(index);

    const el = overlayRefs.current[index];
    const preview = previewRef.current;
    if (!el || !preview) return;

    setPreviewPosition(e.clientX, e.clientY, true);

    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)" },
      {
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)",
        duration: 0.15,
        ease: "power2.out",
      }
    );

    gsap.to(preview, {
      opacity: 1,
      scale: 1,
      duration: 0.3,
      ease: "power2.out",
      transformOrigin: "top left",
    });
  };

  const handleMouseLeave = (index: number) => {
    if (window.innerWidth < DESKTOP_MIN_WIDTH) return;
    activeIndexRef.current = null;
    setCurrentIndex(null);

    const el = overlayRefs.current[index];
    const preview = previewRef.current;
    if (!el || !preview) return;

    gsap.killTweensOf(el);
    gsap.to(el, {
      clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)",
      duration: 0.2,
      ease: "power2.in",
    });

    gsap.to(preview, {
      opacity: 0,
      scale: 0.95,
      duration: 0.3,
      ease: "power2.out",
      transformOrigin: "top left",
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < DESKTOP_MIN_WIDTH || activeIndexRef.current === null) return;
    setPreviewPosition(e.clientX, e.clientY);
  };

  const handlePreviewImageLoad = () => {
    const preview = previewRef.current;
    if (!preview) return;
    previewSizeRef.current = {
      width: preview.offsetWidth,
      height: preview.offsetHeight,
    };
  };

  const previewPortal =
    portalReady &&
    createPortal(
      <div ref={initPreview} className="project-floating-preview" aria-hidden>
        {currentIndex !== null && (
          <img
            src={projects[currentIndex]?.image}
            alt=""
            className="project-floating-preview-img"
            onLoad={handlePreviewImageLoad}
          />
        )}
      </div>,
      document.body
    );

  return (
    <section id="projects" className="projects-section">
      <AnimatedHeaderSection
        subTitle={content.subTitle}
        title={content.title}
        text={content.intro}
      />

      <div
        ref={listRef}
        className="projects-list"
        onMouseMove={handleMouseMove}
      >
        {projects.map((project, index) => (
          <a
            key={project.id}
            className="project-row"
            href={project.href}
            target="_blank"
            rel="noreferrer"
            onMouseEnter={(e) => handleMouseEnter(index, e)}
            onMouseLeave={() => handleMouseLeave(index)}
          >
            <div
              ref={(el) => {
                overlayRefs.current[index] = el;
              }}
              className="project-row-overlay"
              aria-hidden
            />

            <div className="project-row-top">
              <h3 className="project-row-title">{project.name}</h3>
              <ArrowUpRightIcon />
            </div>

            <div className="project-row-divider" />

            <div className="project-row-tags">
              {project.frameworks.map((framework) => (
                <span key={framework.id} className="project-row-tag">
                  {framework.name}
                </span>
              ))}
            </div>

            <div className="project-row-mobile-preview">
              <img
                src={project.bgImage}
                alt=""
                className="project-mobile-bg"
              />
              <img
                src={project.image}
                alt={`${project.name} preview`}
                className="project-mobile-shot"
              />
            </div>
          </a>
        ))}

        {previewPortal}
      </div>
    </section>
  );
}

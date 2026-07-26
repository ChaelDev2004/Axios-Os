"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePortfolio } from "@/context/PortfolioContext";

export function useHeroReveal() {
  const { isReady, setHeroVisible, theme } = usePortfolio();

  useEffect(() => {
    if (!isReady) return;

    let cancelled = false;
    let tl: gsap.core.Timeline | null = null;

    const frame = requestAnimationFrame(() => {
      if (cancelled) return;

      if (theme === "dark") {
        gsap.set(".hero-header", { opacity: 1 });
        gsap.set(".hero-nav-item", { y: 0, opacity: 1 });
        setHeroVisible(true);
        return;
      }

      // Classic light hero remounts after theme toggle — re-run reveal
      setHeroVisible(false);

      const imgWrapEl = document.getElementById("imgWrap");
      const showImage =
        !!imgWrapEl && getComputedStyle(imgWrapEl).display !== "none";

      gsap.set(".hero-header", { opacity: 0 });
      gsap.set(".hero-nav-item", { y: -18, opacity: 0 });
      gsap.set(".hero-content-item", { y: 64, opacity: 0 });
      gsap.set(".hero-bio-item", { y: 52, opacity: 0 });
      if (showImage) gsap.set("#imgWrap", { y: 160, opacity: 0 });

      tl = gsap.timeline({
        delay: 0.15,
        onComplete: () => {
          if (!cancelled) setHeroVisible(true);
        },
      });

      if (showImage) {
        tl.to("#imgWrap", {
          y: 0,
          opacity: 1,
          duration: 1.3,
          ease: "power3.out",
        });
      }

      tl.to(
        ".hero-header",
        { opacity: 1, duration: 0.4, ease: "power2.out" },
        showImage ? "-=0.65" : 0
      );

      tl.to(
        ".hero-nav-item",
        {
          y: 0,
          opacity: 1,
          duration: 0.75,
          stagger: 0.08,
          ease: "power3.out",
        },
        showImage ? "-=0.55" : 0.1
      );

      tl.to(
        ".hero-content-item",
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.11,
          ease: "power3.out",
        },
        "-=0.4"
      );

      tl.to(
        ".hero-bio-item",
        { y: 0, opacity: 1, duration: 0.95, ease: "power3.out" },
        "-=0.55"
      );
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      tl?.kill();
    };
  }, [isReady, setHeroVisible, theme]);
}

export function useScrollAnimations() {
  const { heroVisible } = usePortfolio();

  useEffect(() => {
    if (!heroVisible) return;

    gsap.registerPlugin(ScrollTrigger);

    gsap.from(".about-lanyard-reveal", {
      scrollTrigger: {
        trigger: ".about-section",
        start: "top 85%",
        toggleActions: "play none none none",
      },
      top: -140,
      opacity: 0,
      duration: 1.2,
      ease: "back.out(1.35)",
      clearProps: "top",
    });

    gsap.from(".about-content-col .reveal-header, .about-content-col .reveal-line", {
      scrollTrigger: {
        trigger: ".about-section",
        start: "top 78%",
        toggleActions: "play none none none",
        once: true,
      },
      y: 50,
      opacity: 0,
      stagger: 0.08,
      duration: 1,
      ease: "power3.out",
    });

    gsap.from(".projects-section .reveal-header", {
      scrollTrigger: {
        trigger: ".projects-section",
        start: "top 88%",
        toggleActions: "play none none none",
        once: true,
      },
      y: "50vh",
      opacity: 0,
      duration: 1.2,
      ease: "power3.out",
    });

    gsap.from(".projects-section .projects-title-reveal", {
      scrollTrigger: {
        trigger: ".projects-section",
        start: "top 85%",
        toggleActions: "play none none none",
        once: true,
      },
      y: 200,
      opacity: 0,
      duration: 1.1,
      ease: "power3.out",
    });

    gsap.from(".projects-section .reveal-line", {
      scrollTrigger: {
        trigger: ".projects-section",
        start: "top 82%",
        toggleActions: "play none none none",
        once: true,
      },
      y: 80,
      opacity: 0,
      stagger: 0.12,
      duration: 1,
      ease: "power3.out",
    });

    gsap.from(".contact-section .reveal-header", {
      scrollTrigger: {
        trigger: ".contact-section",
        start: "top 88%",
        toggleActions: "play none none none",
        once: true,
      },
      y: "50vh",
      opacity: 0,
      duration: 1.2,
      ease: "power3.out",
    });

    gsap.from(".contact-section .contact-title-reveal, .contact-section .projects-title-reveal", {
      scrollTrigger: {
        trigger: ".contact-section",
        start: "top 85%",
        toggleActions: "play none none none",
        once: true,
      },
      y: 200,
      opacity: 0,
      duration: 1.1,
      ease: "power3.out",
    });

    gsap.from(".contact-section .reveal-line", {
      scrollTrigger: {
        trigger: ".contact-section",
        start: "top 82%",
        toggleActions: "play none none none",
        once: true,
      },
      y: 80,
      opacity: 0,
      stagger: 0.12,
      duration: 1,
      ease: "power3.out",
    });

    gsap.from(".footer-marquee", {
      scrollTrigger: {
        trigger: ".footer-marquee",
        start: "top 95%",
        toggleActions: "play none none none",
        once: true,
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out",
    });

    ScrollTrigger.refresh();

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, [heroVisible]);
}

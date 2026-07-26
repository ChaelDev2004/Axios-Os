"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PortfolioProvider, usePortfolio } from "@/context/PortfolioContext";
import LoadingScreen from "@/components/LoadingScreen";
import ParticleBackground from "@/components/ParticleBackground";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AboutSection from "@/components/AboutSection";
import ProjectsSection from "@/components/ProjectsSection";
import ContactSection from "@/components/ContactSection";
import ContactSummarySection from "@/components/ContactSummarySection";
import ToolkitSection from "@/components/ToolkitSection";
import { StackedCircularFooter } from "@/components/ui/stacked-circular-footer";
import { Toaster } from "@/components/ui/sonner";
import Drawer from "@/components/Drawer";
import {
  useHeroReveal,
  useScrollAnimations,
} from "@/hooks/usePortfolioEffects";
import { LandingVisitTracker } from "@/components/LandingVisitTracker";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

function PortfolioApp() {
  const { isReady, heroVisible, openDrawer, markAssetsLoaded, theme } =
    usePortfolio();
  const lenisRef = useRef<Lenis | null>(null);
  const [lenisReady, setLenisReady] = useState(false);

  useHeroReveal();
  useScrollAnimations();

  useEffect(() => {
    // Native WebViews often stall on WebGL assets — reveal quickly.
    const delay =
      typeof window !== "undefined" &&
      document.documentElement.classList.contains("is-native-app")
        ? 1200
        : 10000;
    const timeout = setTimeout(() => markAssetsLoaded(), delay);
    return () => clearTimeout(timeout);
  }, [markAssetsLoaded]);

  useEffect(() => {
    if (!isReady) return;

    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.05, duration: 1.5 });
    lenisRef.current = lenis;
    setLenisReady(true);

    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value?: number) {
        if (value !== undefined) {
          lenis.scrollTo(value, { immediate: true });
        }
        return lenis.scroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
      pinType: document.documentElement.style.transform ? "transform" : "fixed",
    });

    const headerEl = document.querySelector("header");
    const desktopMq = window.matchMedia("(min-width: 769px)");
    lenis.on("scroll", ScrollTrigger.update);
    lenis.on("scroll", ({ scroll, direction }) => {
      headerEl?.classList.toggle("nav-scrolled", scroll > 40);
      if (desktopMq.matches) {
        headerEl?.classList.remove("nav-hidden");
        return;
      }
      if (scroll > 120 && direction === 1) headerEl?.classList.add("nav-hidden");
      else if (direction === -1 || scroll < 80)
        headerEl?.classList.remove("nav-hidden");
    });

    const ticker = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    const onRefresh = () => lenis.resize();

    ScrollTrigger.addEventListener("refresh", onRefresh);
    ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      gsap.ticker.remove(ticker);
      lenis.destroy();
      lenisRef.current = null;
      setLenisReady(false);
      ScrollTrigger.scrollerProxy(document.documentElement, {});
    };
  }, [isReady]);

  const scrollTo = useCallback((id: string) => {
    lenisRef.current?.scrollTo(`#${id}`, { offset: -80, duration: 1.4 });
  }, []);

  const appClass = [
    isReady ? "is-ready" : "",
    heroVisible ? "hero-visible" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <LoadingScreen />
      <Toaster />
      <div
        id="app"
        className={appClass}
        data-theme={theme}
        aria-hidden={!isReady}
      >
        <ParticleBackground />
        <div className="v-line" />
        <Header onScrollTo={scrollTo} />
        <Hero />
        <div className="scroll-panel" id="scrollPanel">
          <AboutSection onScrollTo={scrollTo} />
          <ProjectsSection />
          <ContactSection />
          <ContactSummarySection lenisRef={lenisRef} enabled={lenisReady} />
          <ToolkitSection onOpenDrawer={openDrawer} />
          <StackedCircularFooter />
        </div>
        <Drawer onScrollTo={scrollTo} />
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <PortfolioProvider>
      <LandingVisitTracker />
      <PortfolioApp />
    </PortfolioProvider>
  );
}

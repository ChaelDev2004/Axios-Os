"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { MIN_LOAD_MS } from "@/lib/constants";

type PanelId = "projects" | "blog" | "about" | "resume" | "work" | null;

export type LandingTheme = "light" | "dark";

const LANDING_THEME_KEY = "landing-theme";

function readStoredTheme(): LandingTheme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(LANDING_THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* ignore */
  }
  return "light";
}

interface PortfolioContextValue {
  progress: number;
  isReady: boolean;
  heroVisible: boolean;
  particlesReleased: boolean;
  loadingManager: THREE.LoadingManager;
  setProgress: (value: number) => void;
  markAssetsLoaded: () => void;
  setHeroVisible: (value: boolean) => void;
  releaseParticles: () => void;
  drawerOpen: boolean;
  activePanel: PanelId;
  drawerTitle: string;
  openDrawer: () => void;
  closeDrawer: () => void;
  openPanel: (panel: Exclude<PanelId, null>, title: string) => void;
  showMainMenu: () => void;
  theme: LandingTheme;
  setTheme: (theme: LandingTheme) => void;
  toggleTheme: () => void;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [progress, setProgressState] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [particlesReleased, setParticlesReleased] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const [drawerTitle, setDrawerTitle] = useState("Menu");
  const [theme, setThemeState] = useState<LandingTheme>("light");
  const themeRef = useRef<LandingTheme>("light");

  const assetsLoadedRef = useRef(false);
  const isReadyRef = useRef(false);
  const loadStartRef = useRef(performance.now());

  const setProgress = useCallback((value: number) => {
    setProgressState(Math.min(100, Math.floor(value)));
  }, []);

  const revealApp = useCallback(() => {
    if (isReadyRef.current) return;
    isReadyRef.current = true;
    setProgress(100);
    document.documentElement.classList.remove("is-loading");
    setIsReady(true);
  }, [setProgress]);

  const tryRevealApp = useCallback(() => {
    const elapsed = performance.now() - loadStartRef.current;
    const wait = Math.max(0, MIN_LOAD_MS - elapsed);
    setTimeout(revealApp, wait);
  }, [revealApp]);

  const markAssetsLoaded = useCallback(() => {
    if (assetsLoadedRef.current) return;
    assetsLoadedRef.current = true;
    tryRevealApp();
  }, [tryRevealApp]);

  const loadingManager = useMemo(
    () =>
      new THREE.LoadingManager(
        () => markAssetsLoaded(),
        (_url, loaded, total) => {
          if (total > 0) setProgress((loaded / total) * 100);
        }
      ),
    [markAssetsLoaded, setProgress]
  );

  const showMainMenu = useCallback(() => {
    setActivePanel(null);
    setDrawerTitle("Menu");
  }, []);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    setActivePanel(null);
    setDrawerTitle("Menu");
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const releaseParticles = useCallback(() => {
    setParticlesReleased(true);
  }, []);

  const openPanel = useCallback(
    (panel: Exclude<PanelId, null>, title: string) => {
      setActivePanel(panel);
      setDrawerTitle(title);
    },
    []
  );

  useEffect(() => {
    const initial = readStoredTheme();
    themeRef.current = initial;
    setThemeState(initial);
  }, []);

  const setTheme = useCallback((next: LandingTheme) => {
    themeRef.current = next;
    setThemeState(next);
    try {
      window.localStorage.setItem(LANDING_THEME_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(themeRef.current === "dark" ? "light" : "dark");
  }, [setTheme]);

  const value = useMemo(
    () => ({
      progress,
      isReady,
      heroVisible,
      particlesReleased,
      loadingManager,
      setProgress,
      markAssetsLoaded,
      setHeroVisible,
      releaseParticles,
      drawerOpen,
      activePanel,
      drawerTitle,
      openDrawer,
      closeDrawer,
      openPanel,
      showMainMenu,
      theme,
      setTheme,
      toggleTheme,
    }),
    [
      progress,
      isReady,
      heroVisible,
      particlesReleased,
      loadingManager,
      setProgress,
      markAssetsLoaded,
      releaseParticles,
      drawerOpen,
      activePanel,
      drawerTitle,
      openDrawer,
      closeDrawer,
      openPanel,
      showMainMenu,
      theme,
      setTheme,
      toggleTheme,
    ]
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolio must be used within PortfolioProvider");
  }
  return context;
}

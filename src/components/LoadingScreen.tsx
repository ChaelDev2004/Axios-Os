"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { usePortfolio } from "@/context/PortfolioContext";
import { APP_LOGO_URL, DEFAULT_SITE_BRANDING } from "@/lib/site-branding-defaults";

export default function LoadingScreen() {
  const { progress, isReady } = usePortfolio();
  const [fakeProgress, setFakeProgress] = useState(0);
  const [managerActive, setManagerActive] = useState(false);

  useEffect(() => {
    if (progress > 0) setManagerActive(true);
  }, [progress]);

  useEffect(() => {
    if (managerActive) return;
    const tick = setInterval(() => {
      setFakeProgress((prev) => {
        if (prev >= 42) return prev;
        return prev + 1.5 + Math.random() * 2.5;
      });
    }, 90);
    return () => clearInterval(tick);
  }, [managerActive]);

  if (isReady) return null;

  const display = Math.floor(managerActive ? progress : fakeProgress);

  return (
    <div id="loading-screen" aria-live="polite" aria-busy="true">

      <p id="loading-brand">{DEFAULT_SITE_BRANDING.appName}</p>
      <p id="loading-text">Loading {display}%</p>
      <div id="loading-bar-track">
        <div id="loading-bar" style={{ width: `${display}%` }} />
      </div>
    </div>
  );
}

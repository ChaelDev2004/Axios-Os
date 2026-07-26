"use client";

import Image from "next/image";
import { Moon, Sun } from "lucide-react";

import { usePortfolio } from "@/context/PortfolioContext";
import { APP_LOGO_URL, DEFAULT_SITE_BRANDING } from "@/lib/site-branding-defaults";

interface HeaderProps {
  onScrollTo: (id: string) => void;
}

export default function Header({ onScrollTo }: HeaderProps) {
  const { openDrawer, theme, toggleTheme } = usePortfolio();

  return (
    <header className="hero-header">
      <button
        type="button"
        className="logo-group hero-nav-item"
        onClick={() => onScrollTo("hero")}
        aria-label={DEFAULT_SITE_BRANDING.appName}
      >
        <Image
          src={APP_LOGO_URL}
          alt=""
          width={50}
          height={50}
          className="logo-mark"
          priority
        />
        <span className="logo-name">{DEFAULT_SITE_BRANDING.appName}</span>
      </button>
      <nav>
        <button
          type="button"
          className="nav-link hero-nav-item"
          onClick={() => onScrollTo("hero")}
        >
          Home
        </button>
        <button
          type="button"
          className="nav-link hero-nav-item"
          onClick={() => onScrollTo("about")}
        >
          About
        </button>
        <button
          type="button"
          className="nav-link hero-nav-item"
          onClick={() => onScrollTo("projects")}
        >
          Projects
        </button>
        <button
          type="button"
          className="nav-link hero-nav-item"
          onClick={() => onScrollTo("toolkit")}
        >
          Toolkit
        </button>
        <button
          type="button"
          className="nav-link hero-nav-item"
          onClick={() => onScrollTo("contact")}
        >
          Contact
        </button>
        <button
          type="button"
          className="btn-theme hero-nav-item"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={theme === "dark"}
        >
          {theme === "dark" ? (
            <Sun className="btn-theme-icon" aria-hidden />
          ) : (
            <Moon className="btn-theme-icon" aria-hidden />
          )}
        </button>
        <button
          type="button"
          className="btn-commission hero-nav-item"
          onClick={openDrawer}
        >
          Commission
        </button>
        <button
          type="button"
          className="nav-burger"
          onClick={openDrawer}
          aria-label="Open menu"
        >
          <span className="nav-burger-lines" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </button>
      </nav>
    </header>
  );
}

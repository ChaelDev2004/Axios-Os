"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { useAboutContent } from "@/features/cms/hooks/use-about-content";
import { resolveAboutCvHref } from "@/lib/about-content-defaults";

const SECTION_ITEMS = [
  { sectionId: "hero", label: "Home", num: "01" },
  { sectionId: "about", label: "About", num: "02" },
  { sectionId: "projects", label: "Projects", num: "03" },
  { sectionId: "toolkit", label: "Toolkit", num: "04" },
  { sectionId: "contact", label: "Contact", num: "05" },
] as const;

function PanelContent({
  panel,
  onOpenWork,
  cvHref,
  cvFileName,
}: {
  panel: string;
  onOpenWork: () => void;
  cvHref: string | null;
  cvFileName: string;
}) {
  switch (panel) {
    case "blog":
      return (
        <div className="form-panel">
          <h3>Blog</h3>
          <p style={{ color: "rgba(0,0,0,0.5)", fontSize: 14, lineHeight: 1.75 }}>
            Writing on architecture decisions, DX patterns, and building for the
            web. Coming soon.
          </p>
        </div>
      );
    case "resume":
      return (
        <div className="form-panel">
          <h3>Résumé</h3>
          {cvHref ? (
            <>
              <p
                style={{
                  color: "rgba(0,0,0,0.5)",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                {cvFileName
                  ? `View or download ${cvFileName}.`
                  : "Open the latest CV below."}
              </p>
              {cvHref.toLowerCase().includes(".pdf") ? (
                <iframe
                  title="CV viewer"
                  src={cvHref}
                  style={{
                    width: "100%",
                    height: 360,
                    marginTop: 16,
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 12,
                  }}
                />
              ) : null}
              <a
                href={cvHref}
                target="_blank"
                rel="noreferrer"
                className="btn-submit"
                style={{
                  marginTop: 20,
                  display: "inline-flex",
                  textDecoration: "none",
                }}
              >
                Open CV →
              </a>
            </>
          ) : (
            <>
              <p
                style={{
                  color: "rgba(0,0,0,0.5)",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                Available on request. Send a message and a PDF will follow within
                24 hours.
              </p>
              <button
                type="button"
                className="btn-submit"
                style={{ marginTop: 20 }}
                onClick={onOpenWork}
              >
                Request Résumé →
              </button>
            </>
          )}
        </div>
      );
    case "work":
      return (
        <div className="form-panel">
          <h3>Let&apos;s Work</h3>
          <div className="field">
            <label>Name</label>
            <input type="text" placeholder="Your full name" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="you@company.com" />
          </div>
          <div className="field">
            <label>Project Type</label>
            <select defaultValue="">
              <option value="">Select a type...</option>
              <option>Web App</option>
              <option>API / Backend</option>
              <option>Brand & Frontend</option>
              <option>Full Stack</option>
              <option>Other</option>
            </select>
          </div>
          <div className="field">
            <label>Budget</label>
            <select defaultValue="">
              <option value="">Select range...</option>
              <option>Under $5k</option>
              <option>$5k–$15k</option>
              <option>$15k–$50k</option>
              <option>$50k+</option>
            </select>
          </div>
          <div className="field">
            <label>Message</label>
            <textarea placeholder="Tell me about the project..." />
          </div>
          <button type="button" className="btn-submit">
            Send Message
          </button>
        </div>
      );
    default:
      return null;
  }
}

type DrawerProps = {
  onScrollTo?: (id: string) => void;
};

export default function Drawer({ onScrollTo }: DrawerProps) {
  const {
    drawerOpen,
    activePanel,
    drawerTitle,
    closeDrawer,
    openPanel,
    showMainMenu,
  } = usePortfolio();
  const { data: about } = useAboutContent();
  const cvHref = about ? resolveAboutCvHref(about) : null;
  const cvFileName = about?.cvFileName?.trim() || "";

  const goToSection = (sectionId: string) => {
    closeDrawer();
    window.setTimeout(() => {
      onScrollTo?.(sectionId);
    }, 120);
  };

  const goToLogin = () => {
    closeDrawer();
    window.location.assign("/auth/login");
  };

  return (
    <>
      <div
        className={`drawer-overlay${drawerOpen ? " open" : ""}`}
        onClick={closeDrawer}
        role="presentation"
      />
      <div
        className={`drawer${drawerOpen ? " open" : ""}`}
        role="dialog"
        aria-label="Navigation menu"
      >
        <div className="drawer-header">
          <span className="drawer-title">{drawerTitle}</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {activePanel && (
              <button type="button" className="back-btn" onClick={showMainMenu}>
                ← Back
              </button>
            )}
            <button
              type="button"
              className="drawer-close"
              onClick={closeDrawer}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="drawer-body">
          {!activePanel ? (
            <div id="mainMenu">
              {SECTION_ITEMS.map((item) => (
                <div
                  key={item.sectionId}
                  className="menu-item"
                  onClick={() => goToSection(item.sectionId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goToSection(item.sectionId);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="menu-item-label">{item.label}</span>
                  <span className="menu-item-num">{item.num}</span>
                </div>
              ))}
              <div
                className="menu-item"
                onClick={() => openPanel("work", "Let's Work")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openPanel("work", "Let's Work");
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <span className="menu-item-label">Commission</span>
                <span className="menu-item-num">06</span>
              </div>
              <div className="drawer-login">
                <p className="drawer-login-hint">Already have an account?</p>
                <button
                  type="button"
                  className="btn-commission drawer-login-btn"
                  onClick={goToLogin}
                >
                  Login
                </button>
              </div>
            </div>
          ) : (
            <PanelContent
              panel={activePanel}
              onOpenWork={() => openPanel("work", "Let's Work")}
              cvHref={cvHref}
              cvFileName={cvFileName}
            />
          )}
        </div>
      </div>
    </>
  );
}

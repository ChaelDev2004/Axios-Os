"use client";

import { useState, type FormEvent, type SVGProps } from "react";
import { toast } from "sonner";

import { APP_LOGO_URL } from "@/lib/site-branding-defaults";
import { SOCIALS } from "@/lib/socials";

const NAV_LINKS = [
  { label: "Home", href: "#hero" },
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Contact", href: "#contact" },
] as const;

type IconProps = SVGProps<SVGSVGElement>;

function GithubIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.09.682-.22.682-.48 0-.24-.009-.87-.014-1.71-2.782.6-3.369-1.34-3.369-1.34-.454-1.16-1.11-1.47-1.11-1.47-.908-.62.069-.61.069-.61 1.003.07 1.531 1.03 1.531 1.03.892 1.53 2.341 1.09 2.91.83.09-.65.35-1.09.636-1.34-2.22-.25-4.555-1.11-4.555-4.94 0-1.09.39-1.98 1.029-2.68-.103-.25-.446-1.27.098-2.65 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8c.85.004 1.705.11 2.504.33 1.909-1.29 2.747-1.02 2.747-1.02.546 1.38.203 2.4.1 2.65.64.7 1.028 1.59 1.028 2.68 0 3.84-2.339 4.69-4.566 4.93.359.31.678.92.678 1.85 0 1.34-.012 2.42-.012 2.75 0 .27.18.58.688.48A10.01 10.01 0 0 0 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function LinkedinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

function SocialIcon({ name }: { name: string }) {
  const key = name.toLowerCase();
  const className = "landing-footer-social-icon";
  if (key.includes("git")) return <GithubIcon className={className} />;
  if (key.includes("linked")) return <LinkedinIcon className={className} />;
  if (key.includes("insta")) return <InstagramIcon className={className} />;
  if (key.includes("face")) return <FacebookIcon className={className} />;
  return <GithubIcon className={className} />;
}

function StackedCircularFooter() {
  const [email, setEmail] = useState("");
  const year = new Date().getFullYear();

  const onSubscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Enter a valid email address");
      return;
    }
    toast.success("Thanks — I'll be in touch.");
    setEmail("");
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="landing-footer reveal-item">
      <div className="landing-footer-inner">
        <div className="landing-footer-logo-wrap">
          <img
            src={APP_LOGO_URL}
            alt="AXIOS OS"
            className="landing-footer-logo-img"
          />
        </div>

        <nav className="landing-footer-nav" aria-label="Footer">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="landing-footer-nav-link">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="landing-footer-socials">
          {SOCIALS.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              className="landing-footer-social-btn"
              aria-label={social.name}
            >
              <SocialIcon name={social.name} />
            </a>
          ))}
        </div>

        <form className="landing-footer-form" onSubmit={onSubscribe}>
          <label htmlFor="landing-footer-email" className="sr-only">
            Email
          </label>
          <input
            id="landing-footer-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="landing-footer-input"
          />
          <button type="submit" className="landing-footer-submit">
            Subscribe
          </button>
        </form>

        <p className="landing-footer-copy">
          © {year} Chael Dev. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export { StackedCircularFooter };

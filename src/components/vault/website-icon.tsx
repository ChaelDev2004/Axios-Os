"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { KeyRound, Shield } from "lucide-react";

type WebsiteIconProps = {
  domain?: string | null;
  iconUrl?: string | null;
  name?: string | null;
  size?: number;
  fallback?: "letter" | "shield" | "key";
  className?: string;
  style?: CSSProperties;
};

function letterFromName(name?: string | null, domain?: string | null): string {
  const source = (name ?? domain ?? "?").trim();
  return (source[0] ?? "?").toUpperCase();
}

function googleFavicon(domain: string, size: number) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

function duckDuckGoIcon(domain: string) {
  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
}

export function WebsiteIcon({
  domain,
  iconUrl,
  name,
  size = 36,
  fallback = "letter",
  className,
  style,
}: WebsiteIconProps) {
  const [stage, setStage] = useState<"primary" | "google" | "ddg" | "fallback">(
    iconUrl ? "primary" : domain ? "google" : "fallback"
  );

  useEffect(() => {
    setStage(iconUrl ? "primary" : domain ? "google" : "fallback");
  }, [iconUrl, domain]);

  const src = useMemo(() => {
    if (stage === "primary" && iconUrl) return iconUrl;
    if (stage === "google" && domain) return googleFavicon(domain, Math.max(64, size * 2));
    if (stage === "ddg" && domain) return duckDuckGoIcon(domain);
    return null;
  }, [stage, iconUrl, domain, size]);

  const box: CSSProperties = {
    width: size,
    height: size,
    borderRadius: Math.max(8, Math.round(size * 0.28)),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
    border: "1px solid var(--border)",
    background:
      "linear-gradient(135deg, rgba(99,102,241,0.28), rgba(139,92,246,0.16))",
    position: "relative",
    ...style,
  };

  const advance = () => {
    setStage((current) => {
      if (current === "primary") return domain ? "google" : "fallback";
      if (current === "google") return domain ? "ddg" : "fallback";
      return "fallback";
    });
  };

  const FallbackMark = () => {
    if (fallback === "shield") {
      return <Shield style={{ width: size * 0.45, height: size * 0.45, color: "#c7d2fe" }} />;
    }
    if (fallback === "key") {
      return <KeyRound style={{ width: size * 0.45, height: size * 0.45, color: "#c7d2fe" }} />;
    }
    return (
      <span
        style={{
          fontSize: Math.max(11, Math.round(size * 0.4)),
          fontWeight: 700,
          color: "#e0e7ff",
          lineHeight: 1,
        }}
      >
        {letterFromName(name, domain)}
      </span>
    );
  };

  return (
    <span className={className} style={box} aria-hidden>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
        }}
      >
        <FallbackMark />
      </span>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          width={size}
          height={size}
          style={{
            position: "relative",
            zIndex: 1,
            width: size,
            height: size,
            objectFit: "contain",
            padding: Math.max(4, Math.round(size * 0.12)),
            background: "rgba(255,255,255,0.92)",
            borderRadius: Math.max(6, Math.round(size * 0.22)),
          }}
          onError={advance}
        />
      ) : null}
    </span>
  );
}

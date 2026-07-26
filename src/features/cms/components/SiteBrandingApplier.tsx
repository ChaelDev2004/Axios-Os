"use client";

import { useEffect } from "react";

import { useSiteBranding } from "@/features/cms/hooks/use-site-branding";
import { DEFAULT_SITE_BRANDING } from "@/lib/site-branding-defaults";

function setFavicon(href: string) {
  const links = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
  if (links.length === 0) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = href;
    document.head.appendChild(link);
    return;
  }

  links.forEach((link) => {
    link.href = href;
  });
}

/** Applies CMS branding to document title + favicon. */
export function SiteBrandingApplier() {
  const { data } = useSiteBranding();
  const branding = data ?? DEFAULT_SITE_BRANDING;

  useEffect(() => {
    document.title = branding.pageTitle || DEFAULT_SITE_BRANDING.pageTitle;
    setFavicon(branding.faviconUrl || DEFAULT_SITE_BRANDING.faviconUrl);
  }, [branding.pageTitle, branding.faviconUrl]);

  return null;
}

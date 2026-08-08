/** Normalize website URLs and extract domains for favicons. */

export function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let value = trimmed;
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  try {
    const url = new URL(value);
    if (!url.hostname) return null;
    return url.origin + (url.pathname === "/" ? "" : url.pathname.replace(/\/$/, ""));
  } catch {
    return null;
  }
}

export function extractDomain(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const normalized = normalizeWebsiteUrl(raw);
  if (!normalized) return null;
  try {
    const host = new URL(normalized).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function googleFaviconUrl(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

export function openWebsiteUrl(raw: string | null | undefined): string | null {
  const normalized = raw ? normalizeWebsiteUrl(raw) : null;
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

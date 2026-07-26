import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "archive.org" ||
    host.endsWith(".archive.org") ||
    host === "assets.mixkit.co" ||
    host === "www.soundhelix.com" ||
    host === "soundhelix.com"
  );
}

/**
 * Same-origin audio proxy so the browser can play Archive.org / Mixkit streams
 * reliably (redirects + range requests).
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url")?.trim();
  if (!raw) {
    return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ ok: false, error: "Invalid protocol" }, { status: 400 });
  }

  if (!isAllowedHost(target.hostname)) {
    return NextResponse.json({ ok: false, error: "Host not allowed" }, { status: 403 });
  }

  try {
    const range = request.headers.get("range");
    const upstream = await fetch(target.toString(), {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AxionFocusMusic/1.0; +https://localhost)",
        Accept: "audio/mpeg, audio/*;q=0.9, */*;q=0.8",
        ...(range ? { Range: range } : {}),
      },
    });

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { ok: false, error: `Upstream ${upstream.status}` },
        { status: 502 }
      );
    }

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type") || "audio/mpeg";
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stream failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

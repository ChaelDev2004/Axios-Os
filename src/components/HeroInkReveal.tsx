"use client";

import { useEffect, useRef } from "react";
import { HERO_IMG_LOCAL, HERO_IMG_URL } from "@/lib/constants";
import { usePortfolio } from "@/context/PortfolioContext";

const INK_BRUSH = 72;
const INK_FADE = 0.018;

function loadImage(
  src: string,
  timeoutMs = 4000,
  crossOrigin = true
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.src = "";
      resolve(null);
    }, timeoutMs);

    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => {
      clearTimeout(timer);
      resolve(img.naturalWidth > 0 ? img : null);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

export default function HeroInkReveal() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const grayRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLImageElement>(null);
  const startRevealRef = useRef<(() => void) | null>(null);
  const { loadingManager, isReady, heroVisible } = usePortfolio();

  useEffect(() => {
    if (!isReady) return;

    const imgWrap = wrapRef.current;
    const grayCanvas = grayRef.current;
    const colorCanvas = colorRef.current;
    if (!imgWrap || !grayCanvas || !colorCanvas) return;

    const gCtx = grayCanvas.getContext("2d");
    const cCtx = colorCanvas.getContext("2d");
    if (!gCtx || !cCtx) return;

    const maskCanvas = document.createElement("canvas");
    const mCtx = maskCanvas.getContext("2d");
    if (!mCtx) return;

    let heroImg: HTMLImageElement | null = null;
    let imgW = 0;
    let imgH = 0;
    let lastInkX = -1;
    let lastInkY = -1;
    let isOverImage = false;
    let frame = 0;
    let running = false;
    let disposed = false;

    const hasLayout = () => {
      const style = getComputedStyle(imgWrap);
      return style.display !== "none" && imgWrap.offsetHeight > 0;
    };

    const canvasesReady = () =>
      colorCanvas.width > 0 &&
      colorCanvas.height > 0 &&
      maskCanvas.width > 0 &&
      maskCanvas.height > 0;

    const setupCanvases = (): boolean => {
      if (!heroImg || !hasLayout() || !imgW || !imgH) return false;

      const wrapH = imgWrap.offsetHeight;
      const aspect = imgW / imgH;
      const dispH = wrapH;
      const dispW = dispH * aspect;
      if (dispW <= 0 || dispH <= 0) return false;

      [grayCanvas, colorCanvas, maskCanvas].forEach((canvas) => {
        canvas.width = dispW;
        canvas.height = dispH;
      });

      grayCanvas.style.width = `${dispW}px`;
      grayCanvas.style.height = `${dispH}px`;
      colorCanvas.style.width = `${dispW}px`;
      colorCanvas.style.height = `${dispH}px`;

      gCtx.filter = "grayscale(1) brightness(1.05) contrast(0.95)";
      gCtx.drawImage(heroImg, 0, 0, dispW, dispH);
      gCtx.filter = "none";
      mCtx.clearRect(0, 0, dispW, dispH);
      lastInkX = -1;
      lastInkY = -1;

      if (fallbackRef.current) {
        fallbackRef.current.style.visibility = "hidden";
      }

      return true;
    };

    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const tryStartReveal = () => {
      if (disposed || running || !heroImg || !setupCanvases()) return;
      running = true;
      drawInkReveal();
    };

    startRevealRef.current = tryStartReveal;

    const stampInk = (
      x: number,
      y: number,
      radius = INK_BRUSH,
      alpha = 1
    ) => {
      if (!canvasesReady()) return;

      const r = radius * (0.85 + Math.random() * 0.3);
      const ox = (Math.random() - 0.5) * radius * 0.18;
      const oy = (Math.random() - 0.5) * radius * 0.18;
      const px = x + ox;
      const py = y + oy;
      const grad = mCtx.createRadialGradient(px, py, 0, px, py, r);
      grad.addColorStop(0, `rgba(255,255,255,${0.92 * alpha})`);
      grad.addColorStop(0.28, `rgba(255,255,255,${0.62 * alpha})`);
      grad.addColorStop(0.62, `rgba(255,255,255,${0.22 * alpha})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      mCtx.fillStyle = grad;
      mCtx.beginPath();
      mCtx.arc(px, py, r, 0, Math.PI * 2);
      mCtx.fill();
    };

    const paintInkStroke = (x: number, y: number) => {
      if (!canvasesReady()) return;

      if (lastInkX >= 0) {
        const dist = Math.hypot(x - lastInkX, y - lastInkY);
        const steps = Math.max(1, Math.ceil(dist / (INK_BRUSH * 0.22)));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const px = lastInkX + (x - lastInkX) * t;
          const py = lastInkY + (y - lastInkY) * t;
          stampInk(px, py);
          if (Math.random() > 0.55) {
            stampInk(px, py, INK_BRUSH * 0.42, 0.55);
          }
        }
      } else {
        stampInk(x, y);
        stampInk(x, y, INK_BRUSH * 0.55, 0.75);
      }
      lastInkX = x;
      lastInkY = y;
    };

    const fadeInkMask = () => {
      if (!canvasesReady()) return;
      mCtx.globalCompositeOperation = "destination-out";
      mCtx.fillStyle = `rgba(0,0,0,${INK_FADE})`;
      mCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      mCtx.globalCompositeOperation = "source-over";
    };

    const drawInkReveal = () => {
      if (disposed) return;
      if (!running) return;
      frame = requestAnimationFrame(drawInkReveal);

      if (!imgW || !heroImg || !hasLayout()) return;
      if (!canvasesReady() && !setupCanvases()) return;
      if (!canvasesReady()) return;

      const w = colorCanvas.width;
      const h = colorCanvas.height;

      if (!isOverImage) fadeInkMask();

      try {
        cCtx.clearRect(0, 0, w, h);
        cCtx.filter = "saturate(1.12) contrast(1.06)";
        cCtx.drawImage(heroImg, 0, 0, w, h);
        cCtx.filter = "none";
        cCtx.globalCompositeOperation = "destination-in";
        cCtx.drawImage(maskCanvas, 0, 0, w, h);
        cCtx.globalCompositeOperation = "source-over";
      } catch {
        stopLoop();
      }
    };

    const onImageReady = (image: HTMLImageElement) => {
      if (disposed) return;
      heroImg = image;
      imgW = image.naturalWidth;
      imgH = image.naturalHeight;
      tryStartReveal();
    };

    loadingManager.itemStart("hero-image");

    void (async () => {
      const [remoteImg, localImg] = await Promise.all([
        loadImage(HERO_IMG_URL, 5000),
        loadImage(HERO_IMG_LOCAL, 3000, false),
      ]);
      loadingManager.itemEnd("hero-image");

      const image = localImg ?? remoteImg;
      if (image) onImageReady(image);
    })();

    const onMove = (e: MouseEvent) => {
      if (!canvasesReady()) return;

      const rect = colorCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const scaleX = colorCanvas.width / rect.width;
      const scaleY = colorCanvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const wasOver = isOverImage;
      isOverImage =
        x >= 0 &&
        x <= colorCanvas.width &&
        y >= 0 &&
        y <= colorCanvas.height;

      if (!isOverImage) {
        if (wasOver) {
          lastInkX = -1;
          lastInkY = -1;
        }
        return;
      }
      paintInkStroke(x, y);
    };

    const onResize = () => {
      if (heroImg) setupCanvases();
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!heroImg) return;
      setupCanvases();
      tryStartReveal();
    });
    resizeObserver.observe(imgWrap);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      startRevealRef.current = null;
      stopLoop();
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, [loadingManager, isReady]);

  useEffect(() => {
    if (heroVisible) startRevealRef.current?.();
  }, [heroVisible]);

  return (
    <div className="img-wrap" id="imgWrap" ref={wrapRef}>
      <img
        ref={fallbackRef}
        className="hero-portrait-fallback"
        src={HERO_IMG_LOCAL}
        alt=""
        aria-hidden
        draggable={false}
      />
      <canvas id="canvas-gray" ref={grayRef} />
      <canvas id="canvas-color" ref={colorRef} />
    </div>
  );
}

"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import type Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAos } from "@/hooks/useAos";
import Marquee from "@/components/Marquee";
import {
  CONTACT_SUMMARY_ITEMS,
  CONTACT_SUMMARY_ITEMS_ALT,
} from "@/lib/socials";

const SCROLL_DELAY_MS = 1000;

interface ContactSummarySectionProps {
  lenisRef: MutableRefObject<Lenis | null>;
  enabled?: boolean;
}

export default function ContactSummarySection({
  lenisRef,
  enabled = true,
}: ContactSummarySectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  useAos(sectionRef);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !enabled) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    gsap.registerPlugin(ScrollTrigger);

    let done = false;
    let locking = false;
    let delayTimer: number | undefined;

    const unlock = () => {
      if (done) return;
      done = true;
      locking = false;
      if (delayTimer !== undefined) window.clearTimeout(delayTimer);
      lenisRef.current?.start();
    };

    const pauseBriefly = () => {
      if (done || locking) return;
      locking = true;

      const lenis = lenisRef.current;
      lenis?.scrollTo(section, { offset: -72, immediate: true });
      lenis?.stop();

      delayTimer = window.setTimeout(unlock, SCROLL_DELAY_MS);
    };

    const blockScroll = (event: Event) => {
      if (!locking || done) return;
      event.preventDefault();
    };

    window.addEventListener("wheel", blockScroll, { passive: false });
    window.addEventListener("touchmove", blockScroll, { passive: false });

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top+=72",
      onEnter: pauseBriefly,
    });

    return () => {
      st.kill();
      window.removeEventListener("wheel", blockScroll);
      window.removeEventListener("touchmove", blockScroll);
      if (delayTimer !== undefined) window.clearTimeout(delayTimer);
      lenisRef.current?.start();
    };
  }, [enabled, lenisRef]);

  return (
    <section ref={sectionRef} className="contact-summary-section">
      <div
        className="contact-summary-marquee-wrap"
        data-aos="fade-up"
        data-aos-duration="700"
      >
        <Marquee
          items={CONTACT_SUMMARY_ITEMS}
          variant="dark"
          separator="✦"
        />
      </div>

      <div
        className="contact-quote-wrap"
        data-aos="fade-up"
        data-aos-duration="900"
        data-aos-delay="120"
      >
        <p className="contact-quote">
          <span className="contact-quote-line">&ldquo; Let&apos;s build a</span>
          <span className="contact-quote-line">
            <span className="contact-quote-strong">memorable</span> &amp;{" "}
            <span className="contact-quote-italic">inspiring</span>
          </span>
          <span className="contact-quote-line">
            web application{" "}
            <span className="contact-quote-accent">together</span> &rdquo;
          </span>
        </p>
      </div>

      <div
        className="contact-summary-marquee-wrap"
        data-aos="fade-up"
        data-aos-duration="700"
        data-aos-delay="220"
      >
        <Marquee
          items={CONTACT_SUMMARY_ITEMS_ALT}
          reverse
          variant="outline"
          withIcon
        />
      </div>
    </section>
  );
}

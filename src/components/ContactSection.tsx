"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import AnimatedHeaderSection from "@/components/AnimatedHeaderSection";
import Marquee from "@/components/Marquee";
import { useContactContent } from "@/features/cms/hooks/use-contact-content";
import {
  DEFAULT_CONTACT_CONTENT,
  type ContactContent,
} from "@/lib/contact-content-defaults";

export default function ContactSection() {
  const listRef = useRef<HTMLDivElement>(null);
  const { data } = useContactContent();
  const content: ContactContent = data ?? {
    subTitle: DEFAULT_CONTACT_CONTENT.subTitle,
    title: DEFAULT_CONTACT_CONTENT.title,
    intro: DEFAULT_CONTACT_CONTENT.intro,
    email: DEFAULT_CONTACT_CONTENT.email,
    phone: DEFAULT_CONTACT_CONTENT.phone,
    socials: DEFAULT_CONTACT_CONTENT.socials.map((social) => ({ ...social })),
    marqueeItems: [...DEFAULT_CONTACT_CONTENT.marqueeItems],
  };

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const list = listRef.current;
    if (!list) return;

    const tween = gsap.from(".social-link", {
      y: 100,
      opacity: 0,
      delay: 0.5,
      duration: 1,
      stagger: 0.3,
      ease: "back.out",
      scrollTrigger: {
        trigger: list,
        start: "top 85%",
        toggleActions: "play none none none",
        once: true,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <section id="contact" className="contact-section">
      <div className="contact-section-body">
        <AnimatedHeaderSection
          subTitle={content.subTitle}
          title={content.title}
          text={content.intro}
          theme="light"
        />

        <div ref={listRef} className="contact-details">
          <div className="social-link">
            <h2>E-mail</h2>
            <div className="contact-divider" />
            <a href={`mailto:${content.email}`} className="contact-value contact-value--email">
              {content.email}
            </a>
          </div>

          <div className="social-link">
            <h2>Phone</h2>
            <div className="contact-divider" />
            <a href={`tel:${content.phone}`} className="contact-value">
              {content.phone}
            </a>
          </div>

          <div className="social-link">
            <h2>Social Media</h2>
            <div className="contact-divider" />
            <div className="contact-socials">
              {content.socials.map((social) => (
                <a
                  key={social.name}
                  href={social.href || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="contact-social-link"
                >
                  {"{ "}
                  {social.name}
                  {" }"}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="contact-marquee-wrap">
        <Marquee items={content.marqueeItems} variant="light" />
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import Footer from "./components/Footer";

const Timeline = dynamic(() => import("./components/Timeline"));

const STYLES = {
  montserrat: {
    fontFamily: "var(--font-montserrat), sans-serif",
    fontWeight: 300,
  },
  playfair: {
    fontFamily: "var(--font-playfair), serif",
    fontWeight: 300,
  },
  colors: {
    background: "#ffffff",
    primary: "#333333",
    secondary: "#666666",
  },
} as const;

function Hero() {
  const ref = useRef<HTMLElement>(null);

  // Desktop: cut anchored to half-a-polaroid-width past the polaroid's right
  // edge so the cut tracks the polaroid sweeping across the hero.
  // Mobile (<800px): the carousel is replaced by a vertical CompactList, so
  // there's no polaroid sweeping the hero. Fall back to a simple opacity fade
  // over the first viewport of scroll.
  useEffect(() => {
    const handleScroll = () => {
      const el = ref.current;
      if (!el) return;
      const winW = window.innerWidth;
      const isMobile = winW < 800;
      const webkitStyle = el.style as unknown as { webkitClipPath: string };

      if (isMobile) {
        const t = Math.max(0, Math.min(window.scrollY / window.innerHeight, 1));
        el.style.opacity = String(1 - t);
        el.style.clipPath = "";
        webkitStyle.webkitClipPath = "";
        el.style.pointerEvents = t > 0.9 ? "none" : "auto";
        return;
      }

      const polaroid = document.querySelector(
        ".bg-white.p-3.pb-14"
      ) as HTMLElement | null;
      const heroRect = el.getBoundingClientRect();
      let rightClip = 0;
      if (polaroid && heroRect.width > 0) {
        const polRect = polaroid.getBoundingClientRect();
        const cutAnchor = polRect.right - polRect.width / 2;
        rightClip = Math.max(
          0,
          Math.min(100, ((heroRect.right - cutAnchor) / heroRect.width) * 100)
        );
      }
      el.style.clipPath = `inset(0 ${rightClip}% 0 0)`;
      webkitStyle.webkitClipPath = `inset(0 ${rightClip}% 0 0)`;
      el.style.opacity = "1";
      el.style.pointerEvents = rightClip > 90 ? "none" : "auto";
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <section
      ref={ref}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        // Below the carousel's fixed pin (zIndex 1) so polaroids render on
        // top of the hero title as they sweep across.
        zIndex: 0,
        width: "100%",
        maxWidth: 800,
        padding: "0 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {/* Name Header */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <Image
          src="/cow.svg"
          alt="Cow icon"
          width={48}
          height={48}
          className="invert brightness-75"
        />
        <p
          className="text-base md:text-lg"
          style={{
            ...STYLES.montserrat,
            color: STYLES.colors.secondary,
            letterSpacing: "0.1em",
          }}
        >
          JASON XU
        </p>
      </div>

      {/* Hero Heading */}
      <h1
        className="text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight"
        style={{
          ...STYLES.playfair,
          color: STYLES.colors.primary,
        }}
      >
        Everything I&apos;ve Built
      </h1>

      {/* Subtitle */}
      <p
        className="text-base md:text-lg max-w-xl mx-auto"
        style={{
          color: STYLES.colors.secondary,
          lineHeight: 1.7,
        }}
      >
        Try swiping & clicking polaroids
      </p>
    </section>
  );
}

export default function Home() {
  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{
        ...STYLES.montserrat,
        backgroundColor: STYLES.colors.background,
        color: STYLES.colors.primary,
      }}
    >
      {/* Fixed hero — fades out on scroll */}
      <Hero />

      {/* Spacer that gives the user something to scroll through while the hero
          fades. After this, the carousel section starts and pins itself. */}
      <div style={{ height: "100vh" }} />

      {/* Timeline (scroll-jacked carousel) */}
      <div id="timeline" style={{ scrollMarginTop: "20px", position: "relative", zIndex: 1 }}>
        <Timeline />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

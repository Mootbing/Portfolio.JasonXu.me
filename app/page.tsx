"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import Footer from "./components/Footer";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  // Layout effect so the initial clip-path is computed before paint —
  // prevents a first-frame flash where the hero shows un-clipped, then
  // snaps to its scroll-driven clip. Especially noticeable when the page
  // breakpoint flips (mobile↔desktop) and Hero re-runs its initial pass.
  useIsoLayoutEffect(() => {
    const handleScroll = () => {
      const el = ref.current;
      if (!el) return;
      const winW = window.innerWidth;
      const isMobile = winW < 800;
      const webkitStyle = el.style as unknown as { webkitClipPath: string };

      if (isMobile) {
        // 2× speed: complete fade by half a viewport of scroll instead of one.
        const t = Math.max(0, Math.min((window.scrollY * 2) / window.innerHeight, 1));
        el.style.opacity = String(1 - t);
        el.style.clipPath = "";
        webkitStyle.webkitClipPath = "";
        el.style.pointerEvents = t > 0.9 ? "none" : "auto";
        return;
      }

      // Scope to the carousel pin — CompactList polaroids share the same
      // .bg-white.p-3.pb-14 class. Without scoping, the breakpoint crossing
      // can briefly resolve this to a centered CompactList polaroid (React
      // hasn't committed the unmount yet) and lock the Hero clip at ~50%.
      const polaroid = document.querySelector(
        "[data-carousel-pin] .bg-white.p-3.pb-14"
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

    // Run once now, then again on the next frame. Carousel is a sibling
    // component — when crossing the 800px breakpoint, Carousel just mounted
    // and its layout effect (which positions the polaroid) may run AFTER
    // Hero's. Without the deferred second call, Hero would read a missing
    // or initial-state polaroid and lock rightClip at the wrong value
    // until the next scroll/resize.
    const handleScrollSettled = () => {
      handleScroll();
      requestAnimationFrame(handleScroll);
    };

    handleScrollSettled();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScrollSettled);
    // Breakpoint crossings can desync Hero (Carousel mount/unmount races)
    // and resize events alone don't always fire at the exact crossover.
    const mql = window.matchMedia("(max-width: 799px)");
    mql.addEventListener("change", handleScrollSettled);
    // Returning focus to the tab can reveal a stale clip if the user
    // crossed the breakpoint with the tab backgrounded (matchMedia change
    // may not have re-fired Carousel's positioning).
    const onVisibility = () => {
      if (document.visibilityState === "visible") handleScrollSettled();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScrollSettled);
      mql.removeEventListener("change", handleScrollSettled);
      document.removeEventListener("visibilitychange", onVisibility);
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
        My Portfolio
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
        // Mobile compact list lets the polaroid back-stack translate past the
        // viewport edge (cards offset right by stackOffset*18px + rotation
        // bounding box), which would surface a horizontal page scrollbar.
        // Clip here — overflow: clip does NOT establish a containing block for
        // position: fixed descendants, so the Hero stays viewport-anchored.
        overflowX: "clip",
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

      {/* Footer hidden for now */}
      {/* <Footer /> */}
    </div>
  );
}

"use client";

import Image from "next/image";
import Timeline from "./components/Timeline";
import Footer from "./components/Footer";

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
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 md:px-12 relative">
        <div className="w-full max-w-3xl text-center">

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
              className="text-base md:text-lg transition-colors duration-300"
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
            className="text-base md:text-lg max-w-xl mx-auto mb-8"
            style={{
              color: STYLES.colors.secondary,
              lineHeight: 1.7,
            }}
          >
            Pro tip: try swiping on polaroids
          </p>

        </div>

      </section>

      {/* Timeline Section */}
      <div style={{ marginTop: "-175px" }}>
        <Timeline />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Timeline from "./components/Timeline";

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

const NAV_LINKS = [
  { href: "https://jasonxu.me", label: "About Me" },
  { href: "https://resume.jasonxu.me", label: "Resume" },
  { href: "https://contact.jasonxu.me", label: "Contact" },
  { href: "https://github.jasonxu.me", label: "GitHub" },
  { href: "https://linkedin.jasonxu.me", label: "LinkedIn" },
] as const;

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
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-3xl text-center"
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
            Doing it for the love of the game
          </p>

        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <div
              className="w-px h-12"
              style={{ background: "rgba(0, 0, 0, 0.15)" }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Timeline Section */}
      <Timeline />

      {/* Footer */}
      <footer className="py-20 px-6 md:px-12 text-center">
        <h2
          className="text-2xl md:text-3xl mb-6 leading-tight"
          style={{
            ...STYLES.playfair,
            color: STYLES.colors.primary,
          }}
        >
          <a
            href="https://email.jasonxu.me"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-link"
            style={{ textDecoration: "none" }}
          >
            him@jasonxu.me
          </a>
        </h2>
        <nav
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:gap-x-8 text-sm"
          style={{ color: STYLES.colors.secondary }}
        >
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
            >
              {label}
            </a>
          ))}
        </nav>
      </footer>
    </div>
  );
}

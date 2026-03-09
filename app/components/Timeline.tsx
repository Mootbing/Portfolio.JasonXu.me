"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useSpring, useInView, useTransform } from "framer-motion";
import PolaroidStack from "./PolaroidCard";
import type { PolaroidItem } from "./PolaroidCard";
import PROJECTS from "../../public/data/Work.json";

interface TimelineProject {
  year: string;
  title: string;
  description: string;
  link?: string;
  tags: string[];
  badges?: ({ href: string; src: string; alt: string; width: number; height: number; style?: string } | { text: string })[];
  badgesMt?: number;
  polaroids?: PolaroidItem[];
}

function ExternalLinkIcon() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block ml-1.5"
      style={{ verticalAlign: "middle", marginBottom: "2px", color: "#333333" }}
    >
      <path d="M4.5 1.5H2a.5.5 0 00-.5.5v8a.5.5 0 00.5.5h8a.5.5 0 00.5-.5V7.5" />
      <path d="M7 1.5h3.5V5" />
      <path d="M5 7L10.5 1.5" />
    </svg>
  );
}

function useIsCompact(breakpoint = 800) {
  const [compact, setCompact] = useState<boolean | null>(null);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setCompact(mql.matches);
    const handler = (e: MediaQueryListEvent) => setCompact(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return compact;
}

function TimelineNode() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      const rect = el.getBoundingClientRect();
      setVisible(rect.top < window.innerHeight * 0.5);
    };

    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  return (
    <motion.div
      ref={ref}
      className="z-10"
      initial={{ scale: 0, opacity: 0 }}
      animate={visible ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <img src="/milk.svg" alt="milk" style={{ width: "24px", height: "24px", background: "#ffffff", borderRadius: "50%", padding: "6px", boxSizing: "content-box", transform: "translateX(-5px)" }} />
    </motion.div>
  );
}

function TextContent({
  project,
  isInView,
  align = "left",
}: {
  project: TimelineProject;
  isInView: boolean;
  align?: "left" | "right";
}) {
  const isRight = align === "right";

  return (
    <div className={`max-w-sm ${isRight ? "text-right" : ""}`}>
      {project.year && (
        <motion.span
          initial={{ opacity: 0, x: -30, scale: 0.95 }}
          animate={isInView ? { opacity: 1, x: 0, scale: 1 } : undefined}
          transition={{
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: 0.1,
          }}
          className="block mb-1 tracking-widest uppercase"
          style={{
            fontFamily: "var(--font-montserrat), sans-serif",
            fontWeight: 300,
            color: "#999999",
            fontSize: "0.7rem",
            letterSpacing: "0.1em",
          }}
        >
          {project.year}
        </motion.span>
      )}
      <motion.h3
        initial={{ opacity: 0, x: -30, scale: 0.95 }}
        animate={isInView ? { opacity: 1, x: 0, scale: 1 } : undefined}
        transition={{
          duration: 0.5,
          ease: [0.25, 0.46, 0.45, 0.94],
          delay: 0.2,
        }}
        className="text-xl md:text-2xl mb-1 leading-tight"
        style={{
          fontFamily: "var(--font-playfair), serif",
          fontWeight: 300,
          color: "#333333",
        }}
      >
        {project.link ? (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-link"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {project.title}
            <ExternalLinkIcon />
          </a>
        ) : (
          project.title
        )}
      </motion.h3>
      {project.tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -30, scale: 0.95 }}
          animate={isInView ? { opacity: 1, x: 0, scale: 1 } : undefined}
          transition={{
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: 0.25,
          }}
          className="mb-3"
          style={{
            fontFamily: "monospace",
            fontWeight: 300,
            color: "#999999",
            fontSize: "0.7rem",
            letterSpacing: "0.02em",
          }}
        >
          {project.tags.join(" · ")}
        </motion.div>
      )}
      <motion.p
        initial={{ opacity: 0, x: -30, scale: 0.95 }}
        animate={isInView ? { opacity: 1, x: 0, scale: 1 } : undefined}
        transition={{
          duration: 0.5,
          ease: [0.25, 0.46, 0.45, 0.94],
          delay: 0.3,
        }}
        className="text-base mb-4"
        style={{
          fontFamily: "var(--font-montserrat), sans-serif",
          fontWeight: 300,
          color: "#666666",
          lineHeight: 1.7,
        }}
      >
        {project.description}
      </motion.p>
      {project.badges?.length ? (
        <motion.div
          initial={{ opacity: 0, x: -20, scale: 0.95 }}
          animate={isInView ? { opacity: 1, x: 0, scale: 1 } : undefined}
          transition={{
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: 0.5,
          }}
          className={`flex flex-wrap items-start gap-3 ${isRight ? "justify-end" : ""}`}
          style={{ marginTop: project.badgesMt ?? 12 }}
        >
          {project.badges.map((badge, i) =>
            "text" in badge ? (
              <span
                key={i}
                style={{
                  fontFamily: "var(--font-montserrat), sans-serif",
                  fontWeight: 300,
                  color: "#999999",
                  fontSize: "0.7rem",
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                  marginRight: -8,
                  zIndex: 1,
                  position: "relative" as const,
                  alignSelf: "center",
                }}
              >
                {badge.text}
              </span>
            ) : (
              <a key={i} href={badge.href} target="_blank" rel="noopener noreferrer" style={badge.style ? Object.fromEntries(badge.style.split(";").filter(Boolean).map(s => { const [k, v] = s.split(":").map(x => x.trim()); return [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]; })) : undefined}>
                <img
                  src={badge.src}
                  alt={badge.alt}
                  width={badge.width}
                  height={badge.height}
                  className="border-0 outline-0"
                />
              </a>
            )
          )}
        </motion.div>
      ) : null}
    </div>
  );
}

function TimelineEntry({
  project,
  index,
  compact,
}: {
  project: TimelineProject;
  index: number;
  compact: boolean | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-100px" });
  const isLeft = !compact && index % 2 === 0;

  return (
    <div
      ref={ref}
      className={`relative grid items-center ${
        compact
          ? `grid-cols-[auto_1fr] gap-6`
          : "grid-cols-[1fr_auto_1fr] gap-6 md:gap-12 min-h-[320px]"
      }`}
    >
      {/* Left content (hidden in compact) */}
      {!compact && (
        <div className={`flex justify-end`}>
          {isLeft ? (
            <TextContent project={project} isInView={isInView} align="right" />
          ) : project.polaroids?.length ? (
            <PolaroidStack
              items={project.polaroids}
              side="left"
              index={index}
              year={project.year}
              title={project.title}
            />
          ) : null}
        </div>
      )}

      {/* Center node */}
      <div className="relative flex items-center justify-center w-4" style={{ overflow: "visible" }}>
        <TimelineNode />
      </div>

      {/* Right content */}
      <div className={`flex justify-start ${compact ? "mt-[50px]" : ""}`}>
        {compact ? (
          <div className="flex flex-col gap-6">
            <TextContent project={project} isInView={isInView} />
            {project.polaroids?.length ? (
              <div className="flex justify-end">
                <PolaroidStack
                  items={project.polaroids}
                  side="right"
                  index={index}
                  year={project.year}
                  title={project.title}
                />
              </div>
            ) : null}
          </div>
        ) : isLeft && project.polaroids?.length ? (
          <PolaroidStack
            items={project.polaroids}
            side="right"
            index={index}
            year={project.year}
            title={project.title}
          />
        ) : isLeft ? null : (
          <TextContent project={project} isInView={isInView} />
        )}
      </div>
    </div>
  );
}

export default function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const compact = useIsCompact();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const cowTop = useTransform(smoothProgress, (v) => `${v * 100}%`);
  const cowRotate = useTransform(smoothProgress, [0, 1], [0, 3600]);

  return (
    <section
      ref={containerRef}
      className="relative max-w-6xl mx-auto px-6 md:px-12 py-20"
      style={{ visibility: compact === null ? "hidden" : "visible" }}
    >
      <div className={compact ? "relative max-w-md mx-auto" : "relative"}>
        {/* The growing vertical line */}
        <div
          className={`absolute top-0 bottom-0 w-[2px] ${
            compact
              ? "left-[8px]"
              : "left-1/2 -translate-x-1/2"
          }`}
        >
          {/* Background track */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0, 0, 0, 0.06)" }}
          />

          {/* Animated fill */}
          <motion.div
            className="absolute top-0 left-0 right-0 origin-top"
            style={{
              background: "#000000",
              scaleY: smoothProgress,
              height: "100%",
            }}
          />

        </div>

        {/* Cow head at the leading edge */}
        <motion.div
          className={`absolute ${
            compact
              ? "left-[8px] -translate-x-1/2"
              : "left-1/2 -translate-x-1/2"
          }`}
          style={{
            top: cowTop,
            rotate: cowRotate,
            fontSize: "18px",
            lineHeight: 1,
            marginTop: "-10px",
            zIndex: 50,
          }}
        >
          🐮
        </motion.div>

        {/* Timeline entries */}
        <div className="relative space-y-8 md:space-y-16">
          {PROJECTS.map((project, index) => (
            <TimelineEntry key={`${project.year}-${project.title}`} project={project} index={index} compact={compact} />
          ))}

          {/* Archive link */}
          <div className={compact ? "" : "flex justify-center"}>
            <a
              href="/archives"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm hover:underline inline-link"
              style={{
                background: "#ffffff",
                border: "2px solid rgba(0, 0, 0, 0.06)",
                color: "rgba(0, 0, 0, 0.15)",
                fontFamily: "var(--font-montserrat), sans-serif",
                fontWeight: 600,
                textDecoration: "none",
                marginLeft: compact ? "-20px" : undefined,
              }}
            >
              + 36 more archived projects from 2013-2024
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

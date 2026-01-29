"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useSpring, useInView } from "framer-motion";
import PolaroidStack from "./PolaroidCard";
import type { PolaroidItem } from "./PolaroidCard";
import PROJECTS from "../../public/data/Work.json";

interface TimelineProject {
  id: string;
  year: string;
  title: string;
  description: string;
  tags: string[];
  polaroids: PolaroidItem[];
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
      className="z-0"
      initial={{ scale: 0, opacity: 0 }}
      animate={visible ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <div
        className="w-4 h-4 rounded-full border-2"
        style={{
          borderColor: "#333333",
          background: "#ffffff",
        }}
      />
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
      <motion.h3
        initial={{ opacity: 0, x: -30, scale: 0.95 }}
        animate={isInView ? { opacity: 1, x: 0, scale: 1 } : undefined}
        transition={{
          duration: 0.5,
          ease: [0.25, 0.46, 0.45, 0.94],
          delay: 0.2,
        }}
        className="text-xl md:text-2xl mb-3 leading-tight"
        style={{
          fontFamily: "var(--font-playfair), serif",
          fontWeight: 300,
          color: "#333333",
        }}
      >
        {project.title}
      </motion.h3>
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
      <motion.div
        initial={{ opacity: 0, x: -20, scale: 0.95 }}
        animate={isInView ? { opacity: 1, x: 0, scale: 1 } : undefined}
        transition={{
          duration: 0.5,
          ease: [0.25, 0.46, 0.45, 0.94],
          delay: 0.4,
        }}
        className={`flex flex-wrap gap-2 ${isRight ? "justify-end" : ""}`}
      >
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center whitespace-nowrap"
            style={{
              background: "rgba(0, 0, 0, 0.05)",
              padding: "8px 14px",
              borderRadius: "20px",
              color: "#333333",
              fontSize: "0.9em",
              transition: "transform 0.2s ease, background-color 0.2s ease, color 0.2s ease",
              transformOrigin: "center",
            }}
          >
            {tag}
          </span>
        ))}
      </motion.div>
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
  const isInView = useInView(ref, { once: true, margin: "-100px" });
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
          ) : (
            <PolaroidStack
              items={project.polaroids}
              side="left"
              index={index}
              year={project.year}
              projectId={project.id}
            />
          )}
        </div>
      )}

      {/* Center node */}
      <div className="relative flex items-center justify-center w-4">
        <TimelineNode />
      </div>

      {/* Right content */}
      <div className={`flex justify-start ${compact ? "mt-[50px]" : ""}`}>
        {compact ? (
          <div className="flex flex-col gap-6">
            <TextContent project={project} isInView={isInView} />
            <div className="flex justify-end">
              <PolaroidStack
                items={project.polaroids}
                side="right"
                index={index}
                year={project.year}
                projectId={project.id}
              />
            </div>
          </div>
        ) : isLeft ? (
          <PolaroidStack
            items={project.polaroids}
            side="right"
            index={index}
            year={project.year}
            projectId={project.id}
          />
        ) : (
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

  return (
    <section
      ref={containerRef}
      className="relative max-w-6xl mx-auto px-6 md:px-12 py-20"
      style={{ visibility: compact === null ? "hidden" : "visible" }}
    >
      <div className={compact ? "relative max-w-md mx-auto" : "relative"}>
        {/* The growing vertical line */}
        <div
          className={`absolute top-0 bottom-0 w-px ${
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
              background: "#333333",
              scaleY: smoothProgress,
              height: "100%",
            }}
          />
        </div>

        {/* Timeline entries */}
        <div className="relative space-y-8 md:space-y-16">
          {PROJECTS.map((project, index) => (
            <TimelineEntry key={project.id} project={project} index={index} compact={compact} />
          ))}
        </div>
      </div>
    </section>
  );
}

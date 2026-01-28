"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface PolaroidCardProps {
  imageSrc?: string;
  caption: string;
  rotation?: number;
  side: "left" | "right";
  index: number;
}

export default function PolaroidCard({
  imageSrc,
  caption,
  rotation,
  side,
  index,
}: PolaroidCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const cardRotation =
    rotation ?? (Math.random() * 4 - 2) * (index % 2 === 0 ? 1 : -1);

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        x: side === "left" ? -120 : 120,
        rotate: cardRotation + (side === "left" ? -8 : 8),
      }}
      animate={
        isInView
          ? {
              opacity: 1,
              x: 0,
              rotate: cardRotation,
            }
          : undefined
      }
      transition={{
        duration: 0.7,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 0.15,
      }}
      className="inline-block"
      style={{ rotate: `${cardRotation}deg` }}
    >
      <div
        className="bg-white p-3 pb-14 shadow-md transition-transform duration-200 hover:scale-105"
        style={{
          boxShadow:
            "0 4px 14px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
        }}
      >
        {/* Photo area */}
        <div className="w-56 h-56 md:w-64 md:h-64 overflow-hidden">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={caption}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full transition-colors duration-200"
              style={{ background: "rgba(0, 0, 0, 0.05)" }}
            />
          )}
        </div>

        {/* Caption */}
        <p
          className="mt-3 text-center text-sm"
          style={{
            fontFamily: "var(--font-montserrat), sans-serif",
            fontWeight: 300,
            color: "#666666",
          }}
        >
          {caption}
        </p>
      </div>
    </motion.div>
  );
}

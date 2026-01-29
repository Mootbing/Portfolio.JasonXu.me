"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "framer-motion";

export interface PolaroidItem {
  image: string;
  overlay: string;
  caption: string;
}

interface PolaroidStackProps {
  items: PolaroidItem[];
  side: "left" | "right";
  index: number;
  year?: string;
  projectId?: string;
}

const DRAG_THRESHOLD = 60;

// Deterministic pseudo-random rotation based on index to avoid hydration mismatch
const ROTATIONS = [1.8, -0.8, 0.6, -0.4, 0.2, -0.5, 1.2, -1.4, 0.9, -1.1];

function SinglePolaroid({
  item,
  rotation,
  stackOffset,
  zIndex,
  isDraggable,
  side,
  onSwipe,
  year,
  projectId,
  photoIndex,
}: {
  item: PolaroidItem;
  rotation: number;
  stackOffset: number;
  zIndex: number;
  isDraggable: boolean;
  side: "left" | "right";
  onSwipe: () => void;
  year?: string;
  projectId?: string;
  photoIndex: number;
}) {
  const x = useMotionValue(0);
  const rotateValue = useMotionValue(0);
  const baseTilt = (side === "left" ? -1 : 1) * 3;
  const dragRotate = useTransform(x, [-300, 0, 300], [-12 + baseTilt, baseTilt, 12 + baseTilt]);
  const sideMultiplier = side === "left" ? -1 : 1;
  const isFirstRender = useRef(true);
  const prevStackOffset = useRef(stackOffset);

  const getTargetX = useCallback(
    (offset: number) => (offset === 0 ? 0 : offset * 8 * sideMultiplier),
    [sideMultiplier]
  );

  // Animate x when stack position changes (e.g. card moves from front to back)
  useEffect(() => {
    const targetX = getTargetX(stackOffset);
    if (isFirstRender.current) {
      x.set(targetX);
      isFirstRender.current = false;
    } else if (prevStackOffset.current !== stackOffset) {
      animate(x, targetX, {
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 0.4,
      });
    }
    prevStackOffset.current = stackOffset;
  }, [stackOffset, x, getTargetX]);

  // Keep rotation in a single MotionValue to avoid snapping when isDraggable changes
  const isFirstRotate = useRef(true);
  const prevIsDraggable = useRef(isDraggable);
  useEffect(() => {
    if (isDraggable) {
      // Sync rotation with drag-based rotation
      if (isFirstRotate.current) {
        rotateValue.set(dragRotate.get());
        isFirstRotate.current = false;
      }
      const unsub = dragRotate.on("change", (v) => rotateValue.set(v));
      return unsub;
    } else {
      const target = rotation + stackOffset * 3 * sideMultiplier;
      if (isFirstRotate.current || !prevIsDraggable.current) {
        // First render or was already non-draggable — set directly or animate position change
        if (isFirstRotate.current) {
          rotateValue.set(target);
          isFirstRotate.current = false;
        } else {
          const controls = animate(rotateValue, target, {
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 0.4,
          });
          return () => controls.stop();
        }
      } else {
        // Was draggable, now isn't — animate from current rotation to target
        const controls = animate(rotateValue, target, {
          type: "spring",
          stiffness: 400,
          damping: 30,
          mass: 0.4,
        });
        return () => controls.stop();
      }
    }
    prevIsDraggable.current = isDraggable;
  }, [isDraggable, dragRotate, rotation, stackOffset, sideMultiplier, rotateValue]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (Math.abs(info.offset.x) > DRAG_THRESHOLD) {
        const direction = info.offset.x > 0 ? 1 : -1;
        animate(x, direction * 350, {
          type: "spring",
          stiffness: 300,
          damping: 30,
        });
        // Fire early so the card redirects mid-flight instead of pausing at 350px
        setTimeout(() => onSwipe(), 150);
      } else {
        animate(x, 0, {
          type: "spring",
          stiffness: 800,
          damping: 40,
        });
      }
    },
    [x, onSwipe]
  );

  return (
    <motion.div
      className="absolute top-0 left-0"
      style={{
        x,
        rotate: rotateValue,
        zIndex,
        cursor: isDraggable ? "grab" : "default",
      }}
      initial={false}
      animate={{
        y: stackOffset * 4,
        scale: 1 - stackOffset * 0.04,
        opacity: 1,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 0.4,
      }}
      drag={isDraggable ? "x" : false}
      dragConstraints={{ left: -300, right: 300 }}
      dragElastic={0.05}
      onDragEnd={isDraggable ? handleDragEnd : undefined}
      whileDrag={{ cursor: "grabbing", scale: 1.03 }}
    >
      <div
        className="bg-white p-3 pb-14 shadow-md select-none"
        style={{
          boxShadow:
            "0 4px 14px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
        }}
      >
        <div className="w-56 h-56 md:w-64 md:h-64 overflow-hidden pointer-events-none relative">
          {item.image ? (
            <img
              src={item.image}
              alt={item.caption}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: `rgba(0, 0, 0, ${0.03 + stackOffset * 0.02})`,
              }}
            />
          )}
          {item.overlay && (
            <img
              src={item.overlay}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
          )}
          {projectId && (
            <span
              className="absolute top-2 left-2 text-xs pointer-events-none"
              style={{
                fontFamily: "monospace",
                color: "#000000",
                letterSpacing: "0.05em",
              }}
            >
              {projectId.padStart(3, "0")}-{photoIndex + 1}.RAW
            </span>
          )}
          {year && (
            <span
              className="absolute bottom-2 right-2 text-xs pointer-events-none"
              style={{
                fontFamily: "monospace",
                color: "#000000",
                letterSpacing: "0.05em",
              }}
            >
              {year}
            </span>
          )}
        </div>
        <p
          className="mt-3 text-center text-base pointer-events-none"
          style={{
            fontFamily: "var(--font-caveat), cursive",
            fontWeight: 700,
            color: "#333333",
          }}
        >
          {item.caption}
        </p>
      </div>
    </motion.div>
  );
}

export default function PolaroidStack({
  items,
  side,
  index,
  year,
  projectId,
}: PolaroidStackProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [cardOrder, setCardOrder] = useState(() =>
    Array.from({ length: items.length }, (_, i) => i)
  );

  const baseRotation = ROTATIONS[index % ROTATIONS.length];

  const handleDismiss = useCallback(() => {
    setCardOrder((prev) => {
      const next = [...prev];
      const first = next.shift()!;
      next.push(first);
      return next;
    });
  }, []);

  const visibleCount = Math.min(items.length, 3);

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        scale: 0.7,
        rotate: baseRotation + (side === "left" ? -12 : 12),
      }}
      animate={isInView ? { opacity: 1, scale: 1, rotate: 0 } : undefined}
      transition={{
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 0.25,
      }}
      className="relative"
      style={{ width: "fit-content", height: "fit-content" }}
    >
      {/* Invisible spacer to hold layout */}
      <div className="invisible">
        <div className="bg-white p-3 pb-14">
          <div className="w-56 h-56 md:w-64 md:h-64" />
          <p className="mt-3 text-sm">&nbsp;</p>
        </div>
      </div>

      {/* Stacked cards */}
      {cardOrder.slice(0, visibleCount).map((itemIndex, stackPos) => (
        <SinglePolaroid
          key={`card-${itemIndex}`}
          item={items[itemIndex]}
          rotation={baseRotation}
          stackOffset={stackPos}
          zIndex={visibleCount - stackPos}
          isDraggable={stackPos === 0 && items.length > 1}
          side={side}
          onSwipe={handleDismiss}
          year={year}
          projectId={projectId}
          photoIndex={itemIndex}
        />
      ))}
    </motion.div>
  );
}

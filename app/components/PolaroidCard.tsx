"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  useInView,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "framer-motion";

export interface PolaroidItem {
  frontSquareMedia: string;
  frontCoverMedia: string;
  caption: string;
  backCoverMedia?: string;
}

interface PolaroidStackProps {
  items: PolaroidItem[];
  side: "left" | "right";
  index: number;
  year?: string;
  title?: string;
}

const DRAG_THRESHOLD = 60;
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".ogg"];
const isVideo = (src: string) =>
  VIDEO_EXTENSIONS.some((ext) => src.toLowerCase().endsWith(ext));

// Deterministic pseudo-random rotation based on index to avoid hydration mismatch
const ROTATIONS = [1.8, -0.8, 0.6, -0.4, 0.2, -0.5, 1.2, -1.4, 0.9, -1.1];

function MediaElement({
  src,
  alt,
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  if (isVideo(src)) {
    return (
      <video
        src={src}
        className={className}
        autoPlay
        loop
        muted
        playsInline
        draggable={false}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt ?? ""}
      className={className}
      draggable={false}
    />
  );
}

function PolaroidContent({
  item,
  year,
  title,
  photoIndex,
  sizeClass,
  stackOffset,
}: {
  item: PolaroidItem;
  year?: string;
  title?: string;
  photoIndex: number;
  sizeClass: string;
  stackOffset?: number;
}) {
  return (
    <div
      className="bg-white p-3 pb-14 shadow-md select-none"
      style={{
        boxShadow:
          "0 4px 14px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
      }}
    >
      <div className={`${sizeClass} overflow-hidden pointer-events-none relative`}>
        {item.frontSquareMedia ? (
          <MediaElement
            src={item.frontSquareMedia}
            alt={item.caption}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `rgba(0, 0, 0, ${0.03 + (stackOffset ?? 0) * 0.02})`,
            }}
          />
        )}
        {item.frontCoverMedia && (
          <MediaElement
            src={item.frontCoverMedia}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        )}
        {year && title && (
          <span
            className="absolute bottom-2 right-2 text-sm pointer-events-none"
            style={{
              fontFamily: "monospace",
              color: "#ff0000",
              letterSpacing: "0.05em",
            }}
          >
            {year}-{String(photoIndex + 1).padStart(3, "0")}{item.frontSquareMedia ? item.frontSquareMedia.substring(item.frontSquareMedia.lastIndexOf(".")).toUpperCase() : ".DNG"}
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
  );
}

function SinglePolaroid({
  item,
  rotation,
  stackOffset,
  zIndex,
  isDraggable,
  side,
  onSwipe,
  onTap,
  faded,
  year,
  title,
  photoIndex,
}: {
  item: PolaroidItem;
  rotation: number;
  stackOffset: number;
  zIndex: number;
  isDraggable: boolean;
  side: "left" | "right";
  onSwipe: () => void;
  onTap?: () => void;
  faded?: boolean;
  year?: string;
  title?: string;
  photoIndex: number;
}) {
  const x = useMotionValue(0);
  const rotateValue = useMotionValue(0);
  const wasDragged = useRef(false);
  const pointerStart = useRef({ x: 0, y: 0 });
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
        wasDragged.current = true;
        const direction = info.offset.x > 0 ? 1 : -1;
        animate(x, direction * 350, {
          type: "spring",
          stiffness: 300,
          damping: 30,
        });
        // Fire early so the card redirects mid-flight instead of pausing at 350px
        setTimeout(() => onSwipe(), 150);
      } else {
        // Small drag that didn't meet threshold — snap back, not a real drag
        animate(x, 0, {
          type: "spring",
          stiffness: 800,
          damping: 40,
        });
      }
    },
    [x, onSwipe]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (wasDragged.current) {
        wasDragged.current = false;
        return;
      }
      // Only count as tap if pointer didn't move
      const dx = e.clientX - pointerStart.current.x;
      const dy = e.clientY - pointerStart.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) return;
      onTap?.();
    },
    [onTap]
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
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={onTap ? handleClick : undefined}
      initial={false}
      animate={{
        y: stackOffset * 4,
        scale: faded ? 0.92 : 1 - stackOffset * 0.04,
        opacity: faded ? 0 : 1,
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
      <PolaroidContent
        item={item}
        year={year}
        title={title}
        photoIndex={photoIndex}
        sizeClass="w-56 h-56 md:w-64 md:h-64"
        stackOffset={stackOffset}
      />
    </motion.div>
  );
}

function ExpandedPolaroidOverlay({
  item,
  year,
  title,
  photoIndex,
  onDismiss,
}: {
  item: PolaroidItem;
  year?: string;
  title?: string;
  photoIndex: number;
  onDismiss: () => void;
}) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastTime = useRef(0);
  const velocity = useRef({ x: 0, y: 0 });

  const SENSITIVITY = 0.3;

  // Escape key handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onDismiss]);

  // Body scroll lock + hide blob cursor
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("polaroid-expanded");
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("polaroid-expanded");
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      lastTime.current = Date.now();
      velocity.current = { x: 0, y: 0 };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const now = Date.now();
      const dt = Math.max(now - lastTime.current, 1);
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      rotateY.set(rotateY.get() + dx * SENSITIVITY);
      rotateX.set(rotateX.get() - dy * SENSITIVITY);
      // Track velocity (degrees per ms) with smoothing
      velocity.current = {
        x: 0.8 * (dx * SENSITIVITY / dt) + 0.2 * velocity.current.x,
        y: 0.8 * (-dy * SENSITIVITY / dt) + 0.2 * velocity.current.y,
      };
      lastPointer.current = { x: e.clientX, y: e.clientY };
      lastTime.current = now;
    },
    [rotateX, rotateY]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    const vx = velocity.current.x;
    const vy = velocity.current.y;
    // Coast with velocity then decelerate — scale velocity to degrees
    const VELOCITY_SCALE = 800;
    animate(rotateX, rotateX.get() + vy * VELOCITY_SCALE, {
      type: "tween",
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    });
    animate(rotateY, rotateY.get() + vx * VELOCITY_SCALE, {
      type: "tween",
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    });
  }, [rotateX, rotateY]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0"
        style={{ zIndex: 10000, backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onDismiss}
      />

      {/* Card container with perspective */}
      <motion.div
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 10001, perspective: 1000 }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.6 }}
        transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.5 }}
      >
        {/* 3D rotatable card */}
        <motion.div
          className="pointer-events-auto relative"
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
            cursor: "grab",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            isDragging.current = false;
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Front face */}
          <div style={{ backfaceVisibility: "hidden" }}>
            <PolaroidContent
              item={item}
              year={year}
              title={title}
              photoIndex={photoIndex}
              sizeClass="w-72 h-72 md:w-80 md:h-80"
            />
          </div>

          {/* Back face */}
          <div
            className="absolute inset-0 bg-white select-none overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              boxShadow:
                "0 4px 14px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
            }}
          >
            {item.backCoverMedia && (
              <MediaElement
                src={item.backCoverMedia}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

export default function PolaroidStack({
  items,
  side,
  index,
  year,
  title,
}: PolaroidStackProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [cardOrder, setCardOrder] = useState(() =>
    Array.from({ length: items.length }, (_, i) => i)
  );
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const baseRotation = ROTATIONS[index % ROTATIONS.length];

  const handleDismiss = useCallback(() => {
    setCardOrder((prev) => {
      const next = [...prev];
      const first = next.shift()!;
      next.push(first);
      return next;
    });
  }, []);

  const handleTapTopCard = useCallback(() => {
    setExpandedIndex(cardOrder[0]);
  }, [cardOrder]);

  const handleDismissExpanded = useCallback(() => {
    setExpandedIndex(null);
  }, []);

  const visibleCount = items.length;

  return (
    <>
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
            onTap={stackPos === 0 ? handleTapTopCard : undefined}
            faded={stackPos === 0 && expandedIndex !== null}
            year={year}
            title={title}
            photoIndex={itemIndex}
          />
        ))}
      </motion.div>

      {/* Expanded overlay via portal */}
      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {expandedIndex !== null && (
              <ExpandedPolaroidOverlay
                key="expanded-polaroid"
                item={items[expandedIndex]}
                year={year}
                title={title}
                photoIndex={expandedIndex}
                onDismiss={handleDismissExpanded}
              />
            )}
          </AnimatePresence>,
          portalTarget
        )}
    </>
  );
}

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

export interface PolaroidMediaStyle {
  fit?: "cover" | "contain" | "fill" | "none" | "scale-down" | "contain-blur";
  maxWidth?: string | number;
  maxHeight?: string | number;
  objectPosition?: string;
}

export interface PolaroidItem {
  frontSquareMedia: string;
  frontCoverMedia: string;
  caption: string;
  backCoverMedia?: string;
  mediaStyle?: PolaroidMediaStyle;
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
  style,
  ref,
  playing,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLVideoElement>;
  playing?: boolean;
}) {
  const internalRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = internalRef.current;
    if (!video) return;
    if (playing) {
      // Don't reset currentTime — the parent component owns the playhead so
      // the expanded overlay can hand off seamlessly from the source's exact
      // position without flickering through frame 0.
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing]);

  if (isVideo(src)) {
    return (
      <video
        ref={(node) => {
          (internalRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLVideoElement | null>).current = node;
        }}
        src={src}
        className={className}
        style={style}
        preload="none"
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
      style={style}
      loading="lazy"
      decoding="async"
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
  videoRef,
  playing,
  large,
}: {
  item: PolaroidItem;
  year?: string;
  title?: string;
  photoIndex: number;
  sizeClass: string;
  stackOffset?: number;
  videoRef?: React.Ref<HTMLVideoElement>;
  playing?: boolean;
  large?: boolean;
}) {
  const ms = item.mediaStyle;
  const useBlurFill = ms?.fit === "contain-blur";
  const effectiveFit: React.CSSProperties["objectFit"] =
    ms?.fit === "contain-blur" ? "contain" : ms?.fit;
  const hasConstraint = !!(ms?.maxWidth || ms?.maxHeight);
  const mediaInlineStyle: React.CSSProperties | undefined = ms
    ? {
        objectFit: effectiveFit ?? "cover",
        objectPosition: ms.objectPosition,
        maxWidth: ms.maxWidth ?? "100%",
        maxHeight: ms.maxHeight ?? "100%",
        width: hasConstraint ? "auto" : "100%",
        height: hasConstraint ? "auto" : "100%",
        position: useBlurFill ? "relative" : undefined,
        zIndex: useBlurFill ? 1 : undefined,
      }
    : undefined;
  const frameExtraClass = ms ? " flex items-center justify-center" : "";
  const mediaClass = ms ? "" : "w-full h-full object-cover";

  return (
    <div
      className={`bg-white shadow-md select-none ${large ? "p-4 pb-16" : "p-3 pb-14"}`}
      style={{
        boxShadow:
          "0 4px 14px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
      }}
    >
      <div className={`${sizeClass} overflow-hidden pointer-events-none relative${frameExtraClass}`}>
        {useBlurFill && item.frontSquareMedia && (
          <MediaElement
            src={item.frontSquareMedia}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              filter: "blur(28px) saturate(1.25)",
              transform: "scale(1.18)",
              zIndex: 0,
            }}
            playing={playing}
          />
        )}
        {item.frontSquareMedia ? (
          <MediaElement
            ref={videoRef}
            src={item.frontSquareMedia}
            alt={item.caption}
            className={mediaClass}
            style={mediaInlineStyle}
            playing={playing}
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
      </div>
      <p
        className="mt-3 text-center pointer-events-none"
        style={{
          fontFamily: "var(--font-caveat), cursive",
          fontWeight: 700,
          color: "#333333",
          fontSize: large ? "1.6875rem" : "1.5rem",
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
  videoRef,
  playing,
  cardElRef,
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
  videoRef?: React.Ref<HTMLVideoElement>;
  playing?: boolean;
  cardElRef?: React.Ref<HTMLDivElement>;
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
    (offset: number) => (offset === 0 ? 0 : offset * 18 * sideMultiplier),
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
      if (isFirstRotate.current) {
        rotateValue.set(dragRotate.get());
        isFirstRotate.current = false;
      }
      const unsub = dragRotate.on("change", (v) => rotateValue.set(v));
      return unsub;
    } else {
      const target = rotation + stackOffset * 7 * sideMultiplier + (stackOffset === 0 ? baseTilt : 0);
      if (isFirstRotate.current || !prevIsDraggable.current) {
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
  }, [isDraggable, dragRotate, rotation, stackOffset, sideMultiplier, baseTilt, rotateValue]);

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

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (wasDragged.current) {
        wasDragged.current = false;
        return;
      }
      const dx = e.clientX - pointerStart.current.x;
      const dy = e.clientY - pointerStart.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) return;
      onTap?.();
    },
    [onTap]
  );

  return (
    <motion.div
      ref={cardElRef}
      className="absolute top-0 left-0"
      style={{
        x,
        rotate: rotateValue,
        zIndex,
        cursor: isDraggable ? "grab" : "default",
        touchAction: isDraggable ? "none" : "auto",
      }}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={onTap ? handleClick : undefined}
      initial={false}
      animate={{
        y: stackOffset * 10,
        scale: faded ? 1 : 1 - stackOffset * 0.06,
        opacity: faded ? 0 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 0.4,
        // Hide source instantly when handing off to the FLIP overlay; restore after
        // the overlay's exit animation finishes so the source doesn't pop in early.
        opacity: faded ? { duration: 0 } : { duration: 0, delay: 0.55 },
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
        sizeClass="w-72 h-72 md:w-80 md:h-80"
        stackOffset={stackOffset}
        videoRef={videoRef}
        playing={playing}
      />
    </motion.div>
  );
}

// Approximate target dimensions of the expanded polaroid frame (image + padding).
// Matches sizeClass="w-80 h-80 md:w-96 md:h-96" with PolaroidContent's `large` padding (p-4 pb-16).
// w-80 = 320, w-96 = 384; padding adds 32 (16 each side); height adds 16+64.
const TARGET_FRAME_W_DESKTOP = 384 + 32; // 416
const TARGET_FRAME_W_MOBILE = 320 + 32;  // 352

interface OriginRect {
  cx: number;        // visual center X in viewport coords (post-rotation)
  cy: number;        // visual center Y in viewport coords
  w: number;         // unrotated/unscaled width (offsetWidth)
  h: number;         // unrotated/unscaled height
  rotation: number;  // cumulative rotation in degrees, screen space
  scale: number;     // cumulative parent scale (visual size = w × scale)
}

// Walk up the DOM and sum the 2D rotation contributed by each parent's transform.
// Lets the FLIP start with the correct visual rotation (source can be tilted by both
// its own rotateValue motion value and parent scrapbook scatter rotation).
function getCumulativeRotation(el: HTMLElement | null): number {
  let rotation = 0;
  let cur: HTMLElement | null = el;
  while (cur && cur !== document.body) {
    const t = window.getComputedStyle(cur).transform;
    if (t && t !== "none") {
      try {
        const m = new DOMMatrix(t);
        rotation += (Math.atan2(m.b, m.a) * 180) / Math.PI;
      } catch {
        // ignore parse failures
      }
    }
    cur = cur.parentElement;
  }
  return rotation;
}

// Walk up the DOM and multiply the 2D scale contributed by each parent's transform.
// For matrix(a, b, c, d, tx, ty) the X scale magnitude is sqrt(a² + b²). Used by
// the FLIP so its end scale matches the polaroid's actual on-screen size (which
// is offsetWidth × cumulative parent scale, not just offsetWidth).
function getCumulativeScale(el: HTMLElement | null): number {
  let scale = 1;
  let cur: HTMLElement | null = el;
  while (cur && cur !== document.body) {
    const t = window.getComputedStyle(cur).transform;
    if (t && t !== "none") {
      try {
        const m = new DOMMatrix(t);
        const sx = Math.sqrt(m.a * m.a + m.b * m.b);
        if (sx > 0) scale *= sx;
      } catch {
        // ignore
      }
    }
    cur = cur.parentElement;
  }
  return scale;
}

function ExpandedPolaroidOverlay({
  item,
  year,
  title,
  photoIndex,
  initialTime,
  origin,
  onDismiss,
}: {
  item: PolaroidItem;
  year?: string;
  title?: string;
  photoIndex: number;
  initialTime?: number;
  origin: OriginRect | null;
  onDismiss: (currentTime?: number) => void;
}) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastTime = useRef(0);
  const velocity = useRef({ x: 0, y: 0 });
  const frontVideoRef = useRef<HTMLVideoElement>(null);

  const SENSITIVITY = 0.3;

  // FLIP delta: where the source card's center sits relative to the viewport center,
  // how much smaller the source is than the target frame, and how much it's rotated
  // visually. Computed once per mount.
  const flip = useRef<{ x: number; y: number; scale: number; rotate: number }>({
    x: 0, y: 0, scale: 1, rotate: 0,
  });
  if (origin && typeof window !== "undefined") {
    const isMd = window.innerWidth >= 768;
    const targetW = isMd ? TARGET_FRAME_W_DESKTOP : TARGET_FRAME_W_MOBILE;
    flip.current = {
      x: origin.cx - window.innerWidth / 2,
      y: origin.cy - window.innerHeight / 2,
      // Multiply by source's cumulative parent scale so the FLIP exit ends at
      // the polaroid's actual on-screen visual size (not the unscaled offsetWidth).
      scale: (origin.w * origin.scale) / targetW,
      rotate: origin.rotation,
    };
  }

  const dismissWithTime = useCallback(() => {
    onDismiss(frontVideoRef.current?.currentTime);
  }, [onDismiss]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissWithTime();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [dismissWithTime]);

  useEffect(() => {
    // html has `scrollbar-gutter: stable` (globals.css) so toggling body
    // overflow does NOT shift layout — no padding-right compensation needed.
    document.body.style.overflow = "hidden";
    document.body.classList.add("polaroid-expanded");
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("polaroid-expanded");
    };
  }, []);

  useEffect(() => {
    const video = frontVideoRef.current;
    if (!video || initialTime == null) return;
    const setTime = () => { video.currentTime = initialTime; };
    if (video.readyState >= 1) {
      setTime();
    } else {
      video.addEventListener("loadedmetadata", setTime, { once: true });
      return () => video.removeEventListener("loadedmetadata", setTime);
    }
  }, [initialTime]);

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
    animate(rotateX, 0, { type: "spring", stiffness: 80, damping: 18 });
    animate(rotateY, 0, { type: "spring", stiffness: 80, damping: 18 });
  }, [rotateX, rotateY]);

  const FLIP_TRANSITION = { duration: 0.55, ease: [0.32, 0.72, 0, 1] as const };

  return (
    <>
      {/* Backdrop: dark + blur. Click to dismiss. */}
      <motion.div
        className="fixed inset-0"
        style={{
          zIndex: 10000,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={FLIP_TRANSITION}
        onClick={dismissWithTime}
      />

      {/* Centered container — flexbox keeps the polaroid pinned to viewport center
          so framer-motion's x/y/scale on the inner div is a clean transform offset. */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 10001 }}
      >
        {/* FLIP wrapper: lerps from the captured source rect to centered+full-size,
            including the source's cumulative rotation so it doesn't pop upright. */}
        <motion.div
          className="pointer-events-auto"
          initial={{
            x: flip.current.x,
            y: flip.current.y,
            scale: flip.current.scale,
            rotate: flip.current.rotate,
          }}
          animate={{ x: 0, y: 0, scale: 1, rotate: 0 }}
          exit={{
            x: flip.current.x,
            y: flip.current.y,
            scale: flip.current.scale,
            rotate: flip.current.rotate,
          }}
          transition={FLIP_TRANSITION}
        >
          {/* Static perspective layer so the inner 3D rotate has depth without
              being scaled by the FLIP wrapper. */}
          <div style={{ perspective: 1200 }}>
            <motion.div
              className="relative"
              style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
                cursor: "grab",
                touchAction: "none",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={() => {
                isDragging.current = false;
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ backfaceVisibility: "hidden" }}>
                <PolaroidContent
                  item={item}
                  year={year}
                  title={title}
                  photoIndex={photoIndex}
                  sizeClass="w-80 h-80 md:w-96 md:h-96"
                  videoRef={frontVideoRef}
                  playing={true}
                  large={true}
                />
              </div>
              {/* Back face — only rendered when the polaroid actually has
                  back-cover media to show. Otherwise the bg-white div leaks a
                  subpixel sliver around the front face's edges. */}
              {item.backCoverMedia && (
                <div
                  className="absolute inset-0 bg-white select-none overflow-hidden"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    boxShadow:
                      "0 4px 14px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <MediaElement
                    src={item.backCoverMedia}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
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
  const isInView = useInView(ref, { once: false, margin: "-100px" });
  const [cardOrder, setCardOrder] = useState(() =>
    Array.from({ length: items.length }, (_, i) => i)
  );
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [expandedInitialTime, setExpandedInitialTime] = useState<number | undefined>();
  const [origin, setOrigin] = useState<OriginRect | null>(null);
  const topVideoRef = useRef<HTMLVideoElement>(null);
  const topCardElRef = useRef<HTMLDivElement>(null);
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
    const el = topCardElRef.current;
    if (el) {
      // getBoundingClientRect gives the AABB (post-rotation) → its center is the
      // source's true visual center. offsetWidth gives the unrotated/unscaled
      // frame width; cumulative parent scale captures the per-polaroid carousel
      // scale so the FLIP ends at the actual on-screen visual size.
      const r = el.getBoundingClientRect();
      setOrigin({
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        w: el.offsetWidth,
        h: el.offsetHeight,
        rotation: getCumulativeRotation(el),
        scale: getCumulativeScale(el),
      });
    }
    setExpandedInitialTime(topVideoRef.current?.currentTime ?? undefined);
    setExpandedIndex(cardOrder[0]);
  }, [cardOrder]);

  const handleDismissExpanded = useCallback((currentTime?: number) => {
    setExpandedIndex(null);
    if (currentTime != null && topVideoRef.current) {
      topVideoRef.current.currentTime = currentTime;
    }
  }, []);

  const visibleCount = items.length;

  return (
    <>
      <div
        ref={ref}
        className="relative"
        style={{ width: "fit-content", height: "fit-content", zIndex: 51 }}
      >
        {/* Invisible spacer to hold layout */}
        <div className="invisible">
          <div className="bg-white p-3 pb-14">
            <div className="w-72 h-72 md:w-80 md:h-80" />
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
            videoRef={stackPos === 0 ? topVideoRef : undefined}
            cardElRef={stackPos === 0 ? topCardElRef : undefined}
            playing={isInView}
          />
        ))}
      </div>

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
                initialTime={expandedInitialTime}
                origin={origin}
                onDismiss={handleDismissExpanded}
              />
            )}
          </AnimatePresence>,
          portalTarget
        )}
    </>
  );
}

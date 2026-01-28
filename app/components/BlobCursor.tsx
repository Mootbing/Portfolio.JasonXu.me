"use client";

import { useEffect, useRef } from "react";

type HoverType = "header" | "contact" | "button" | "skill" | "underline";

interface HoverTarget {
  type: HoverType;
  bounds: DOMRect;
}

const HOVER_CLASSES: Record<HoverType, string> = {
  header: "hover-header",
  contact: "hover-contact",
  button: "hover-button",
  skill: "hover-skill",
  underline: "hover-underline",
};

const DEFAULT_BLOB_SIZE = 20;
const SMOOTHING_FACTOR = 0.12;

export default function BlobCursor() {
  const blobRef = useRef<HTMLDivElement>(null);
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const blobX = useRef(0);
  const blobY = useRef(0);
  const blobWidth = useRef(DEFAULT_BLOB_SIZE);
  const blobHeight = useRef(DEFAULT_BLOB_SIZE);
  const currentHoverRef = useRef<HoverTarget | null>(null);
  const lastHoverTypeRef = useRef<HoverType | null>(null);

  useEffect(() => {
    const handleTouchStart = () => {
      const blob = blobRef.current;
      if (blob) {
        blob.style.display = "none";
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { once: true });

    const isPointInRect = (
      x: number,
      y: number,
      rect: DOMRect,
      padding = { top: 0, right: 0, bottom: 0, left: 0 }
    ): boolean => {
      return (
        x >= rect.left - padding.left &&
        x <= rect.right + padding.right &&
        y >= rect.top - padding.top &&
        y <= rect.bottom + padding.bottom
      );
    };

    const createBounds = (
      rect: DOMRect,
      padding = { top: 0, right: 0, bottom: 0, left: 0 }
    ): DOMRect => {
      return new DOMRect(
        rect.left - padding.left,
        rect.top - padding.top,
        rect.width + padding.left + padding.right,
        rect.height + padding.top + padding.bottom
      );
    };

    const checkHoverState = (
      clientX: number,
      clientY: number
    ): HoverTarget | null => {
      const target = document.elementFromPoint(clientX, clientY) as HTMLElement;
      if (!target) return null;

      const defaultPadding = { top: 2, right: 8, bottom: 2, left: 8 };

      const navLinks = document.querySelectorAll(".nav-link");
      for (const navLink of navLinks) {
        const rect = navLink.getBoundingClientRect();
        if (isPointInRect(clientX, clientY, rect)) {
          return {
            type: "header",
            bounds: createBounds(rect, defaultPadding),
          };
        }
      }

      const inlineLinks = document.querySelectorAll(".inline-link");
      for (const link of inlineLinks) {
        const rect = link.getBoundingClientRect();
        if (isPointInRect(clientX, clientY, rect)) {
          return {
            type: "header",
            bounds: createBounds(rect, defaultPadding),
          };
        }
      }

      const skillBubble = target.closest(".skill-bubble");
      if (skillBubble) {
        const rect = skillBubble.getBoundingClientRect();
        if (
          isPointInRect(clientX, clientY, rect, {
            top: 4,
            right: 8,
            bottom: 4,
            left: 8,
          })
        ) {
          return {
            type: "skill",
            bounds: createBounds(rect, {
              top: 4,
              right: 8,
              bottom: 4,
              left: 8,
            }),
          };
        }
      }

      return null;
    };

    const updateHoverState = (clientX: number, clientY: number) => {
      currentHoverRef.current = checkHoverState(clientX, clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.current = e.clientX;
      mouseY.current = e.clientY;
      updateHoverState(e.clientX, e.clientY);
    };

    const handleScroll = () => {
      updateHoverState(mouseX.current, mouseY.current);
    };

    const updateBlobClasses = (
      blob: HTMLDivElement,
      hoverType: HoverType | null
    ) => {
      Object.values(HOVER_CLASSES).forEach((className) =>
        blob.classList.remove(className)
      );
      if (hoverType) {
        blob.classList.add(HOVER_CLASSES[hoverType]);
      }
    };

    const smoothTransition = (current: number, target: number): number => {
      return current + (target - current) * SMOOTHING_FACTOR;
    };

    const animate = () => {
      const blob = blobRef.current;
      if (!blob) {
        requestAnimationFrame(animate);
        return;
      }

      const hover = currentHoverRef.current;
      const hoverType = hover?.type ?? null;

      if (hoverType !== lastHoverTypeRef.current) {
        updateBlobClasses(blob, hoverType);
        lastHoverTypeRef.current = hoverType;
      }

      if (hover) {
        const targetX = hover.bounds.left + hover.bounds.width / 2;
        const targetY = hover.bounds.top + hover.bounds.height / 2;
        blobX.current = smoothTransition(blobX.current, targetX);
        blobY.current = smoothTransition(blobY.current, targetY);
        blobWidth.current = smoothTransition(
          blobWidth.current,
          hover.bounds.width
        );
        blobHeight.current = smoothTransition(
          blobHeight.current,
          hover.bounds.height
        );
      } else {
        blobX.current = smoothTransition(blobX.current, mouseX.current);
        blobY.current = smoothTransition(blobY.current, mouseY.current);
        blobWidth.current = smoothTransition(
          blobWidth.current,
          DEFAULT_BLOB_SIZE
        );
        blobHeight.current = smoothTransition(
          blobHeight.current,
          DEFAULT_BLOB_SIZE
        );
      }

      blob.style.transform = "translate(-50%, -50%)";
      blob.style.left = `${blobX.current}px`;
      blob.style.top = `${blobY.current}px`;
      blob.style.width = `${blobWidth.current}px`;
      blob.style.height = `${blobHeight.current}px`;

      requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll, true);
    const animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("touchstart", handleTouchStart);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <div ref={blobRef} className="blob-cursor" />;
}

"use client";

import { useRef, useState, useEffect } from "react";
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

// vh of vertical scroll required per project transition
const SLIDE_VH = 90;

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

const MONTH_MAP: Record<string, string> = {
  Jan: "January", Feb: "February", Mar: "March", Apr: "April",
  May: "May", Jun: "June", Jul: "July", Aug: "August",
  Sep: "September", Oct: "October", Nov: "November", Dec: "December",
};

function expandYear(year: string): string {
  const parts = year.split(" ");
  if (parts.length === 2 && MONTH_MAP[parts[0]]) {
    return `${MONTH_MAP[parts[0]]} ${parts[1]}`;
  }
  return year;
}

// Rough hand-drawn-looking highlighter mark. Inline SVG background with a
// slightly wobbly Bezier outline so the edges look marker-drawn rather than
// a clean rectangle. `box-decoration-break: clone` so it survives line wraps.
function Highlight({ children }: { children: React.ReactNode }) {
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 30' preserveAspectRatio='none'><path d='M 3 7 C 60 3 120 8 160 5 S 197 7 198 9 L 196 24 C 140 28 90 23 50 26 S 4 25 3 23 Z' fill='rgb(253,224,71)' opacity='0.55'/></svg>`
  );
  return (
    <span
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,${svg}")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 92%",
        backgroundPosition: "0 60%",
        padding: "0 0.08em",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      } as React.CSSProperties}
    >
      {children}
    </span>
  );
}

// Parse `==text==` markers into <Highlight> wraps; leave the rest as text.
function parseHighlights(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /==(.+?)==/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<Highlight key={key++}>{match[1]}</Highlight>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

// Per-segment smoothstep — slow at each landing point (i/(N-1)), fast between.
// Polaroid motion eases into and out of every "rest" position.
function easeP(p: number, N: number): number {
  if (N <= 1) return p;
  const idx = p * (N - 1);
  const i = Math.floor(idx);
  const t = idx - i;
  const eased = t * t * (3 - 2 * t);
  return (i + eased) / (N - 1);
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
      className="inline-block ml-3"
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

function Badges({
  project,
  align,
}: {
  project: TimelineProject;
  align: "left" | "right" | "center";
}) {
  if (!project.badges?.length) return null;
  const justify =
    align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${justify}`}
      style={{ marginTop: project.badgesMt ?? 8 }}
    >
      {project.badges.map((badge, i) =>
        "text" in badge ? (
          <span
            key={i}
            style={{
              fontFamily: "var(--font-caveat), cursive",
              fontWeight: 400,
              color: "#999999",
              fontSize: "0.95rem",
              whiteSpace: "nowrap",
              marginRight: -8,
              alignSelf: "center",
            }}
          >
            {badge.text}
          </span>
        ) : (
          <a
            key={i}
            href={badge.href}
            target="_blank"
            rel="noopener noreferrer"
            style={
              badge.style
                ? Object.fromEntries(
                    badge.style
                      .split(";")
                      .filter(Boolean)
                      .map((s) => {
                        const [k, v] = s.split(":").map((x) => x.trim());
                        return [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v];
                      })
                  )
                : undefined
            }
          >
            <img
              src={badge.src}
              alt={badge.alt}
              width={badge.width}
              height={badge.height}
              loading="lazy"
              decoding="async"
              className="border-0 outline-0"
            />
          </a>
        )
      )}
    </div>
  );
}

// Per-character "handwritten in" animation. Each letter pops in with its own
// scale + tiny rotation so it feels like ink being laid down stroke-by-stroke
// instead of a left-to-right curtain pull. Tilts are deterministic by index
// (no Math.random → no SSR mismatch).
function HandwrittenText({ text, progress }: { text: string; progress: number }) {
  const chars = Array.from(text);
  const N = chars.length;
  // Each char's fade-in window is STAGGER * (1/N) of overall progress. >1 makes
  // adjacent chars overlap slightly (more natural writing flow than strict
  // sequential typing).
  const STAGGER = 1.5;
  // Speed is controlled externally — `progress` is already gated to ramp up
  // only after the polaroid lands at center, so use it directly.
  const wholeBlur = (1 - progress) * 10;
  return (
    <span
      style={{
        display: "inline-block",
        filter: wholeBlur > 0.05 ? `blur(${wholeBlur.toFixed(2)}px)` : undefined,
      }}
    >
      {chars.map((ch, i) => {
        const startAt = i / N;
        const windowSize = STAGGER / N;
        const local = clamp((progress - startAt) / windowSize, 0, 1);
        // Cubic ease-out: ink lays down quickly then settles.
        const eased = 1 - Math.pow(1 - local, 3);
        // Pseudo-random per-character tilt that resolves to 0 — gives the
        // freshly-written letters a hand-drawn wobble before settling.
        const seed = ((i * 9301 + 49297) % 233280) / 233280;
        const tilt = (seed - 0.5) * 14 * (1 - eased);
        const yLift = (1 - eased) * 6;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: eased,
              transform: `translateY(${yLift}px) scale(${0.5 + 0.5 * eased}) rotate(${tilt}deg)`,
              transformOrigin: "left bottom",
              whiteSpace: "pre",
            }}
          >
            {ch === " " ? " " : ch}
          </span>
        );
      })}
    </span>
  );
}

function ProjectSlide({
  project,
  index,
  total,
  progress,
  entryT,
}: {
  project: TimelineProject;
  index: number;
  total: number;
  progress: number;
  entryT: number;
}) {
  // Effective dist: how many viewport-widths this project's polaroid is from
  // viewport center. Positive = polaroid right of center (approaching), 0 =
  // centered, negative = past center moving left.
  // For project 0 during entry, `entryT` keeps dist > 0 even though progress = 0.
  const distEff = (index - progress * (total - 1)) + entryT;

  // Clip keyframes tied to the polaroid actually crossing the text region
  // (right: 25%, ~54%-75% from viewport left). Polaroid is ~24% wide. With
  // landing offset shifting polaroid_center to 25% + distEff*100% from left:
  //   polaroid touches text_right (75%) when distEff = 0.62
  //   polaroid past   text_left  (54%) when distEff = 0.17
  // → reveal window: distEff in [0.62, 0.17] (polaroid sweeps over text)
  //   next polaroid covers text when distEff_i in [-0.38, -0.83]
  // → hide window:   distEff in [-0.38, -0.83]
  const CLIP_STOPS: [number, number, number][] = [
    [ 1.00,   100,    0 ],
    [ 0.62,   100,    0 ],
    [ 0.17,     0,    0 ],
    [-0.38,     0,    0 ],
    [-0.83,     0,  100 ],
    [-2.00,     0,  100 ],
  ];

  let leftClip = CLIP_STOPS[CLIP_STOPS.length - 1][1];
  let rightClip = CLIP_STOPS[CLIP_STOPS.length - 1][2];
  // Stops are in descending order of distEff; find the segment we're in.
  for (let i = 0; i < CLIP_STOPS.length - 1; i++) {
    const [t1, l1, r1] = CLIP_STOPS[i];
    const [t2, l2, r2] = CLIP_STOPS[i + 1];
    if (distEff <= t1 && distEff >= t2) {
      const f = (t1 - distEff) / (t1 - t2);
      leftClip = l1 + (l2 - l1) * f;
      rightClip = r1 + (r2 - r1) * f;
      break;
    }
  }

  if (leftClip >= 100 || rightClip >= 100) return null;

  const clipPath = `inset(0 ${rightClip}% 0 ${leftClip}%)`;

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        right: "25%",
        // Shift the container right by half its own width so its CENTER sits at
        // 25% from the viewport's right edge (instead of its right edge sitting
        // there). Container is now visually centered at right: 25%.
        transform: "translate(50%, -50%)",
        // fit-content sizes the container to the actual text bounds so the
        // clip-path percentages map directly to text width (not a giant box).
        width: "fit-content",
        maxWidth: "min(560px, 40vw)",
        textAlign: "left",
        pointerEvents: "auto",
        clipPath,
        WebkitClipPath: clipPath,
      }}
    >
      {project.year && (
        <span
          className="block"
          style={{
            fontFamily: "var(--font-caveat), cursive",
            fontWeight: 400,
            color: "#999999",
            fontSize: "1.15rem",
            letterSpacing: "0.02em",
            marginBottom: "0.25rem",
          }}
        >
          {expandYear(project.year)}
        </span>
      )}
      <h3
        className="text-3xl md:text-5xl leading-none"
        style={{
          fontFamily: "var(--font-caveat), cursive",
          fontWeight: 700,
          color: "#222222",
          marginBottom: "0.75rem",
          // Caveat glyphs (especially trailing letters) extend slightly past
          // their metric width. Add a tiny right padding so titles without a
          // trailing link icon don't get clipped on the right edge.
          paddingRight: "0.15em",
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
      </h3>
      <p
        style={{
          fontFamily: "var(--font-caveat), cursive",
          fontWeight: 400,
          color: "#444444",
          fontSize: "1.25rem",
          lineHeight: 1.4,
        }}
      >
        {parseHighlights(project.description)}
      </p>
    </div>
  );
}

function Carousel() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const fixedRef = useRef<HTMLDivElement>(null);
  const polaroidsRef = useRef<HTMLDivElement>(null);
  const polaroidItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [progress, setProgress] = useState(0);
  // Default to 1 (polaroid 0 off-screen right) so initial render before any
  // scroll handler runs has all project text fully clipped — prevents a flash
  // of project 0's text on page load.
  const [entryProgress, setEntryProgress] = useState(1);
  const N = PROJECTS.length;
  const sectionHeight = `${100 + (N - 1) * SLIDE_VH}vh`;

  // The pinned content is a real `position: fixed` element — browser anchors it
  // to the viewport natively (zero JS lag, no scroll jitter). The empty section
  // just creates the scroll length, and the JS scroll handler drives:
  //  - opacity of the fixed pin (fade in/out as the section enters/exits)
  //  - the polaroid row's horizontal translate
  //  - per-polaroid spin/arc transforms
  //  - the React `progress` state that drives the text overlays
  useEffect(() => {
    let raf = 0;
    let lastProgress = -1;
    let lastEntryT = -1;
    let lastOpacity = -1;

    const update = () => {
      const section = sectionRef.current;
      const fixed = fixedRef.current;
      if (!section || !fixed) return;

      const rect = section.getBoundingClientRect();
      const winH = window.innerHeight;
      const sectionScroll = rect.height - winH;

      // Pin is always 100% opacity, always pointer-events: none. Interactive
      // children (polaroid cards via default `auto`, text fragments via
      // explicit `pointerEvents: auto`) still receive events; the pin itself
      // doesn't intercept clicks on empty viewport areas — so hero links and
      // anything underneath stay clickable.
      if (lastOpacity !== 1) {
        lastOpacity = 1;
        fixed.style.opacity = "1";
      }

      // Progress through the carousel, 0 → 1. Clamped so during fade in/out the
      // polaroids park at start/end positions instead of overshooting.
      const pRaw = sectionScroll > 0 ? clamp(-rect.top / sectionScroll, 0, 1) : 0;
      // Per-segment smoothstep so the polaroid decelerates into each landing.
      const p = easeP(pRaw, N);
      // Entry slide: polaroid 0 slides in horizontally from off-screen right
      // (just like the other polaroids do during carousel scroll). entryT is
      // the section's approach progress: 1 = section's top is one viewport
      // below (polaroid 0 off-screen right), 0 = section pinned (centered).
      const entryT = Math.max(0, Math.min(rect.top, winH)) / Math.max(winH, 1);
      const entryX = entryT * window.innerWidth;
      const polaroids = polaroidsRef.current;
      // Mirror of text positioning: text uses `right: 25% + translate(50%)`
      // to put its CENTER at 25% from the right. For polaroid: shift the row
      // by (25vw + half polaroid width ≈ 12vw) so the polaroid's LEFT edge
      // sits at 25% from viewport left, leaving its visual center further
      // right (analogous to the text container extending past its anchor).
      // Slot center = (- LANDING_OFFSET) + 50vw. For polaroid_left_edge = 25vw
      // → polaroid_center = 25 + 12 = 37vw → LANDING_OFFSET = 50 - 37 = 13vw.
      const LANDING_OFFSET_VW = 13;
      if (polaroids) {
        polaroids.style.transform = `translate3d(calc(${-p * (N - 1) * 100}vw + ${entryX}px - ${LANDING_OFFSET_VW}vw), -50%, 0)`;
      }

      // Per-polaroid spin + arc. Effective dist includes entryT so polaroid 0
      // looks like it's approaching center from one viewport-width to the right
      // during the entry phase — same spin/arc/scale behavior as any other
      // polaroid sliding into center.
      for (let i = 0; i < N; i++) {
        const el = polaroidItemRefs.current[i];
        if (!el) continue;
        const dist = (i - p * (N - 1)) + entryT;
        const absD = Math.abs(dist);
        // Linear rotation: constant rate as polaroid moves. No slow-at-center,
        // no acceleration. 540° per viewport-width of travel — polaroid is
        // upside down at the extremes, upright at center.
        const rot = -dist * 540;
        // Spline arc: lifts up on the way in/out, exactly 0 at the centerline.
        const arcY = absD < 1 ? -absD * (1 - absD) * 180 : 0;
        const scale = 1 - Math.min(absD * 0.12, 0.25);
        el.style.transform = `translate3d(0, ${arcY}px, 0) rotate(${rot}deg) scale(${scale})`;
      }

      if (p !== lastProgress) {
        lastProgress = p;
        setProgress(p);
      }
      // entryT also needs its own track — during approach phase p stays clamped
      // at 0 while entryT swings from 1 → 0, so we'd otherwise miss those updates
      // and stale state would keep project 0's text visible at the top.
      if (entryT !== lastEntryT) {
        lastEntryT = entryT;
        setEntryProgress(entryT);
      }
    };

    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [N]);

  return (
    <>
      {/* Empty scroll-driving section: provides scroll length only. */}
      <section
        ref={sectionRef}
        aria-hidden
        style={{ height: sectionHeight, position: "relative" }}
      />

      {/* Real position: fixed pin — natively anchored to viewport, no JS lag. */}
      <div
        ref={fixedRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "100vh",
          overflow: "hidden",
          opacity: 1,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {/* Polaroid row, vertically centered, JS updates translate3d for X. */}
        <div
          ref={polaroidsRef}
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            display: "flex",
            // Initial transform = scroll-0 state (entryT=1, p=0, LANDING_OFFSET=13vw).
            // entryX = 100vw, so translateX = 100vw - 13vw = 87vw → polaroid 0
            // sits off-screen right. Prevents flash on first paint before the
            // scroll handler runs.
            transform: "translate3d(87vw, -50%, 0)",
            willChange: "transform",
            zIndex: 1,
          }}
        >
          {PROJECTS.map((p, i) => (
            <div
              key={`${p.year}-${p.title}`}
              style={{
                width: "100vw",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 100vw",
                // Slot is the 100vw empty area; pointer-events: none lets clicks
                // outside the polaroid card fall through to the hero. The
                // wrapper inside re-enables `auto` for the polaroid card itself.
                pointerEvents: "none",
              }}
            >
              <div
                ref={(el) => {
                  polaroidItemRefs.current[i] = el;
                }}
                style={{
                  willChange: "transform",
                  transformOrigin: "center center",
                  pointerEvents: "auto",
                }}
              >
                {p.polaroids?.length ? (
                  <PolaroidStack
                    items={p.polaroids}
                    side="right"
                    index={i}
                    year={p.year}
                    title={p.title}
                  />
                ) : (
                  <div
                    style={{
                      fontFamily: "var(--font-caveat), cursive",
                      color: "#cccccc",
                      fontSize: "1.5rem",
                    }}
                  >
                    no photos for this one :)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Per-project text overlays — sit BEHIND the polaroid row at viewport
            center; revealed when the polaroid slides past. */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
          {PROJECTS.map((p, i) => (
            <ProjectSlide
              key={`${p.year}-${p.title}-text`}
              project={p}
              index={i}
              total={N}
              progress={progress}
              entryT={entryProgress}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function CompactList() {
  return (
    <section className="max-w-md mx-auto px-6 py-16 flex flex-col gap-16">
      {PROJECTS.map((project, index) => (
        <div key={`${project.year}-${project.title}`} className="flex flex-col items-center gap-6">
          <div className="w-full">
            {project.year && (
              <span
                className="block mb-1"
                style={{
                  fontFamily: "var(--font-caveat), cursive",
                  color: "#999999",
                  fontSize: "1.05rem",
                }}
              >
                {project.year}
              </span>
            )}
            <h3
              className="text-3xl mb-2 leading-tight"
              style={{
                fontFamily: "var(--font-caveat), cursive",
                fontWeight: 700,
                color: "#222222",
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
            </h3>
            <p
              className="mb-3"
              style={{
                fontFamily: "var(--font-caveat), cursive",
                fontWeight: 400,
                color: "#444444",
                fontSize: "1.25rem",
                lineHeight: 1.4,
              }}
            >
              {parseHighlights(project.description)}
            </p>
            {/* Tags hidden for now
            {project.tags?.length ? (
              <div
                className="mb-2"
                style={{
                  fontFamily: "monospace",
                  color: "#999999",
                  fontSize: "0.7rem",
                  letterSpacing: "0.02em",
                }}
              >
                {project.tags.join(" · ")}
              </div>
            ) : null}
            */}
            <Badges project={project} align="left" />
          </div>
          {project.polaroids?.length ? (
            <PolaroidStack
              items={project.polaroids}
              side="right"
              index={index}
              year={project.year}
              title={project.title}
            />
          ) : null}
        </div>
      ))}
    </section>
  );
}

export default function Timeline() {
  const compact = useIsCompact();

  if (compact === null) return <div style={{ minHeight: "100vh" }} />;

  return (
    <div className="relative">
      {compact ? <CompactList /> : <Carousel />}
      <div className={compact ? "pb-3 text-center" : "pt-12 pb-3 text-center"}>
        <a
          href="/all"
          className="inline-flex items-center gap-2 px-5 py-2.5 hover:underline inline-link"
          style={{
            color: "#999999",
            fontFamily: "var(--font-caveat), cursive",
            fontWeight: 400,
            fontSize: "1.15rem",
            textDecoration: "none",
          }}
        >
          +36 more from 2013–2024 →
        </a>
      </div>
    </div>
  );
}

"use client";

import { Fragment, useRef, useState, useEffect, useLayoutEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PolaroidStack from "./PolaroidCard";
import type { PolaroidItem } from "./PolaroidCard";
import PROJECTS from "../../public/data/Work.json";

// Carousel needs measurements committed before paint. SSR has no window —
// fall back to useEffect there (it's a no-op since the carousel is gated
// behind useIsCompact which only resolves on the client).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface TimelineProject {
  year: string;
  title: string;
  description: string;
  fullDescription?: string;
  link?: string;
  tags: string[];
  badges?: ({ href: string; src: string; alt: string; width: number; height: number; style?: string } | { text: string })[];
  badgesMt?: number;
  polaroids?: PolaroidItem[];
}

// vh of vertical scroll required per project transition
const SLIDE_VH = 90;

// At full carousel scroll, the last polaroid drifts this many viewport-widths
// past its landing position (toward viewport-left). Picked to land its center
// at viewport X = 30vw (30% from left / 70% from right). The carousel section
// is lengthened by END_OVERSHOOT * SLIDE_VH so the trailing scroll feels natural
// rather than abrupt.
const END_OVERSHOOT = 0.07;

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

// Same as parseHighlights but returns typed runs so AnimatedReveal can slice
// by visible char count and wrap highlighted runs in <Highlight>.
type TextRun = { type: "plain" | "highlight"; text: string };
function parseTextRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /==(.+?)==/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ type: "plain", text: text.slice(lastIndex, match.index) });
    }
    runs.push({ type: "highlight", text: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    runs.push({ type: "plain", text: text.slice(lastIndex) });
  }
  return runs;
}

// Length excluding the `==` markers — what the user actually sees and what the
// typewriter should ramp through.
function visibleLength(text: string): number {
  return text.replace(/==/g, "").length;
}

const CHAR_DURATION_MS = 180;
const STAGGER_MS_MAX = 7;
const REVEAL_TOTAL_MAX_MS = 700;
const BUTTON_FADE_MS = 110;
const HEIGHT_SMOOTH_MS = 280;

// Outer wrapper animates its own height to whatever the inner content's natural
// height resolves to (tracked via ResizeObserver). Discrete reflow jumps — like
// a typewritten char wrapping onto a new line, or all chars unmounting at the
// end of a collapse — become smooth eased transitions instead of snaps.
// overflow: hidden so the inner content can never paint outside the animated
// box (avoids text briefly overlapping siblings below during catch-up).
function HeightSmoother({ children }: { children: React.ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useIsoLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    setHeight(el.offsetHeight);
    const ro = new ResizeObserver(() => {
      if (innerRef.current) setHeight(innerRef.current.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      animate={{ height }}
      transition={{ duration: HEIGHT_SMOOTH_MS / 1000, ease: [0.32, 0.72, 0, 1] }}
      style={{
        // Vertical-only clip: the inner content can't paint past the animated
        // height (avoids text bleeding into siblings during catch-up), but
        // horizontally we extend the clip region far beyond the box so the
        // [more]/[less] button at the right edge of a tight line never gets
        // its trailing pixel clipped. `overflow: hidden` clips both axes;
        // mixing overflow-x/y forces auto and adds scrollbars; this is the
        // clean middle ground.
        clipPath:
          "polygon(-1000px 0, calc(100% + 1000px) 0, calc(100% + 1000px) 100%, -1000px 100%)",
      }}
    >
      <div ref={innerRef}>{children}</div>
    </motion.div>
  );
}

// Typewriter on expand: chars mount one at a time at staggerMs intervals so
// the inline flow grows organically (no FLIP scale artifacts). On collapse:
// all currently-mounted chars fade out together (opacity + blur), then unmount
// in a single batch — faster and cleaner than the reverse typewriter, and the
// layout snap at the end happens behind a curtain of already-faded text.
function AnimatedReveal({
  text,
  show,
  staggerMs,
}: {
  text: string;
  show: boolean;
  staggerMs: number;
}) {
  const runs = useMemo(() => parseTextRuns(text), [text]);
  const total = useMemo(
    () => runs.reduce((acc, r) => acc + r.text.length, 0),
    [runs]
  );
  const [count, setCount] = useState(show ? total : 0);
  const [fadingOut, setFadingOut] = useState(false);
  const countRef = useRef(count);
  countRef.current = count;

  useEffect(() => {
    if (show) {
      setFadingOut(false);
      if (countRef.current >= total) return;
      const id = window.setInterval(() => {
        const next = countRef.current + 1;
        countRef.current = next;
        setCount(next);
        if (next >= total) window.clearInterval(id);
      }, staggerMs);
      return () => window.clearInterval(id);
    }
    if (countRef.current === 0) return;
    setFadingOut(true);
    const timer = window.setTimeout(() => {
      countRef.current = 0;
      setCount(0);
      setFadingOut(false);
    }, CHAR_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [show, total, staggerMs]);

  const renderChars = (chars: string[]) =>
    chars.map((ch, i) => (
      <motion.span
        key={i}
        initial={{ opacity: 0, filter: "blur(6px)" }}
        animate={
          fadingOut
            ? { opacity: 0, filter: "blur(6px)" }
            : { opacity: 1, filter: "blur(0px)" }
        }
        transition={{ duration: CHAR_DURATION_MS / 1000, ease: "easeOut" }}
      >
        {ch}
      </motion.span>
    ));

  let offset = 0;
  return (
    <>
      {runs.map((run, ri) => {
        const runLen = run.text.length;
        const visibleInRun = Math.min(runLen, Math.max(0, count - offset));
        offset += runLen;
        if (visibleInRun === 0) return null;
        const chars = Array.from(run.text).slice(0, visibleInRun);
        return run.type === "highlight" ? (
          <Highlight key={ri}>{renderChars(chars)}</Highlight>
        ) : (
          <Fragment key={ri}>{renderChars(chars)}</Fragment>
        );
      })}
    </>
  );
}

type DiffSegment = { type: "kept" | "new"; text: string };

// Word-level LCS diff. If short's tokens are a subsequence of full's tokens,
// returns segments interleaving "kept" (matched) and "new" (inserted) runs of
// full. Otherwise returns the entire full as a single "new" segment.
//
// This lets the renderer keep old words anchored in place and only animate the
// inserted portions — spaces between kept words naturally expand as new chars
// typewriter into them and push the surrounding text apart.
function diffSegments(short: string, full: string): {
  segments: DiffSegment[];
  isSubsequence: boolean;
  totalNewLen: number;
  longestNewLen: number;
} {
  const sToks = short.split(/(\s+)/).filter((t) => t.length > 0);
  const fToks = full.split(/(\s+)/).filter((t) => t.length > 0);
  const m = sToks.length;
  const n = fToks.length;

  if (m === 0) {
    const len = visibleLength(full);
    return {
      segments: [{ type: "new", text: full }],
      isSubsequence: true,
      totalNewLen: len,
      longestNewLen: len,
    };
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        sToks[i - 1] === fToks[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const isSubsequence = dp[m][n] === m;

  if (!isSubsequence) {
    const len = visibleLength(full);
    return {
      segments: [{ type: "new", text: full }],
      isSubsequence: false,
      totalNewLen: len,
      longestNewLen: len,
    };
  }

  const matched = new Array<boolean>(n).fill(false);
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (sToks[i - 1] === fToks[j - 1]) {
      matched[j - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const segments: DiffSegment[] = [];
  for (let k = 0; k < n; k++) {
    const type: "kept" | "new" = matched[k] ? "kept" : "new";
    const last = segments[segments.length - 1];
    if (last && last.type === type) last.text += fToks[k];
    else segments.push({ type, text: fToks[k] });
  }

  let totalNewLen = 0;
  let longestNewLen = 0;
  for (const s of segments) {
    if (s.type === "new") {
      const len = visibleLength(s.text);
      totalNewLen += len;
      longestNewLen = Math.max(longestNewLen, len);
    }
  }
  return { segments, isSubsequence, totalNewLen, longestNewLen };
}

function DescriptionWithMore({ short, full }: { short: string; full?: string }) {
  const [open, setOpen] = useState(false);
  const [suffixOpen, setSuffixOpen] = useState(false);

  const trimmedShort = short.trim();
  const trimmedFull = full?.trim() ?? "";
  const hasMore = trimmedFull.length > 0 && trimmedFull !== trimmedShort;

  const diff = useMemo(() => {
    if (!hasMore) return null;
    return diffSegments(trimmedShort, trimmedFull);
  }, [trimmedShort, trimmedFull, hasMore]);

  // Stagger sized against the total new chars so the whole reveal fits inside
  // REVEAL_TOTAL_MAX_MS even with multiple insertion points (each segment runs
  // its own typewriter in parallel, but the budget is shared).
  const totalNewLen = diff?.totalNewLen ?? 0;
  const longestNewLen = diff?.longestNewLen ?? 0;
  const staggerMs = useMemo(() => {
    const len = Math.max(1, totalNewLen);
    return Math.min(
      STAGGER_MS_MAX,
      Math.max(2, (REVEAL_TOTAL_MAX_MS - CHAR_DURATION_MS) / len)
    );
  }, [totalNewLen]);
  // Expand: wait for the longest segment's ramp + deblur tail. Collapse: all
  // new segments fade out together in CHAR_DURATION_MS (plus a small buffer).
  const rampMs = longestNewLen * staggerMs;
  const buttonEnterDelayMs = open
    ? rampMs + CHAR_DURATION_MS
    : CHAR_DURATION_MS + 30;

  useEffect(() => {
    if (!hasMore) return;
    const t = setTimeout(() => setSuffixOpen(open), BUTTON_FADE_MS);
    return () => clearTimeout(t);
  }, [open, hasMore]);

  const button = hasMore && (
    <>
      {" "}
      <AnimatePresence mode="wait" initial={false}>
        <motion.button
          key={open ? "less" : "more"}
          type="button"
          className="inline-link"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: {
              duration: BUTTON_FADE_MS / 1000,
              delay: buttonEnterDelayMs / 1000,
            },
          }}
          exit={{ opacity: 0, transition: { duration: BUTTON_FADE_MS / 1000 } }}
          style={{
            fontFamily: "inherit",
            fontSize: "inherit",
            lineHeight: "inherit",
            color: "#999999",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          {open ? "[less]" : "[more]"}
        </motion.button>
      </AnimatePresence>
    </>
  );

  if (!hasMore || !diff) {
    return <>{parseHighlights(short)}</>;
  }

  // Mode A: short's tokens are a subsequence of full's. Render kept segments
  // statically and animate each "new" run independently — inserted chars push
  // the surrounding kept words apart organically as they type in.
  if (diff.isSubsequence) {
    return (
      <>
        {diff.segments.map((seg, i) =>
          seg.type === "kept" ? (
            <Fragment key={i}>{parseHighlights(seg.text)}</Fragment>
          ) : (
            <AnimatedReveal
              key={i}
              text={seg.text}
              show={suffixOpen}
              staggerMs={staggerMs}
            />
          )
        )}
        {button}
      </>
    );
  }

  // Mode B: full diverges from short — render short when collapsed, full
  // (typewritten) when expanded. No interleaving since there's no structural
  // alignment to preserve.
  return (
    <>
      {!suffixOpen && parseHighlights(short)}
      <AnimatedReveal
        text={trimmedFull}
        show={suffixOpen}
        staggerMs={staggerMs}
      />
      {button}
    </>
  );
}

// Linear progress — uniform horizontal velocity across the whole carousel. The
// previous per-segment smoothstep concentrated the slow-feel at each landing
// midpoint; now the slowness is spread evenly so polaroids drift in from the
// right at the same gentle rate they exit on the left.
function easeP(p: number, _N: number): number {
  return p;
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

// Parses an inline CSS string from Work.json into a React style object. Splits
// on `;` or `,` (commas at top level only — commas inside parens like
// `translate(10px, 20px)` are preserved). Each `prop: value` pair has its
// kebab-case key converted to camelCase. Tolerant of both separators because
// authors mostly write JSON-y commas; CSS-y semicolons work too.
function parseBadgeStyle(s: string): React.CSSProperties {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === ";" || ch === ",")) {
      if (current.trim()) parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);

  const out: Record<string, string> = {};
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const rawKey = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!rawKey || !value) continue;
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = value;
  }
  return out as React.CSSProperties;
}

function Badges({
  project,
  align,
  marginTop,
}: {
  project: TimelineProject;
  align: "left" | "right" | "center";
  marginTop?: number | string;
}) {
  if (!project.badges?.length) return null;
  const justify =
    align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${justify}`}
      style={{ marginTop: marginTop ?? project.badgesMt ?? 8 }}
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
            style={badge.style ? parseBadgeStyle(badge.style) : undefined}
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
  const distEff = (index - progress * (total - 1 + END_OVERSHOOT)) + entryT;

  // Clip keyframes tied to the polaroid actually crossing the text region.
  // Text anchor changed: now left: 50% (text left edge at viewport center),
  // so text occupies ~50vw → ~50+W vw (W ≈ 30vw for typical entries; capped
  // at 40vw). Polaroid is ~24vw wide; landing center at 37vw → polaroid_right
  // at 49vw + distEff*100vw. Compared to the old right: 25% anchor (text
  // centered at 75vw), text shifted ~10vw left for typical widths, so the
  // reveal/hide windows shift by ~-0.10 in distEff units.
  //   reveal: polaroid_right meets text_right_edge → starts ~0.52
  //           polaroid_right past text_left (50vw)  → completes ~0.07
  //   hide:   next polaroid mirrors symmetrically  → starts ~-0.48, ends ~-0.93
  const CLIP_STOPS: [number, number, number][] = [
    [ 1.00,   100,    0 ],
    [ 0.52,   100,    0 ],
    [ 0.07,     0,    0 ],
    [-0.48,     0,    0 ],
    [-0.93,     0,  100 ],
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
        left: "50%",
        transform: "translateY(-50%)",
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
      <HeightSmoother>
        <p
          style={{
            fontFamily: "var(--font-caveat), cursive",
            fontWeight: 400,
            color: "#444444",
            fontSize: "1.25rem",
            lineHeight: 1.4,
          }}
        >
          <DescriptionWithMore short={project.description} full={project.fullDescription} />
        </p>
      </HeightSmoother>
      <Badges project={project} align="left" marginTop="0.75rem" />
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
  // TRAVEL is the polaroid row's total horizontal traversal in viewport-widths.
  // Extending by END_OVERSHOOT past (N-1) makes the final polaroid drift past
  // its landing so it ends at 30% from viewport-left.
  const TRAVEL = N - 1 + END_OVERSHOOT;
  const sectionHeight = `${100 + TRAVEL * SLIDE_VH}vh`;

  // The pinned content is a real `position: fixed` element — browser anchors it
  // to the viewport natively (zero JS lag, no scroll jitter). The empty section
  // just creates the scroll length, and the JS scroll handler drives:
  //  - opacity of the fixed pin (fade in/out as the section enters/exits)
  //  - the polaroid row's horizontal translate
  //  - per-polaroid spin/arc transforms
  //  - the React `progress` state that drives the text overlays
  //
  // useLayoutEffect (not useEffect) so the FIRST update() runs synchronously
  // before paint. Critical on the mobile→desktop breakpoint crossover: the
  // Carousel just mounted, its initial state has polaroid 0 off-screen-right
  // and all text clipped, but the user may be scrolled mid-carousel. Without
  // a pre-paint measurement, the browser paints that stale state for one frame
  // before the post-paint useEffect fixes it — flashing the polaroids and text
  // out of sync.
  useIsoLayoutEffect(() => {
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
        polaroids.style.transform = `translate3d(calc(${-p * TRAVEL * 100}vw + ${entryX}px - ${LANDING_OFFSET_VW}vw), -50%, 0)`;
      }

      // Per-polaroid spin + arc. Effective dist includes entryT so polaroid 0
      // looks like it's approaching center from one viewport-width to the right
      // during the entry phase — same spin/arc/scale behavior as any other
      // polaroid sliding into center.
      // Once a polaroid's center crosses viewport X = 30vw (30% from left /
      // 70% from right) — i.e. dist < -0.07 — drag it back with a local X
      // offset so its visible leftward velocity drops to 40% of normal (60%
      // slowdown, matching the rotation slowdown factor). The polaroid lingers
      // longer in the left half of the viewport before exiting.
      const LATE_X_THRESHOLD = -0.07;
      const LATE_X_SLOWDOWN = 0.6; // fraction by which X velocity is reduced
      for (let i = 0; i < N; i++) {
        const el = polaroidItemRefs.current[i];
        if (!el) continue;
        const dist = (i - p * TRAVEL) + entryT;
        const absD = Math.abs(dist);
        // Linear rotation: constant rate across the whole travel — 60% slower
        // than the original 540°/viewport-width (216°/viewport-width). Polaroid
        // never goes upside down; the gentler spin reads from the moment it
        // enters from the right instead of only easing after midpoint.
        const rot = -dist * 216;
        // Spline arc: lifts up on the way in/out, exactly 0 at the centerline.
        const arcY = absD < 1 ? -absD * (1 - absD) * 180 : 0;
        const scale = 1 - Math.min(absD * 0.12, 0.25);
        // Counter-translate: 0 until threshold, then grows linearly with how
        // far past the threshold the polaroid has traveled. At dist=-0.07: 0vw.
        // At dist=-1: ~55.8vw (right-ward pull, lagging behind the row).
        const offsetVw =
          dist < LATE_X_THRESHOLD
            ? (LATE_X_THRESHOLD - dist) * 100 * LATE_X_SLOWDOWN
            : 0;
        el.style.transform = `translate3d(calc(${offsetVw}vw), ${arcY}px, 0) rotate(${rot}deg) scale(${scale})`;
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
    // Resize must run update() synchronously, NOT through the RAF debounce.
    // The polaroid row's inline transform mixes vw (auto-reflows) with px
    // (entryX, frozen until update() runs); per-polaroid offsetVw is also
    // frozen in the inline string. If we let the browser paint between the
    // resize and the next RAF, the px parts are stale relative to the
    // freshly-reflowed vw parts → polaroid and text clip drift out of sync
    // for a frame. Resize is infrequent enough that a sync update is fine.
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
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

      {/* Real position: fixed pin — natively anchored to viewport, no JS lag.
          data-carousel-pin lets Hero's clip-path scope its polaroid lookup
          to ONLY the carousel polaroid (not CompactList polaroids which
          share the .bg-white.p-3.pb-14 class). Without this, crossing the
          800px breakpoint upward briefly resolves the selector to a
          CompactList polaroid (CompactList hasn't unmounted yet), which
          sits centered in the page → Hero clips to ~50% and gets stuck. */}
      <div
        ref={fixedRef}
        data-carousel-pin
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
            <HeightSmoother>
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
                <DescriptionWithMore short={project.description} full={project.fullDescription} />
              </p>
            </HeightSmoother>
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
          href="/more"
          className="inline-flex items-center gap-2 px-5 py-2.5 hover:underline inline-link"
          style={{
            color: "#999999",
            fontFamily: "var(--font-caveat), cursive",
            fontWeight: 400,
            fontSize: "1.15rem",
            textDecoration: "none",
          }}
        >
          & 40 more since 2013 →
        </a>
      </div>
    </div>
  );
}

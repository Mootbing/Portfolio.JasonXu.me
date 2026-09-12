"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "framer-motion";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function RollingGlyph({ letter, index, position }: { letter: string; index: number; position: MotionValue<number> }) {
  const opacity = useTransform(position, (value) => {
    // Fade with distance from the reel's center, in either rolling direction.
    const proximity = Math.max(0, 1 - Math.abs(index - value));
    return proximity * proximity * (3 - 2 * proximity);
  });

  return (
    <motion.span
      style={{ display: "block", height: "1.15em", lineHeight: "1.15em", textAlign: "center", opacity }}
    >
      {letter}
    </motion.span>
  );
}

function RollingCharacter({
  character,
  dateValue,
  shouldAnimate,
  isFirst,
}: {
  character: string;
  dateValue: number;
  shouldAnimate: boolean;
  isFirst: boolean;
}) {
  const alphabet = DIGITS.includes(character) ? DIGITS : LETTERS;
  const previousDate = useRef(dateValue);
  const direction = useRef(0);
  const position = useMotionValue(alphabet.length + alphabet.indexOf(character));
  const y = useTransform(position, (value) => `${-value * 1.15}em`);

  // Track chronology without restarting a wheel whose character is unchanged.
  useEffect(() => {
    direction.current = Math.sign(dateValue - previousDate.current);
    previousDate.current = dateValue;
  }, [dateValue]);

  useEffect(() => {
    const step = direction.current;
    const destination = alphabet.indexOf(character);
    const restingPosition = alphabet.length + destination;
    if (!shouldAnimate || step === 0) {
      position.set(restingPosition);
      return;
    }

    // Start in the middle copy so either direction has a full reel available.
    // Preserve fractional positions when scrolling interrupts an unfinished roll.
    const current = ((position.get() % alphabet.length) + alphabet.length) % alphabet.length;
    const start = alphabet.length + current;
    const distance = ((step * (destination - current)) % alphabet.length + alphabet.length) % alphabet.length;
    if (distance < 0.001) {
      position.set(restingPosition);
      return;
    }
    position.set(start);
    const target = start + step * distance;

    const animation = animate(position, target, {
      duration: 0.85,
      ease: [0.22, 0.68, 0.22, 1],
      onComplete: () => position.set(restingPosition),
    });
    return () => animation.stop();
  }, [alphabet, character, position, shouldAnimate]);

  return (
    <span
      style={{
        display: "inline-block",
        width: alphabet === DIGITS ? "0.8em" : "1.15em",
        // Keep the full reel width for wide letters while tightening the spacing.
        marginLeft: isFirst ? 0 : alphabet === DIGITS ? "-0.1em" : "-0.25em",
        height: "1.15em",
        overflow: "hidden",
      }}
    >
      <motion.span style={{ display: "block", y }}>
        {alphabet.repeat(3).split("").map((letter, index) => (
          <RollingGlyph
            key={index}
            letter={letter}
            index={index}
            position={position}
          />
        ))}
      </motion.span>
    </span>
  );
}

function RollingLabel({ text, dateValue, shouldAnimate }: { text: string; dateValue: number; shouldAnimate: boolean }) {
  return text.split("").map((character, index) => (
    LETTERS.includes(character) || DIGITS.includes(character)
      ? <RollingCharacter key={index} character={character} dateValue={dateValue} shouldAnimate={shouldAnimate} isFirst={index === 0} />
      : <span key={index} style={{ lineHeight: "1.15em" }}>{character}</span>
  ));
}

export default function CornerDate({ date, reveal }: { date: string; reveal: number }) {
  const reducedMotion = useReducedMotion();
  const visible = reveal > 0;
  const [month = "", year = ""] = date.trim().split(/\s+/);
  const monthIndex = MONTHS.findIndex((name) => name.slice(0, 3).toLowerCase() === month.slice(0, 3).toLowerCase());
  const dateValue = Number(year) * 12 + monthIndex;
  const fullDate = monthIndex >= 0 ? `${MONTHS[monthIndex]} ${year}` : date;
  const monthLabel = month.slice(0, 3).toUpperCase();
  const yearLabel = `'${year.slice(-2)}`;
  const shouldAnimate = visible && !reducedMotion;
  const inset = "clamp(20px, 3vw, 48px)";

  return (
    <div
      aria-hidden={!visible}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3,
        pointerEvents: "none",
        visibility: visible ? "visible" : "hidden",
        opacity: reveal * 0.05,
        color: "#000000",
        fontFamily: "var(--font-montserrat), sans-serif",
        fontSize: "clamp(80px, 12vw, 192px)",
        fontWeight: 800,
        fontVariantNumeric: "tabular-nums",
        userSelect: "none",
      }}
    >
      <span className="sr-only">{fullDate}</span>
      <span aria-hidden="true" style={{ position: "absolute", top: inset, left: inset, display: "flex" }}>
        <RollingLabel text={monthLabel} dateValue={dateValue} shouldAnimate={shouldAnimate} />
      </span>
      <span aria-hidden="true" style={{ position: "absolute", bottom: inset, right: inset, display: "flex" }}>
        <RollingLabel text={yearLabel} dateValue={dateValue} shouldAnimate={shouldAnimate} />
      </span>
    </div>
  );
}

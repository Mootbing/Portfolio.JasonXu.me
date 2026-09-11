"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function RollingCharacter({
  character,
  dateValue,
  shouldAnimate,
}: {
  character: string;
  dateValue: number;
  shouldAnimate: boolean;
}) {
  const alphabet = DIGITS.includes(character) ? DIGITS : LETTERS;
  const previousDate = useRef(dateValue);
  const position = useMotionValue(alphabet.length + alphabet.indexOf(character));
  const y = useTransform(position, (value) => `${-value * 1.15}em`);

  useEffect(() => {
    const direction = Math.sign(dateValue - previousDate.current);
    previousDate.current = dateValue;
    const destination = alphabet.indexOf(character);
    const restingPosition = alphabet.length + destination;
    if (!shouldAnimate || direction === 0) {
      position.set(restingPosition);
      return;
    }

    // Start in the middle copy so either direction has a full reel available.
    // Preserve fractional positions when scrolling interrupts an unfinished roll.
    const current = ((position.get() % alphabet.length) + alphabet.length) % alphabet.length;
    const start = alphabet.length + current;
    const offset = ((direction * (destination - current)) % alphabet.length + alphabet.length) % alphabet.length;
    // A matching character still makes a full turn on every date change.
    const distance = offset < 0.001 ? alphabet.length : offset;
    position.set(start);
    const target = start + direction * distance;

    const animation = animate(position, target, {
      duration: 0.85,
      ease: [0.22, 0.68, 0.22, 1],
      onComplete: () => position.set(restingPosition),
    });
    return () => animation.stop();
  }, [alphabet, character, dateValue, position, shouldAnimate]);

  return (
    <span
      style={{ display: "inline-block", width: alphabet === DIGITS ? "0.8em" : "1.15em", height: "1.15em", overflow: "hidden" }}
    >
      <motion.span style={{ display: "block", y }}>
        {alphabet.repeat(3).split("").map((letter, index) => (
          <span
            key={index}
            style={{ display: "block", height: "1.15em", lineHeight: "1.15em", textAlign: "center" }}
          >
            {letter}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function RollingLabel({ text, dateValue, shouldAnimate }: { text: string; dateValue: number; shouldAnimate: boolean }) {
  return text.split("").map((character, index) => (
    LETTERS.includes(character) || DIGITS.includes(character)
      ? <RollingCharacter key={index} character={character} dateValue={dateValue} shouldAnimate={shouldAnimate} />
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
        opacity: reveal * 0.2,
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

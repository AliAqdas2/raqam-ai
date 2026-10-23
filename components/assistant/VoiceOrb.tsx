"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type OrbMode = "idle" | "listening" | "thinking" | "speaking";

/**
 * The gold "ر" orb — Raqam's voice. Its halo follows the live audio level
 * (mic while listening, the assistant's voice while speaking). The level is
 * written straight to a CSS variable each animation frame, so audio never
 * re-renders React.
 */
export function VoiceOrb({
  mode,
  getLevel,
  size = 176,
  onClick,
  label,
  className,
}: {
  mode: OrbMode;
  getLevel?: () => number;
  size?: number;
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion || !getLevel) return;
    let raf = 0;
    let smoothed = 0;
    const tick = () => {
      const target = mode === "listening" || mode === "speaking" ? getLevel() : 0;
      // Fast attack, slow release reads as "alive" without flicker.
      smoothed += (target - smoothed) * (target > smoothed ? 0.45 : 0.12);
      el.style.setProperty("--lvl", smoothed.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, getLevel, reduceMotion]);

  const Comp = onClick ? "button" : "div";

  return (
    <div
      ref={ref}
      className={cn("relative grid place-items-center", className)}
      style={{ width: size * 1.7, height: size * 1.7, ["--lvl" as string]: 0 }}
    >
      {/* Level-driven halos */}
      <span
        aria-hidden
        className="absolute rounded-full bg-[#E8B931]/15 transition-transform duration-75"
        style={{
          width: size,
          height: size,
          transform: "scale(calc(1.12 + var(--lvl) * 0.55))",
        }}
      />
      <span
        aria-hidden
        className="absolute rounded-full bg-[#E8B931]/10 transition-transform duration-100"
        style={{
          width: size,
          height: size,
          transform: "scale(calc(1.3 + var(--lvl) * 0.85))",
        }}
      />

      {/* Idle breathing */}
      {mode === "idle" && !reduceMotion ? (
        <motion.span
          aria-hidden
          className="absolute rounded-full border border-[#E8B931]/40"
          style={{ width: size, height: size }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      {/* Thinking: a gold arc orbiting the core */}
      {mode === "thinking" ? (
        <motion.span
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: size + 18,
            height: size + 18,
            background:
              "conic-gradient(from 0deg, transparent 0deg, #E8B931 70deg, transparent 140deg)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
          }}
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        />
      ) : null}

      <Comp
        type={onClick ? "button" : undefined}
        onClick={onClick}
        aria-label={label}
        className={cn(
          "relative grid place-items-center rounded-full outline-none",
          "bg-[radial-gradient(circle_at_35%_30%,#F6D46A,#E8B931_45%,#B98A12)]",
          "shadow-[0_18px_50px_-12px_rgba(232,185,49,0.55),inset_0_-8px_18px_rgba(120,80,0,0.25)]",
          onClick &&
            "cursor-pointer transition-transform active:scale-95 focus-visible:ring-4 focus-visible:ring-[#E8B931]/50 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0B3B26]",
        )}
        style={{
          width: size,
          height: size,
          transform: reduceMotion ? undefined : "scale(calc(1 + var(--lvl) * 0.06))",
        }}
      >
        <span
          className="pb-[0.12em] font-nastaliq font-bold leading-none text-[#0B3B26]"
          style={{ fontSize: size * 0.36 }}
          aria-hidden
        >
          ر
        </span>
      </Comp>
    </div>
  );
}

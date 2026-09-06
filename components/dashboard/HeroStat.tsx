"use client";

import * as React from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { formatPKR } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

type HeroStatVariant = "hero" | "secondary";

export interface HeroStatProps {
  /** Numeric PKR amount to animate */
  value: number;
  label: string;
  /** Plain-language Urdu/English line under the figure */
  hint: string;
  variant?: HeroStatVariant;
  className?: string;
}

/**
 * Dashboard money figure: animates digits on enter / when value changes.
 * Respects prefers-reduced-motion (static formatPKR).
 */
export function HeroStat({
  value,
  label,
  hint,
  variant = "secondary",
  className,
}: HeroStatProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduceMotion = useReducedMotion();

  const isHero = variant === "hero";
  // Gate first paint behind in-view unless reduced motion (show final immediately).
  const displayValue = reduceMotion || inView ? value : 0;
  const showStatic = !!reduceMotion;

  return (
    <div
      ref={ref}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-2xl p-5",
        isHero
          ? "bg-[#0F5132] text-[#EAF1EB] sm:col-span-2"
          : "border border-[#E7E2D6] bg-white text-[#14231B]",
        className,
      )}
    >
      <span
        className={cn(
          "text-[13px] leading-[1.7]",
          isHero ? "text-[#B9CFC1]" : "text-[#6B7A70]",
        )}
      >
        {label}
      </span>

      <div
        className={cn(
          "flex min-w-0 flex-wrap items-baseline gap-x-1.5 font-[var(--font-manrope)] font-extrabold tracking-[-.02em]",
          isHero
            ? "text-[clamp(28px,4vw,40px)]"
            : "text-[clamp(20px,2.1vw,28px)]",
          isHero ? "text-white" : "text-[#14231B]",
        )}
      >
        {showStatic ? (
          <span className="whitespace-nowrap">{formatPKR(value)}</span>
        ) : (
          <>
            <span className="text-[0.55em] font-bold opacity-80" aria-hidden>
              Rs.
            </span>
            <AnimatedNumber
              value={displayValue}
              className="whitespace-nowrap"
              aria-label={formatPKR(value)}
            />
          </>
        )}
      </div>

      <p
        className={cn(
          "text-[13px] leading-[1.8]",
          isHero ? "text-[#C5D9CC]" : "text-[#6B7A70]",
        )}
      >
        {hint}
      </p>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  motion,
  useSpring,
  useTransform,
  type SpringOptions,
  type HTMLMotionProps,
} from "framer-motion";
import { cn } from "@/lib/utils";

export type AnimatedNumberProps = {
  value: number;
  className?: string;
  springOptions?: SpringOptions;
  /** Locale for toLocaleString while animating (digits only — prefix separately). */
  locale?: string;
} & Omit<HTMLMotionProps<"span">, "children">;

const DEFAULT_SPRING: SpringOptions = {
  stiffness: 90,
  damping: 18,
  mass: 0.8,
};

/**
 * Motion-Primitives-style count-up. Animates the numeric value only;
 * keep currency prefixes (e.g. "Rs.") outside this component.
 */
export function AnimatedNumber({
  value,
  className,
  springOptions,
  locale = "en-PK",
  ...props
}: AnimatedNumberProps) {
  const spring = useSpring(value, { ...DEFAULT_SPRING, ...springOptions });
  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString(locale),
  );

  React.useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <motion.span className={cn("tabular-nums", className)} {...props}>
      {display}
    </motion.span>
  );
}

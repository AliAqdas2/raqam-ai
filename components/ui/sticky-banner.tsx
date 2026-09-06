"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type StickyBannerTone = "warn" | "danger" | "info" | "gold";

const TONE_STYLES: Record<
  StickyBannerTone,
  { bg: string; border: string; iconBg: string; iconFg: string }
> = {
  warn: {
    bg: "bg-[#FDF3D8]",
    border: "border-[#E8CE86]/60",
    iconBg: "bg-white/70",
    iconFg: "text-[#B07D2A]",
  },
  danger: {
    bg: "bg-[#FDE8E8]",
    border: "border-[#B3261E]/20",
    iconBg: "bg-white/70",
    iconFg: "text-[#B3261E]",
  },
  info: {
    bg: "bg-[#E6EFE9]",
    border: "border-[#0F5132]/15",
    iconBg: "bg-white/70",
    iconFg: "text-[#0F5132]",
  },
  gold: {
    bg: "bg-[#FBF6E8]",
    border: "border-[#E8B931]/40",
    iconBg: "bg-white/70",
    iconFg: "text-[#8A6B2E]",
  },
};

export interface StickyBannerProps {
  id: string;
  tone: StickyBannerTone;
  icon: React.ReactNode;
  title: string;
  body: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  dismissLabel: string;
  onDismiss: () => void;
  className?: string;
}

/**
 * In-page sticky-style alert strip — slide in once, large dismiss.
 * Adapted from Aceternity Sticky Banner for dashboard (not chrome forever).
 */
export function StickyBanner({
  id,
  tone,
  icon,
  title,
  body,
  primaryAction,
  secondaryAction,
  dismissLabel,
  onDismiss,
  className,
}: StickyBannerProps) {
  const reduceMotion = useReducedMotion();
  const styles = TONE_STYLES[tone];

  return (
    <motion.div
      layout={false}
      data-alert-id={id}
      role="alert"
      initial={reduceMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "sticky top-0 z-[6] overflow-hidden rounded-[16px] border",
        styles.bg,
        styles.border,
        className,
      )}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-[12px]",
            styles.iconBg,
            styles.iconFg,
          )}
        >
          {icon}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="font-reading text-[16px] font-bold leading-[1.7] text-[#14231B]">
            {title}
          </h3>
          <p className="font-reading text-[14px] leading-[1.9] text-[#4C5A52]">
            {body}
          </p>
          {(primaryAction || secondaryAction) && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {primaryAction}
              {secondaryAction}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[12px] border border-[#DCD6C8]/80 bg-white/80 px-4 text-[14px] font-medium text-[#4C5A52] outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-[#0F5132] focus-visible:ring-offset-2 sm:min-w-[7.5rem]"
        >
          {dismissLabel}
        </button>
      </div>
    </motion.div>
  );
}

export function StickyBannerSlot({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AnimatePresence mode="wait">{children}</AnimatePresence>;
}

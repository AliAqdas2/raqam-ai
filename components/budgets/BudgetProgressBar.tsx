"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";
import { calculateBudgetUtilization } from "@/lib/finance/calculations";
import { formatPKR } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n/ur";

export type BudgetProgressTone = "ok" | "half" | "warn" | "over";

export function getBudgetProgressTone(pct: number): BudgetProgressTone {
  if (pct >= 100) return "over";
  if (pct >= 80) return "warn";
  if (pct >= 60) return "half";
  return "ok";
}

export function getBudgetBarColor(tone: BudgetProgressTone): string {
  switch (tone) {
    case "over":
      return "#B3261E";
    case "warn":
      return "#C4622D";
    case "half":
      return "#D8A72A";
    default:
      return "#22B07D";
  }
}

function statusKey(tone: BudgetProgressTone): TranslationKey {
  switch (tone) {
    case "over":
      return "budgets.statusOver";
    case "warn":
      return "budgets.statusNear";
    case "half":
      return "budgets.statusHalf";
    default:
      return "budgets.statusOk";
  }
}

export interface BudgetProgressBarProps {
  name: string;
  icon?: string;
  spent: number;
  limit: number;
  /** Edit / delete (or other) controls — labeled buttons preferred */
  actions?: React.ReactNode;
  /** Tighter layout for dashboard widget */
  compact?: boolean;
  className?: string;
}

/**
 * Literacy-first budget row: remaining PKR dominates, status text + color,
 * animated fill (instant under prefers-reduced-motion).
 */
export function BudgetProgressBar({
  name,
  icon,
  spent,
  limit,
  actions,
  compact = false,
  className,
}: BudgetProgressBarProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();

  const pct =
    limit > 0 ? Math.round(calculateBudgetUtilization(spent, limit)) : 0;
  const fillPct = Math.min(Math.max(pct, 0), 100);
  const remaining = Math.max(limit - spent, 0);
  const tone = getBudgetProgressTone(pct);
  const color = getBudgetBarColor(tone);
  const warnPulse = tone === "warn" || tone === "over";

  const [didPulse, setDidPulse] = React.useState(false);
  React.useEffect(() => {
    if (!warnPulse || reduceMotion || didPulse) return;
    const id = window.setTimeout(() => setDidPulse(true), 1400);
    return () => window.clearTimeout(id);
  }, [warnPulse, reduceMotion, didPulse, pct]);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[14px] border border-[#E7E2D6] bg-white",
        compact ? "px-3.5 py-3" : "px-4 py-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span
            className={cn(
              "grid shrink-0 place-items-center rounded-[12px] bg-[#E6EFE9]",
              compact ? "h-10 w-10 text-[18px]" : "h-11 w-11 text-[20px]",
            )}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "min-w-0 font-medium leading-[1.7] text-[#14231B]",
                compact ? "text-[14px]" : "text-[15px]",
              )}
            >
              {name}
            </span>
            <div className="shrink-0 text-end">
              <p
                className={cn(
                  "font-[var(--font-manrope)] font-extrabold tracking-[-.02em] text-[#14231B]",
                  compact ? "text-[17px]" : "text-[20px]",
                )}
              >
                <span className="me-1 text-[12px] font-semibold text-[#6B7A70]">
                  {t("budgets.remainingLabel")}
                </span>
                {formatPKR(remaining)}
              </p>
            </div>
          </div>

          <p
            className="text-[13px] font-medium leading-[1.6]"
            style={{ color }}
          >
            {t(statusKey(tone))}
            {pct >= 100 ? (
              <span className="font-[var(--font-manrope)] font-normal opacity-90">
                {" "}
                ({pct}%)
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-full bg-[#EDEAE0]",
          compact ? "h-2" : "h-2.5",
          warnPulse && !didPulse && !reduceMotion ? "animate-pulse" : "",
        )}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={reduceMotion ? false : { width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 120, damping: 20 }
          }
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-[var(--font-manrope)] text-[12px] text-[#6B7A70]">
          {formatPKR(spent)} / {formatPKR(limit)}
          <span className="ms-1.5 text-[#8A9690]">({fillPct}%)</span>
        </span>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

/** Animated fill for the overall monthly budget summary. */
export function BudgetOverallBar({
  spent,
  limit,
  className,
}: {
  spent: number;
  limit: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const pct = limit > 0 ? Math.round(calculateBudgetUtilization(spent, limit)) : 0;
  const fillPct = Math.min(Math.max(pct, 0), 100);
  const tone = getBudgetProgressTone(pct);
  const color =
    tone === "ok" || tone === "half"
      ? undefined
      : getBudgetBarColor(tone);

  return (
    <div
      className={cn("h-[14px] overflow-hidden rounded-full bg-[#EDEAE0]", className)}
    >
      <motion.div
        className="h-full rounded-full"
        style={{
          background:
            color ?? "linear-gradient(90deg,#0F5132,#22B07D)",
        }}
        initial={reduceMotion ? false : { width: 0 }}
        animate={{ width: `${fillPct}%` }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 120, damping: 20 }
        }
      />
    </div>
  );
}

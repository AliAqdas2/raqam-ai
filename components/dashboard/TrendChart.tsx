"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";
import { expenseChangePct, type TrendPoint } from "@/lib/finance/trend";
import { formatPKR } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

const INCOME = "#2E8459";
const EXPENSE = "#C4622D";

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

/**
 * Paired income / expense bars per month. Time runs left→right in both
 * languages (the chart sits in an LTR box), the convention Urdu finance apps
 * and bank statements in Pakistan follow too.
 */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [active, setActive] = React.useState<number>(points.length - 1);

  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.expenses]));
  const change = expenseChangePct(points);
  const hasData = points.some((p) => p.income > 0 || p.expenses > 0);
  const sel = points[active] ?? points[points.length - 1];

  const monthLabel = (ms: number, long = false) =>
    new Date(ms).toLocaleDateString(language === "ur" ? "ur-PK" : "en-PK", {
      month: long ? "long" : "short",
      ...(long ? { year: "numeric" } : {}),
    });

  if (!hasData) {
    return (
      <p className="text-[13px] leading-[1.9] text-[#6B7A70]">
        {t("dashboard.trendUnavailable")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Selected month readout */}
      {sel ? (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <span className="text-[13px] text-[#6B7A70]">{monthLabel(sel.month, true)}</span>
          <div className="flex gap-4 font-[var(--font-manrope)] text-[13px]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: INCOME }} />
              <span className="text-[#6B7A70]">{t("dashboard.trendIncome")}</span>
              <span className="font-semibold">{formatPKR(sel.income)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: EXPENSE }} />
              <span className="text-[#6B7A70]">{t("dashboard.trendExpenses")}</span>
              <span className="font-semibold">{formatPKR(sel.expenses)}</span>
            </span>
          </div>
        </div>
      ) : null}

      <div dir="ltr" className="flex h-[150px] items-end gap-2" role="list">
        {points.map((p, i) => (
          <button
            key={p.month}
            type="button"
            role="listitem"
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={`${monthLabel(p.month, true)}: ${t("dashboard.trendIncome")} ${formatPKR(p.income)}, ${t("dashboard.trendExpenses")} ${formatPKR(p.expenses)}`}
            className={cn(
              "group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 rounded-[10px] px-1 pt-2 outline-none transition-colors",
              i === active ? "bg-[#F4F8F5]" : "hover:bg-[#FBF9F4]",
            )}
          >
            <div className="flex h-full w-full items-end justify-center gap-[3px]">
              {(
                [
                  [p.income, INCOME],
                  [p.expenses, EXPENSE],
                ] as const
              ).map(([value, color], j) => (
                <motion.span
                  key={j}
                  className="w-full max-w-[14px] rounded-t-[4px]"
                  style={{ background: color, opacity: i === active ? 1 : 0.55 }}
                  initial={reduceMotion ? false : { height: 0 }}
                  animate={{ height: `${Math.max(value > 0 ? 3 : 0, (value / max) * 100)}%` }}
                  transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
            </div>
            <span
              className={cn(
                "max-w-full truncate text-[11px]",
                i === active ? "font-semibold text-[#14231B]" : "text-[#8A9690]",
              )}
            >
              {monthLabel(p.month)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-[12px] text-[#8A9690]">
        <span dir="ltr" className="font-[var(--font-manrope)]">
          {t("dashboard.trendScale")} {compact(max)}
        </span>
        {change !== null ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[12.5px]",
              change > 0 ? "bg-[#F6E6E4] text-[#8A2E26]" : "bg-[#E6EFE9] text-[#0F5132]",
            )}
          >
            {change > 0 ? t("dashboard.trendUp") : t("dashboard.trendDown")}{" "}
            <span className="font-[var(--font-manrope)] font-semibold">
              {Math.abs(Math.round(change))}%
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { formatPKR } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n/ur";

export interface GoalCardGoal {
  id: string;
  name: string;
  nameUr?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: number;
  isCompleted: boolean;
}

export interface GoalCardProps {
  goal: GoalCardGoal;
  dateLocale: string;
  onContribute: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Brief celebrate after a successful contribute */
  celebrate?: boolean;
}

function progressCaptionKey(pct: number, completed: boolean): TranslationKey {
  if (completed || pct >= 100) return "goals.progress.done";
  if (pct >= 86) return "goals.progress.almost";
  if (pct >= 56) return "goals.progress.good";
  if (pct >= 46) return "goals.progress.half";
  if (pct >= 16) return "goals.progress.some";
  return "goals.progress.start";
}

function barColor(pct: number, completed: boolean): string {
  if (completed || pct >= 100) return "#22B07D";
  if (pct >= 60) return "#0F5132";
  return "#D8A72A";
}

/**
 * Goal card: name → animated PKR → progress + plain Urdu caption → contribute CTA.
 * Edit/delete live in an overflow menu (delete still needs AlertDialog upstream).
 */
export function GoalCard({
  goal,
  dateLocale,
  onContribute,
  onEdit,
  onDelete,
  celebrate = false,
}: GoalCardProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const name = goal.nameUr ?? goal.name;
  const pct =
    goal.targetAmount > 0
      ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
      : 0;
  const fillPct = Math.min(Math.max(pct, 0), 100);
  const color = barColor(pct, goal.isCompleted);
  const caption = t(progressCaptionKey(pct, goal.isCompleted));

  React.useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <article className="relative flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-reading text-[19px] font-bold leading-[1.7] text-[#14231B]">
          {name}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[12px] font-semibold",
              goal.isCompleted || pct >= 100
                ? "bg-[#E6EFE9] text-[#0F5132]"
                : pct >= 60
                  ? "bg-[#E6EFE9] text-[#0F5132]"
                  : "bg-[#FDF3D8] text-[#6B5B2E]",
            )}
          >
            {goal.isCompleted ? t("goals.completed") : `${pct}%`}
          </span>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={t("goals.moreActions")}
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-[10px] text-[#6B7A70] hover:bg-[#F1EEE4] hover:text-[#14231B]"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            <AnimatePresence>
              {menuOpen ? (
                <motion.div
                  role="menu"
                  initial={
                    reduceMotion ? false : { opacity: 0, scale: 0.94, y: -4 }
                  }
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={
                    reduceMotion
                      ? undefined
                      : { opacity: 0, scale: 0.96, y: -2 }
                  }
                  transition={{ duration: 0.15 }}
                  className="absolute end-0 top-[calc(100%+0.35rem)] z-20 min-w-[10rem] overflow-hidden rounded-[12px] border border-[#E7E2D6] bg-white p-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit();
                    }}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-[10px] px-3 text-start text-[14px] text-[#14231B] hover:bg-[#F4F8F5]"
                  >
                    <Pencil className="h-4 w-4 text-[#0F5132]" />
                    {t("goals.edit")}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-[10px] px-3 text-start text-[14px] text-[#B3261E] hover:bg-[#FDE8E8]"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("goals.delete")}
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-[var(--font-manrope)] text-[clamp(26px,5vw,32px)] font-extrabold leading-none tracking-[-.02em] text-[#0F5132]">
          <span className="me-1 text-[18px] font-bold text-[#6B7A70]">Rs.</span>
          <AnimatedNumber value={goal.currentAmount} />
          <span className="ms-2 text-[15px] font-semibold text-[#8A9690]">
            / {formatPKR(goal.targetAmount)}
          </span>
        </p>
        <p className="text-[14px] font-medium text-[#4C5A52]">{caption}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div
          className="h-3 overflow-hidden rounded-full bg-[#EDEAE0]"
          role="progressbar"
          aria-valuenow={fillPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={caption}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={false}
            animate={{ width: `${fillPct}%` }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 120, damping: 20 }
            }
          />
        </div>
        {goal.targetDate ? (
          <p className="text-[13px] text-[#6B7A70]">
            {t("goals.targetDate")}
            {": "}
            {new Date(goal.targetDate).toLocaleDateString(dateLocale, {
              month: "long",
              year: "numeric",
            })}
          </p>
        ) : null}
      </div>

      <AnimatePresence>
        {celebrate ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#E6EFE9] px-3 py-1 text-[13px] font-medium text-[#0F5132]"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t("goals.contribute.doneFlash")}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!goal.isCompleted ? (
        <button
          type="button"
          onClick={onContribute}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-[12px] bg-[#0F5132] px-4 text-[15px] font-medium text-white transition-colors hover:bg-[#14231B]"
        >
          {t("goals.contribute")}
        </button>
      ) : (
        <p className="text-center text-[14px] font-medium text-[#0F5132]">
          {t("goals.completed")}
        </p>
      )}
    </article>
  );
}

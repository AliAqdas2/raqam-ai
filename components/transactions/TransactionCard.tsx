"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatPKR } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/hooks/useTransactions";

export interface TransactionCardProps {
  transaction: Transaction;
  categoryName: string;
  categoryIcon?: string;
  sourceLabel: string;
  dateLabel: string;
  /** 0-based index for soft stagger */
  index?: number;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Amount-first expandable transaction row.
 * Default: icon · description · amount · date. Tap for notes/source/edit/delete.
 */
export function TransactionCard({
  transaction: tx,
  categoryName,
  categoryIcon,
  sourceLabel,
  dateLabel,
  index = 0,
  onEdit,
  onDelete,
}: TransactionCardProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = React.useState(false);

  const description = tx.descriptionUr ?? tx.description ?? "—";
  const isIncome = tx.type === "income";
  const staggerDelay = reduceMotion
    ? 0
    : Math.min(index * 0.04, 0.05);

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: staggerDelay }}
      className="overflow-hidden rounded-[14px] border border-[#E7E2D6] bg-white"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-start outline-none transition-colors hover:bg-[#FBF9F4] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F5132]"
      >
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-[12px] text-[18px]",
            isIncome ? "bg-[#E6EFE9]" : "bg-[#F6E6E4]",
          )}
          aria-hidden
        >
          {categoryIcon || (isIncome ? "＋" : "−")}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-[#14231B]">
            {description}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-[#6B7A70]">
            {categoryName}
            <span className="mx-1.5 text-[#DCD6C8]">·</span>
            {dateLabel}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "font-[var(--font-manrope)] text-[18px] font-extrabold tracking-[-.02em] tabular-nums",
              isIncome ? "text-[#0F5132]" : "text-[#14231B]",
            )}
          >
            {isIncome ? "+" : "−"}
            {formatPKR(tx.amount)}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[#8A9690] transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-t border-[#F4F1E8]"
          >
            <div className="flex flex-col gap-3 px-4 py-3.5">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#4C5A52]">
                <span>
                  <span className="text-[#8A9690]">
                    {t("transactions.sourceLabel")}
                    {": "}
                  </span>
                  {sourceLabel}
                </span>
                {tx.notes ? (
                  <span className="w-full font-reading leading-[1.8]">
                    <span className="text-[#8A9690]">
                      {t("transactions.form.notes")}
                      {": "}
                    </span>
                    {tx.notes}
                  </span>
                ) : null}
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[12px] bg-[#0F5132] px-4 text-[14px] font-medium text-white hover:bg-[#14231B]"
                >
                  {t("transactions.edit")}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-[12px] border border-[#DCD6C8] bg-white px-4 text-[14px] font-medium text-[#B3261E] hover:bg-[#FDE8E8]"
                >
                  {t("transactions.delete")}
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}

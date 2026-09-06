"use client";

import { motion } from "framer-motion";
import { ArrowUpLeft } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n/ur";

const CAPABILITIES: { key: TranslationKey; dot: string }[] = [
  { key: "assistant.badgeEducate", dot: "#31518F" },
  { key: "assistant.badgeAnalyze", dot: "#0F5132" },
  { key: "assistant.badgeRecommend", dot: "#C9A227" },
  { key: "assistant.badgeAct", dot: "#C4622D" },
];

const SUGGESTIONS: TranslationKey[] = [
  "assistant.suggestion1",
  "assistant.suggestion2",
  "assistant.suggestion3",
  "assistant.suggestion4",
];

export function ChatEmptyState({
  onSelect,
  highlightText,
}: {
  onSelect: (text: string) => void;
  /** Prefills/highlights matching suggestion (e.g. from onboarding) */
  highlightText?: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(440px 320px at 50% 30%, rgba(15,81,50,0.06), transparent 70%), radial-gradient(340px 260px at 50% 28%, rgba(232,185,49,0.05), transparent 72%)",
        }}
      />

      <motion.div
        className="flex flex-col items-center gap-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <span className="grid h-16 w-16 place-items-center rounded-[22px] bg-primary pb-1 font-[var(--font-nastaliq)] text-[30px] text-[#E8B931] shadow-[0_0_0_6px_rgba(232,185,49,0.14)]">
          ر
        </span>

        <div className="flex max-w-md flex-col items-center gap-2 text-center">
          <h2 className="font-reading text-[24px] font-bold leading-[1.9]">
            {t("assistant.greeting")}
          </h2>
          <p className="font-reading text-[14.5px] leading-[2] text-muted-foreground">
            {t("assistant.greetingDesc")}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {CAPABILITIES.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: c.dot }}
              />
              {t(c.key)}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="mt-8 grid w-full max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {SUGGESTIONS.map((key, i) => {
          const label = t(key);
          const highlighted =
            Boolean(highlightText) && highlightText === label;
          return (
            <motion.button
              key={key}
              type="button"
              onClick={() => onSelect(label)}
              className={
                highlighted
                  ? "group flex min-h-12 items-center justify-between gap-3 rounded-[14px] border border-[#0F5132]/40 bg-[#F4F8F5] px-4 py-3.5 text-start text-[14px] ring-2 ring-[#0F5132]/15 transition-colors"
                  : "group flex min-h-12 items-center justify-between gap-3 rounded-[14px] border border-border bg-card px-4 py-3.5 text-start text-[14px] transition-colors hover:border-primary/30 hover:bg-accent"
              }
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              whileHover={{ y: -2 }}
            >
              <span className="min-w-0">{label}</span>
              <ArrowUpLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, Mic, Phone, Plus, Square } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceOrb } from "@/components/assistant/VoiceOrb";
import type { FinancialSummary } from "@/hooks/useFinancialSummary";
import { formatPKR } from "@/lib/i18n/format";
import { cn, isLatinScript } from "@/lib/utils";

interface BudgetLine {
  categoryName: string;
  categoryNameUr: string;
  spent: number;
  limit: number;
}

/** Route a question to the assistant, which sends it in a fresh chat. */
export function askHref(question: string): string {
  return `/assistant?q=${encodeURIComponent(question)}`;
}

/**
 * Chips grounded in the user's own numbers: the most-stretched budget and the
 * biggest spending category come first, then general prompts.
 */
function useSuggestions(
  summary: FinancialSummary | null | undefined,
  budgets: BudgetLine[],
): string[] {
  const { t, language } = useLanguage();
  return React.useMemo(() => {
    const out: string[] = [];
    const tight = [...budgets]
      .filter((b) => b.limit > 0)
      .sort((a, b) => b.spent / b.limit - a.spent / a.limit)[0];
    if (tight && tight.spent / tight.limit >= 0.6) {
      const name = language === "ur" ? tight.categoryNameUr : tight.categoryName;
      out.push(t("ask.chipBudgetLeft").replace("{category}", name));
    }
    const top = summary?.categoryBreakdown?.[0];
    if (top) {
      const name = language === "ur" ? top.nameUr : top.name;
      out.push(t("ask.chipCutCategory").replace("{category}", name));
    }
    out.push(t("ask.chipMonthSummary"), t("ask.chipAfford"), t("ask.chipAddExpense"));
    return out.slice(0, 4);
  }, [summary, budgets, t, language]);
}

export function AskRaqam({
  summary,
  budgets,
  onAddTransaction,
}: {
  summary: FinancialSummary | null | undefined;
  budgets: BudgetLine[];
  onAddTransaction: () => void;
}) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const voice = useVoiceInput(language === "ur" ? "ur-PK" : "en-US");
  const suggestions = useSuggestions(summary, budgets);

  const [question, setQuestion] = React.useState("");
  const [fromVoice, setFromVoice] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const firstName = (user?.name || "").split(" ")[0];
  const hour = new Date().getHours();
  const greetingKey =
    hour < 12 ? "ask.greetMorning" : hour < 17 ? "ask.greetAfternoon" : "ask.greetEvening";

  const ask = (text: string) => {
    const q = text.trim();
    if (!q) return;
    router.push(askHref(q));
  };

  // Voice → transcript lands in the box for review; the user presses Ask.
  const handleMic = async () => {
    if (voice.isListening) {
      voice.stopListening();
      const res = await voice.waitForResult();
      if (res.transcript) {
        setQuestion(res.transcript);
        setFromVoice(true);
        inputRef.current?.focus();
      }
    } else {
      setQuestion("");
      setFromVoice(false);
      voice.startListening();
    }
  };

  const top = summary?.categoryBreakdown?.[0];
  const listening = voice.isListening;
  const transcribing = voice.processing;

  return (
    <section
      aria-labelledby="ask-raqam-title"
      className="relative overflow-hidden rounded-[22px] bg-[#0B3B26] text-[#EAF1EB]"
    >
      {/* Lattice ground, echoing the call screen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #E8B931 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[14px] text-[#8FB49E]">
              {t(greetingKey)}
              {firstName ? `، ${firstName}` : ""}
            </p>
            <button
              type="button"
              onClick={onAddTransaction}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-[13px] text-[#DCE7DF] transition-colors hover:bg-white/10"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t("ask.addTransaction")}
            </button>
          </div>

          <h1
            id="ask-raqam-title"
            className="font-reading text-[26px] font-bold leading-[1.9] text-white sm:text-[32px]"
          >
            {t("ask.title")}
          </h1>

          {/* Query box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
            className={cn(
              "flex items-center gap-2 rounded-[16px] bg-white p-1.5 ps-4 text-[#14231B] shadow-[0_14px_40px_-18px_rgba(0,0,0,0.6)] transition-shadow",
              "focus-within:ring-4 focus-within:ring-[#E8B931]/35",
            )}
          >
            <input
              ref={inputRef}
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                setFromVoice(false);
              }}
              dir={question && isLatinScript(question) ? "ltr" : "auto"}
              placeholder={
                listening
                  ? t("voice.recording")
                  : transcribing
                    ? t("voice.transcribing")
                    : t("ask.placeholder")
              }
              aria-label={t("ask.title")}
              disabled={listening || transcribing}
              className="min-h-12 min-w-0 flex-1 bg-transparent text-[16px] placeholder:text-[#8A9690] focus:outline-none"
            />
            {voice.supported ? (
              <button
                type="button"
                onClick={handleMic}
                disabled={transcribing}
                aria-label={listening ? t("voice.stop") : t("assistant.speak")}
                aria-pressed={listening}
                className={cn(
                  "relative grid h-11 w-11 shrink-0 place-items-center rounded-[12px] transition-colors",
                  listening
                    ? "bg-[#B3261E] text-white"
                    : "bg-[#E6EFE9] text-[#0F5132] hover:bg-[#D5E5DA]",
                )}
              >
                {listening && !reduceMotion ? (
                  <span className="absolute inset-0 animate-ping rounded-[12px] bg-[#B3261E]/40" />
                ) : null}
                {transcribing ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : listening ? (
                  <Square className="relative h-3.5 w-3.5 fill-current" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>
            ) : null}
            <button
              type="submit"
              disabled={!question.trim()}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[12px] bg-[#0F5132] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#14231B] disabled:opacity-40"
            >
              <span>{t("ask.submit")}</span>
              <ArrowUp className="h-4 w-4" aria-hidden />
            </button>
          </form>
          <AnimatePresence>
            {fromVoice ? (
              <motion.p
                className="-mt-2 text-[12.5px] text-[#B9CFC1]"
                initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {t("ask.voiceReview")}
              </motion.p>
            ) : null}
          </AnimatePresence>

          {/* Suggestions */}
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="min-h-10 rounded-full border border-white/15 bg-white/[0.06] px-3.5 text-start text-[13.5px] text-[#EAF1EB] transition-colors hover:border-[#E8B931]/60 hover:bg-white/[0.12]"
              >
                {s}
              </button>
            ))}
          </div>

          {/* One grounded insight from real data */}
          {top && (summary?.totalExpenses ?? 0) > 0 ? (
            <button
              type="button"
              onClick={() =>
                ask(
                  t("ask.chipCutCategory").replace(
                    "{category}",
                    language === "ur" ? top.nameUr : top.name,
                  ),
                )
              }
              className="group flex w-fit max-w-full items-center gap-2 text-start text-[13.5px] text-[#B9CFC1]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E8B931]" aria-hidden />
              <span>
                {t("ask.insightTopSpend")
                  .replace("{category}", language === "ur" ? top.nameUr : top.name)
                  .replace("{amount}", formatPKR(top.amount))
                  .replace("{pct}", String(Math.round(top.percentage)))}
              </span>
              <span className="shrink-0 text-[#E8B931] underline-offset-4 group-hover:underline">
                {t("ask.insightAskWhy")}
              </span>
            </button>
          ) : null}
        </div>

        {/* Call Raqam — the orb */}
        <div className="flex items-center gap-4 rounded-[18px] border border-white/10 bg-white/[0.04] p-3 pe-5 lg:flex-col lg:gap-1 lg:border-0 lg:bg-transparent lg:p-0">
          <VoiceOrb
            mode="idle"
            size={reduceMotion ? 64 : 72}
            className="-m-6 lg:m-0"
            onClick={() => router.push("/assistant?call=1")}
            label={t("call.cta")}
          />
          <div className="flex flex-col lg:items-center lg:text-center">
            <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-white">
              <Phone className="h-4 w-4 text-[#E8B931]" aria-hidden />
              {t("call.cta")}
            </span>
            <span className="text-[12.5px] text-[#8FB49E]">{t("call.ctaHint")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

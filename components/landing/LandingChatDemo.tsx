"use client";

import * as React from "react";

type Lang = "ur" | "en";

interface Turn {
  role: "user" | "assistant" | "card";
  text?: string;
  card?: { title: string; amount: string; category: string };
}

const SCRIPT: Record<Lang, Turn[]> = {
  ur: [
    { role: "user", text: "اس مہینے کھانے پر کتنا خرچ ہوا؟" },
    {
      role: "assistant",
      text: "آپ کے لین دین کے مطابق اس مہینے کھانے پر Rs. 15,800 خرچ ہوئے — یہ آپ کے Rs. 18,000 بجٹ کا 88٪ ہے۔",
    },
    { role: "user", text: "۵۰۰ کا پیٹرول شامل کرو" },
    {
      role: "card",
      card: { title: "نیا خرچ", amount: "Rs. 500", category: "نقل و حمل" },
    },
  ],
  en: [
    { role: "user", text: "How much did I spend on food this month?" },
    {
      role: "assistant",
      text: "Based on your transactions, you've spent Rs. 15,800 on food this month — 88% of your Rs. 18,000 budget.",
    },
    { role: "user", text: "Add 500 for petrol" },
    {
      role: "card",
      card: { title: "New expense", amount: "Rs. 500", category: "Transport" },
    },
  ],
};

const LABELS: Record<
  Lang,
  { proposed: string; confirm: string; reject: string }
> = {
  ur: {
    proposed: "تصدیق درکار",
    confirm: "تصدیق کریں",
    reject: "منسوخ",
  },
  en: {
    proposed: "Needs confirmation",
    confirm: "Confirm",
    reject: "Cancel",
  },
};

/**
 * Scripted looping preview of the assistant — no backend.
 * Remount with `key={lang}` so language switches restart cleanly.
 */
export function LandingChatDemo({ lang }: { lang: Lang }) {
  const script = SCRIPT[lang];
  const L = LABELS[lang];
  const [shown, setShown] = React.useState(0);
  const [typing, setTyping] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const run = (i: number) => {
      if (cancelled) return;
      if (i >= script.length) {
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setShown(0);
            run(0);
          }, 4000),
        );
        return;
      }
      const turn = script[i];
      const preDelay = i === 0 ? 500 : 900;
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          if (turn.role === "assistant") {
            setTyping(true);
            timers.push(
              setTimeout(() => {
                if (cancelled) return;
                setTyping(false);
                setShown(i + 1);
                run(i + 1);
              }, 1100),
            );
          } else {
            setShown(i + 1);
            run(i + 1);
          }
        }, preDelay),
      );
    };
    run(0);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [script]);

  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {script.slice(0, shown).map((turn, i) => (
        <TurnView key={`${lang}-${i}`} turn={turn} L={L} lang={lang} />
      ))}
      {typing && <TypingDots />}
    </div>
  );
}

function TurnView({
  turn,
  L,
  lang,
}: {
  turn: Turn;
  L: (typeof LABELS)[Lang];
  lang: Lang;
}) {
  if (turn.role === "card" && turn.card) {
    return (
      <div
        className="max-w-[90%] self-end rounded-[16px] border border-[#E8B931]/50 bg-[#FDF8EC] px-4 py-3"
        style={{ animation: "lp-pop .4s ease-out both" }}
      >
        <p
          className="mb-2 text-[13px] font-semibold text-[#6B5B2E]"
          style={{
            fontFamily:
              lang === "ur"
                ? "var(--font-noto-nastaliq-urdu)"
                : "var(--font-manrope)",
          }}
        >
          {L.proposed}
        </p>
        <p className="font-[var(--font-manrope)] text-[22px] font-extrabold tracking-[-.02em] text-[#0F5132]">
          {turn.card.amount}
        </p>
        <p className="mt-1 text-[13px] text-[#4C5A52]">{turn.card.category}</p>
        <div className="mt-3 flex gap-2">
          <span className="inline-flex min-h-9 items-center rounded-[10px] bg-[#0F5132] px-3.5 text-[13px] font-medium text-white">
            {L.confirm}
          </span>
          <span className="inline-flex min-h-9 items-center rounded-[10px] border border-[#DCD6C8] bg-white px-3.5 text-[13px] text-[#6B7A70]">
            {L.reject}
          </span>
        </div>
      </div>
    );
  }

  const isUser = turn.role === "user";
  return (
    <div
      className={`max-w-[90%] ${isUser ? "self-end" : "self-start"}`}
      style={{ animation: "lp-pop .4s ease-out both" }}
    >
      <div
        className={
          isUser
            ? "rounded-[16px] bg-[#E8B931] px-4 py-2.5 text-[14px] font-medium leading-[1.9] text-[#0B3B26]"
            : "rounded-[16px] bg-white/95 px-4 py-2.5 font-reading text-[14px] leading-[1.9] text-[#14231B] shadow-sm"
        }
      >
        {turn.text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="self-start rounded-[16px] bg-white/95 px-4 py-3 shadow-sm">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-[#8FB49E]"
            style={{
              animation: `rq-glow 1s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

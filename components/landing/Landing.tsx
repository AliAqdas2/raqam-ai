"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Keyboard, Mic, Phone, Receipt, X } from "lucide-react";
import { HeroCallDemo } from "./HeroCallDemo";
import { LanguageGap } from "./LanguageGap";
import { LandingChatDemo } from "./LandingChatDemo";
import { VoiceOrb } from "@/components/assistant/VoiceOrb";

type Lang = "ur" | "en";

const COPY = {
  ur: {
    brand: "رقم",
    signIn: "لاگ اِن",
    navCta: "مفت اکاؤنٹ",
    heroTitle: "اپنے پیسوں سے اپنی زبان میں بات کریں",
    heroSub:
      "رقم اردو بولنے والا مالی معاون ہے۔ لکھ کر پوچھیں، بول کر پوچھیں یا کال کریں۔ جواب آپ کے اپنے لین دین سے آتا ہے، اور کوئی تبدیلی آپ کی تصدیق کے بغیر نہیں ہوتی۔",
    heroCta: "مفت اکاؤنٹ بنائیں",
    heroNote: "کریڈٹ کارڈ کی ضرورت نہیں",
    modes: ["لکھیں", "بولیں", "کال کریں", "رسید کی تصویر"],
    gapTitle: "مالیات کی زبان سب کے لیے نہیں بنی",
    gapBody:
      "لاکھوں پاکستانی اردو میں سوچتے ہیں، مگر بینک ایپس، بجٹ ٹولز اور مالی مشورے انگریزی میں آتے ہیں۔ رقم وہی باتیں آپ کی زبان میں کرتا ہے، روزمرہ مثالوں کے ساتھ۔",
    howTitle: "رقم کیسے کام کرتا ہے",
    steps: [
      [
        "پوچھیں، جیسے چاہیں",
        "سوال لکھیں، مائیک دبا کر بولیں، یا رقم کو کال کر کے بات کریں۔ رسید کی تصویر سے بھی خرچ شامل ہو جاتا ہے۔",
      ],
      [
        "جواب آپ کے اپنے ڈیٹا سے",
        "رقم آپ کے محفوظ لین دین، بجٹ اور اہداف دیکھ کر جواب دیتا ہے، اندازوں سے نہیں۔ ڈیٹا کم ہو تو صاف بتا دیتا ہے۔",
      ],
      [
        "تبدیلی صرف آپ کی تصدیق سے",
        "خرچ شامل کرنا ہو یا ہدف بنانا، رقم پہلے کارڈ دکھاتا ہے۔ آپ تصدیق کریں تو محفوظ ہوتا ہے، ورنہ کچھ نہیں بدلتا۔",
      ],
    ],
    demoTitle: "رقم معاون",
    trustTitle: "رقم کیا کرتا ہے، اور کیا نہیں",
    will: [
      "آپ کا خرچ، بجٹ اور بچت اردو میں سمجھاتا ہے",
      "رسید کی تصویر سے خرچ کی تفصیل نکالتا ہے",
      "بجٹ کی حد قریب آئے تو پہلے سے بتا دیتا ہے",
      "مہنگائی، کمیٹی اور سود جیسے تصورات آسان مثالوں سے سمجھاتا ہے",
    ],
    wont: [
      "پیسے منتقل کرنا یا کوئی ادائیگی کرنا",
      "آپ کی تصدیق کے بغیر کوئی ریکارڈ بدلنا",
      "اعداد گھڑنا: ہر عدد آپ کے ڈیٹا سے آتا ہے",
      "مالیات سے ہٹ کر سوالات کے جواب دینا",
    ],
    willLabel: "کرتا ہے",
    wontLabel: "کبھی نہیں",
    finalTitle: "آج ہی رقم سے پہلی بات کریں",
    finalBody: "اکاؤنٹ بنانے میں ایک منٹ لگتا ہے۔ پہلا سوال اردو میں پوچھیں۔",
    footer: "رقم، اردو میں آپ کا مالی معاون",
    langToggle: "English",
  },
  en: {
    brand: "Raqam",
    signIn: "Sign in",
    navCta: "Free account",
    heroTitle: "Talk to your money in your own language",
    heroSub:
      "Raqam is a money assistant that speaks Urdu. Type a question, say it, or call. Answers come from your own transactions, and nothing changes until you confirm it.",
    heroCta: "Create a free account",
    heroNote: "No credit card needed",
    modes: ["Type", "Speak", "Call", "Snap a receipt"],
    gapTitle: "Finance wasn't built in everyone's language",
    gapBody:
      "Millions of Pakistanis think in Urdu, yet banking apps, budgeting tools and money advice arrive in English. Raqam says the same things in your language, with everyday examples.",
    howTitle: "How Raqam works",
    steps: [
      [
        "Ask however you like",
        "Type a question, hold the mic and speak, or call Raqam and just talk. A photo of a receipt works too.",
      ],
      [
        "Answers from your own data",
        "Raqam reads your saved transactions, budgets and goals, not guesses. When there isn't enough data, it says so.",
      ],
      [
        "Changes only when you confirm",
        "Adding an expense or a goal? Raqam shows a card first. Confirm and it's saved; otherwise nothing changes.",
      ],
    ],
    demoTitle: "Raqam assistant",
    trustTitle: "What Raqam will and won't do",
    will: [
      "Explain your spending, budgets and savings in Urdu",
      "Read the details off a receipt photo",
      "Warn you before a budget runs out",
      "Explain inflation, committees and interest with everyday examples",
    ],
    wont: [
      "Move money or make any payment",
      "Change a record without your confirmation",
      "Make up numbers: every figure comes from your data",
      "Answer questions that aren't about money",
    ],
    willLabel: "Will",
    wontLabel: "Never",
    finalTitle: "Have your first money conversation today",
    finalBody: "Creating an account takes a minute. Ask your first question in Urdu.",
    footer: "Raqam, your money assistant in Urdu",
    langToggle: "اردو",
  },
} as const;

const MODE_ICONS = [Keyboard, Mic, Phone, Receipt];

const LATTICE = {
  backgroundImage: "radial-gradient(circle at 1px 1px, #E8B931 1px, transparent 0)",
  backgroundSize: "22px 22px",
} as const;

export function Landing() {
  const [lang, setLang] = React.useState<Lang>("ur");
  const c = COPY[lang];
  const dir = lang === "ur" ? "rtl" : "ltr";
  const reduceMotion = useReducedMotion();
  const ur = lang === "ur";
  const display = ur
    ? "var(--font-noto-nastaliq-urdu)"
    : "var(--font-manrope), system-ui, sans-serif";

  React.useEffect(() => {
    const html = document.documentElement;
    const prevDir = html.dir;
    const prevLang = html.lang;
    html.dir = dir;
    html.lang = lang;
    return () => {
      html.dir = prevDir || "rtl";
      html.lang = prevLang || "ur";
    };
  }, [dir, lang]);

  // The one orchestrated entrance: hero copy, then the call panel.
  const enter = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const, delay },
        };

  return (
    <div dir={dir} className="min-h-screen bg-[#F7F4EC] text-[#14231B]">
      {/* ── Hero: deep ledger green, the same ground as the call screen ── */}
      <section className="relative overflow-hidden bg-[#0B3B26] text-[#EAF1EB]">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07]" style={LATTICE} />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 start-1/2 h-[520px] w-[520px] rounded-full bg-[#E8B931]/[0.07] blur-3xl"
        />

        <header className="relative z-10">
          <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-5 py-4 sm:px-8">
            <Link href="/" className="flex items-center gap-2.5" aria-label={c.brand}>
              <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#E8B931] pb-1 font-nastaliq text-[19px] font-bold text-[#0B3B26]">
                ر
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-nastaliq text-[20px] font-bold leading-[1.6] text-white">
                  رقم
                </span>
                <span className="mt-2 font-manrope text-[10px] tracking-[.2em] text-[#8FB49E]">
                  RAQAM AI
                </span>
              </span>
            </Link>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setLang(ur ? "en" : "ur")}
                className="inline-flex min-h-11 items-center rounded-full px-3.5 text-[14px] text-[#DCE7DF] transition-colors hover:bg-white/10"
              >
                {c.langToggle}
              </button>
              <Link
                href="/login"
                className="hidden min-h-11 items-center rounded-full px-3.5 text-[14px] text-[#DCE7DF] transition-colors hover:bg-white/10 sm:inline-flex"
              >
                {c.signIn}
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-11 items-center rounded-full bg-[#E8B931] px-4 text-[14px] font-semibold text-[#0B3B26] transition-colors hover:bg-[#F2C846]"
              >
                {c.navCta}
              </Link>
            </div>
          </nav>
        </header>

        <div className="relative z-[1] mx-auto grid max-w-[1200px] items-center gap-12 px-5 pb-20 pt-8 sm:px-8 lg:min-h-[min(calc(100dvh-76px),860px)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 lg:pb-24">
          <motion.div {...enter(0)} className="flex flex-col gap-6">
            <h1
              className={
                ur
                  ? "max-w-[16ch] text-[clamp(34px,6vw,60px)] font-bold leading-[1.75] text-white"
                  : "max-w-[15ch] text-[clamp(36px,6vw,64px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white"
              }
              style={{ fontFamily: display }}
            >
              {c.heroTitle}
            </h1>

            <p className="max-w-[46ch] text-[16px] leading-[1.95] text-[#B9CFC1] sm:text-[17.5px]">
              {c.heroSub}
            </p>

            <ul className="flex flex-wrap gap-2" aria-label={c.howTitle}>
              {c.modes.map((m, i) => {
                const Icon = MODE_ICONS[i];
                return (
                  <li
                    key={m}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 text-[13px] text-[#DCE7DF]"
                  >
                    <Icon className="h-3.5 w-3.5 text-[#E8B931]" aria-hidden />
                    {m}
                  </li>
                );
              })}
            </ul>

            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href="/signup"
                className="inline-flex min-h-[52px] items-center justify-center rounded-[14px] bg-[#E8B931] px-7 text-[16px] font-semibold text-[#0B3B26] shadow-[0_14px_36px_-14px_rgba(232,185,49,0.7)] transition-colors hover:bg-[#F2C846]"
              >
                {c.heroCta}
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-[52px] items-center text-[15px] font-medium text-[#DCE7DF] underline-offset-4 hover:underline"
              >
                {c.signIn}
              </Link>
            </div>
            <p className="-mt-2 text-[13px] text-[#8FB49E]">{c.heroNote}</p>
          </motion.div>

          {/* The call */}
          <motion.div
            {...enter(0.15)}
            className="mx-auto w-full max-w-[420px] rounded-[28px] border border-white/10 bg-[#0F5132]/45 px-5 pb-6 pt-8 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:px-7"
          >
            <HeroCallDemo key={lang} lang={lang} />
          </motion.div>
        </div>
      </section>

      {/* ── The language gap ── */}
      <section className="mx-auto grid max-w-[1100px] items-center gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <div className="flex flex-col gap-5">
          <h2
            className={
              ur
                ? "text-[clamp(28px,4vw,40px)] font-bold leading-[1.8]"
                : "text-[clamp(28px,4vw,42px)] font-extrabold leading-[1.12] tracking-[-0.02em]"
            }
            style={{ fontFamily: display }}
          >
            {c.gapTitle}
          </h2>
          <p className="max-w-[44ch] text-[16px] leading-[2] text-[#4C5A52]">{c.gapBody}</p>
        </div>
        <LanguageGap />
      </section>

      {/* ── How it works: a real sequence, so it is numbered ── */}
      <section className="border-y border-[#E7E2D6] bg-white">
        <div className="mx-auto grid max-w-[1100px] items-start gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div className="flex flex-col gap-10">
            <h2
              className={
                ur
                  ? "text-[clamp(28px,4vw,40px)] font-bold leading-[1.8]"
                  : "text-[clamp(28px,4vw,42px)] font-extrabold leading-[1.12] tracking-[-0.02em]"
              }
              style={{ fontFamily: display }}
            >
              {c.howTitle}
            </h2>
            <ol className="flex flex-col">
              {c.steps.map(([title, body], i) => (
                <li key={title} className="relative flex gap-5 pb-9 last:pb-0">
                  {i < c.steps.length - 1 ? (
                    <span aria-hidden className="absolute start-[19px] top-11 bottom-1 w-px bg-[#E7E2D6]" />
                  ) : null}
                  <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0F5132] font-manrope text-[15px] font-bold text-[#E8B931]">
                    {ur ? ["۱", "۲", "۳"][i] : i + 1}
                  </span>
                  <div className="flex flex-col gap-1.5 pt-1">
                    <h3 className="text-[18px] font-bold leading-[1.8]" style={{ fontFamily: ur ? display : undefined }}>
                      {title}
                    </h3>
                    <p className="max-w-[42ch] text-[15px] leading-[1.95] text-[#6B7A70]">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* App-styled chat window */}
          <div className="overflow-hidden rounded-[22px] border border-[#E7E2D6] bg-[#F7F4EC] shadow-[0_30px_60px_-36px_rgba(11,59,38,0.45)] lg:sticky lg:top-8">
            <div className="flex items-center gap-2.5 border-b border-[#E7E2D6] bg-white px-5 py-3.5">
              <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#0F5132] pb-0.5 font-nastaliq text-[15px] text-[#E8B931]">
                ر
              </span>
              <span className="text-[14px] font-semibold">{c.demoTitle}</span>
              <span className="ms-auto h-2 w-2 rounded-full bg-[#22B07D]" aria-hidden />
            </div>
            <div className="flex min-h-[380px] flex-col justify-end px-4 py-5 sm:px-6">
              <LandingChatDemo key={lang} lang={lang} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Will / won't ── */}
      <section className="mx-auto max-w-[1100px] px-5 py-20 sm:px-8 sm:py-24">
        <h2
          className={
            ur
              ? "max-w-[20ch] text-[clamp(28px,4vw,40px)] font-bold leading-[1.8]"
              : "max-w-[26ch] text-[clamp(28px,4vw,42px)] font-extrabold leading-[1.12] tracking-[-0.02em]"
          }
          style={{ fontFamily: display }}
        >
          {c.trustTitle}
        </h2>
        <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-16">
          {(
            [
              [c.willLabel, c.will, true],
              [c.wontLabel, c.wont, false],
            ] as const
          ).map(([label, items, ok]) => (
            <div key={label} className="flex flex-col">
              <span
                className={`mb-2 w-fit rounded-full px-3 py-1 text-[13px] font-semibold ${
                  ok ? "bg-[#E6EFE9] text-[#0F5132]" : "bg-[#F6E6E4] text-[#8A2E26]"
                }`}
              >
                {label}
              </span>
              <ul>
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-3 border-b border-[#E7E2D6] py-4 last:border-b-0">
                    <span
                      className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                        ok ? "bg-[#0F5132] text-white" : "bg-[#B3261E]/10 text-[#B3261E]"
                      }`}
                    >
                      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    </span>
                    <span className="text-[15.5px] leading-[1.95]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final call to action ── */}
      <section className="relative overflow-hidden bg-[#0B3B26] text-[#EAF1EB]">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07]" style={LATTICE} />
        <div className="relative mx-auto flex max-w-[1100px] flex-col items-center gap-6 px-5 py-20 text-center sm:px-8 sm:py-24">
          <VoiceOrb mode="idle" size={64} />
          <h2
            className={
              ur
                ? "max-w-[22ch] text-[clamp(28px,4.5vw,44px)] font-bold leading-[1.8] text-white"
                : "max-w-[22ch] text-[clamp(28px,4.5vw,46px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-white"
            }
            style={{ fontFamily: display }}
          >
            {c.finalTitle}
          </h2>
          <p className="max-w-[44ch] text-[16px] leading-[1.95] text-[#B9CFC1]">{c.finalBody}</p>
          <Link
            href="/signup"
            className="inline-flex min-h-[52px] items-center rounded-[14px] bg-[#E8B931] px-8 text-[16px] font-semibold text-[#0B3B26] shadow-[0_14px_36px_-14px_rgba(232,185,49,0.7)] transition-colors hover:bg-[#F2C846]"
          >
            {c.heroCta}
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-5 py-8 sm:px-8">
        <p className="text-[13px] text-[#8A9690]">{c.footer}</p>
        <Link href="/login" className="text-[13px] text-[#4C5A52] underline-offset-4 hover:underline">
          {c.signIn}
        </Link>
      </footer>
    </div>
  );
}

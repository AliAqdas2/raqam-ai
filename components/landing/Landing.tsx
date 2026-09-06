"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LandingChatDemo } from "./LandingChatDemo";

type Lang = "ur" | "en";

const COPY = {
  ur: {
    brand: "رقم",
    signIn: "لاگ اِن",
    heroTitle: "اپنے پیسوں کو اپنی زبان میں سمجھیں",
    heroSub:
      "اردو میں پوچھیں — رقم آپ کے اصل لین دین سے جواب دیتا ہے، اور تبدیلی صرف آپ کی تصدیق سے کرتا ہے۔",
    heroCta: "اکاؤنٹ بنائیں",
    heroNote: "کریڈٹ کارڈ کی ضرورت نہیں",
    problemTitle: "مالیات کی زبان سب کے لیے نہیں بنی",
    problemBody:
      "لاکھوں پاکستانی اردو میں سوچتے ہیں، مگر بجٹنگ ایپس اور مشورے انگریزی میں آتے ہیں۔ رقم اس خلا کو پُر کرتا ہے۔",
    featuresTitle: "آپ کے کام کے تین طریقے",
    features: [
      ["لکھیں یا بولیں", "خرچ اردو میں بتائیں — متن سے یا آواز سے۔"],
      ["بجٹ رکھیں", "حد مقرر کریں اور دیکھیں کتنا باقی ہے۔"],
      ["تصدیق سے محفوظ", "کوئی بھی تبدیلی آپ کے 'ہاں' کے بغیر نہیں ہوتی۔"],
    ],
    safetyTitle: "آپ کے کنٹرول میں",
    safety: [
      ["پہلے دکھائے، پھر لکھے", "خرچ یا ہدف بنانے سے پہلے تجویز دیکھیں — تصدیق یا منسوخ۔"],
      ["اصل ڈیٹا", "اعداد آپ کے محفوظ لین دین سے آتے ہیں، من گھڑت نہیں۔"],
      ["محدود اختیار", "رقم پیسے منتقل یا ادائیگی نہیں کر سکتا۔"],
    ],
    footerTitle: "آج ہی اپنی مالی تصویر واضح کریں",
    footerCta: "مفت اکاؤنٹ بنائیں",
    langToggle: "English",
    demoLabel: "معاون",
  },
  en: {
    brand: "Raqam",
    signIn: "Sign in",
    heroTitle: "Understand your money in the language you think in",
    heroSub:
      "Ask in Urdu — Raqam answers from your real transactions, and only changes records after you confirm.",
    heroCta: "Create account",
    heroNote: "No credit card needed",
    problemTitle: "Finance wasn’t built in everyone’s language",
    problemBody:
      "Millions of Pakistanis think in Urdu, yet budgeting apps and advice arrive in English. Raqam closes that gap.",
    featuresTitle: "Three ways it helps",
    features: [
      ["Type or speak", "Log spending in Urdu — by text or voice."],
      ["Keep a budget", "Set limits and see what’s left."],
      ["Confirm to save", "Nothing changes without your yes."],
    ],
    safetyTitle: "You stay in control",
    safety: [
      ["Show first, then write", "See a proposal before any expense or goal is created."],
      ["Real data", "Figures come from your saved transactions — never invented."],
      ["Bounded power", "Raqam cannot move money or make payments."],
    ],
    footerTitle: "Bring your finances into focus today",
    footerCta: "Create a free account",
    langToggle: "اردو",
    demoLabel: "Assistant",
  },
} as const;

export function Landing() {
  const [lang, setLang] = React.useState<Lang>("ur");
  const c = COPY[lang];
  const dir = lang === "ur" ? "rtl" : "ltr";
  const reduceMotion = useReducedMotion();
  const headingFont =
    lang === "ur"
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

  const enter = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, ease: "easeOut" as const, delay },
        };

  return (
    <div dir={dir} className="min-h-screen bg-[#F7F4EC] text-[#14231B]">
      {/* Slim chrome — brand lives in the hero */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-[1200px] items-center justify-end gap-2 px-5 py-4 sm:gap-3">
          <button
            type="button"
            onClick={() => setLang(lang === "ur" ? "en" : "ur")}
            className="inline-flex min-h-11 items-center rounded-[12px] border border-[#DCD6C8] bg-white/80 px-4 text-[14px] font-medium text-[#4C5A52] backdrop-blur transition-colors hover:border-[#0F5132] hover:text-[#0F5132]"
          >
            {c.langToggle}
          </button>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center px-3 text-[14px] font-medium text-[#4C5A52] underline-offset-4 hover:text-[#0F5132] hover:underline"
          >
            {c.signIn}
          </Link>
        </div>
      </header>

      {/* ── First viewport: brand · promise · CTA · chat demo ── */}
      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden lg:flex-row">
        {/* Soft warm atmosphere — not a purple shader */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(232,185,49,0.14), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(15,81,50,0.08), transparent 50%), #F7F4EC",
          }}
        />

        <div className="relative z-[1] flex flex-1 flex-col justify-center px-5 pb-8 pt-24 sm:px-10 lg:max-w-[48%] lg:pb-16 lg:pt-20 xl:ps-16">
          <motion.div {...enter(0)} className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-[16px] bg-[#E8B931] pb-1 font-[var(--font-noto-nastaliq-urdu)] text-[28px] font-bold text-[#0B3B26] sm:h-16 sm:w-16 sm:text-[32px]">
                ر
              </span>
              <span
                className="text-[28px] font-bold leading-none tracking-tight text-[#0B3B26] sm:text-[34px]"
                style={{ fontFamily: headingFont }}
              >
                {c.brand}
              </span>
            </div>

            <h1
              className="max-w-[22ch] text-[clamp(28px,5.5vw,44px)] font-bold leading-[1.35] text-[#14231B]"
              style={{ fontFamily: headingFont }}
            >
              {c.heroTitle}
            </h1>

            <p className="max-w-[36ch] text-[16px] leading-[1.95] text-[#4C5A52] sm:text-[17px]">
              {c.heroSub}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center justify-center rounded-[12px] bg-[#0F5132] px-7 text-[15px] font-semibold text-white transition-colors hover:bg-[#14231B]"
              >
                {c.heroCta}
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center text-[15px] font-medium text-[#0F5132] underline-offset-4 hover:underline"
              >
                {c.signIn}
              </Link>
            </div>
            <p className="text-[13px] text-[#8A9690]">{c.heroNote}</p>
          </motion.div>
        </div>

        {/* Dominant product visual — full-bleed panel, not a decorative card */}
        <motion.div
          {...enter(0.12)}
          className="relative z-[1] flex min-h-[42vh] flex-1 flex-col border-t border-[#E7E2D6]/80 bg-[#0B3B26] lg:min-h-0 lg:border-t-0 lg:border-s lg:border-[#0B3B26]"
        >
          <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-3.5 sm:px-8">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#E8B931] pb-0.5 font-[var(--font-noto-nastaliq-urdu)] text-[15px] font-bold text-[#0B3B26]">
              ر
            </span>
            <span
              className="text-[14px] font-medium text-[#DCE7DF]"
              style={{ fontFamily: headingFont }}
            >
              {c.demoLabel}
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-end overflow-hidden px-4 py-5 sm:px-8 sm:py-8">
            <div className="mx-auto w-full max-w-md lg:ms-0 lg:me-auto">
              <LandingChatDemo key={lang} lang={lang} />
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Below fold ── */}
      <section className="bg-[#0B3B26] text-[#DCE7DF]">
        <div className="mx-auto max-w-[720px] px-5 py-16 sm:py-20">
          <h2
            className="text-[26px] font-bold leading-[1.55] sm:text-[32px]"
            style={{ fontFamily: headingFont }}
          >
            {c.problemTitle}
          </h2>
          <p className="mt-5 text-[15px] leading-[2] text-[#B7CFC0] sm:text-[16px]">
            {c.problemBody}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-5 py-16 sm:py-20">
        <h2
          className="text-[26px] font-bold leading-[1.55] sm:text-[32px]"
          style={{ fontFamily: headingFont }}
        >
          {c.featuresTitle}
        </h2>
        <ul className="mt-10 flex flex-col gap-8 sm:gap-10">
          {c.features.map(([title, body], i) => (
            <li
              key={title}
              className="flex gap-4 border-t border-[#E7E2D6] pt-8 first:border-t-0 first:pt-0 sm:gap-6"
            >
              <span className="font-[var(--font-manrope)] text-[20px] font-bold tabular-nums text-[#E8B931]">
                {lang === "ur"
                  ? ["۱", "۲", "۳"][i]
                  : String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3
                  className="text-[18px] font-bold"
                  style={{ fontFamily: headingFont }}
                >
                  {title}
                </h3>
                <p className="mt-2 max-w-[40ch] text-[15px] leading-[1.95] text-[#6B7A70]">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-[#E7E2D6] bg-white">
        <div className="mx-auto max-w-[960px] px-5 py-16 sm:py-20">
          <h2
            className="text-[26px] font-bold leading-[1.55] sm:text-[32px]"
            style={{ fontFamily: headingFont }}
          >
            {c.safetyTitle}
          </h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-3">
            {c.safety.map(([title, body]) => (
              <div key={title}>
                <div
                  aria-hidden
                  className="mb-3 h-1 w-10 rounded-full bg-[#E8B931]"
                />
                <h3
                  className="text-[16px] font-bold"
                  style={{ fontFamily: headingFont }}
                >
                  {title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.95] text-[#6B7A70]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0B3B26] text-[#DCE7DF]">
        <div className="mx-auto flex max-w-[960px] flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
          <h2
            className="max-w-[28ch] text-[24px] font-bold leading-[1.5] sm:text-[30px]"
            style={{ fontFamily: headingFont }}
          >
            {c.footerTitle}
          </h2>
          <Link
            href="/signup"
            className="inline-flex min-h-12 items-center rounded-[12px] bg-[#E8B931] px-7 text-[15px] font-semibold text-[#0B3B26] transition-colors hover:bg-[#f2c846]"
          >
            {c.footerCta}
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-[960px] px-5 py-8">
        <p
          className="text-[13px] text-[#8A9690]"
          style={{ fontFamily: headingFont }}
        >
          {c.brand}
          <span className="mx-1.5 text-[#DCD6C8]">·</span>
          Bano Qabil AI Hackathon
        </p>
      </footer>
    </div>
  );
}

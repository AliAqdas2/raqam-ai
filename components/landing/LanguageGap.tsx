"use client";

import { motion, useReducedMotion } from "framer-motion";

const TERMS: Array<[en: string, ur: string]> = [
  ["Expense", "خرچ"],
  ["Income", "آمدنی"],
  ["Savings", "بچت"],
  ["Inflation", "مہنگائی"],
  ["Interest", "سود"],
];

/**
 * The problem, said with type: the English words finance apps use, turning
 * into the Urdu words people actually think in. One reveal, on first view.
 */
export function LanguageGap() {
  const reduceMotion = useReducedMotion();

  return (
    <ul className="flex flex-col" dir="ltr">
      {TERMS.map(([en, ur], i) => (
        <li
          key={en}
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[#E7E2D6] py-3 last:border-b-0 sm:gap-6"
        >
          <motion.span
            className="font-manrope text-[17px] font-semibold text-[#8A9690] decoration-[#C4622D]/60 decoration-2 sm:text-[20px]"
            initial={reduceMotion ? false : { opacity: 1 }}
            whileInView={{ opacity: 0.55, textDecorationLine: "line-through" }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ delay: 0.25 + i * 0.12, duration: 0.3 }}
            style={reduceMotion ? { opacity: 0.55, textDecorationLine: "line-through" } : undefined}
          >
            {en}
          </motion.span>
          <motion.span
            aria-hidden
            className="h-px w-8 bg-[#E8B931] sm:w-14"
            initial={reduceMotion ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ delay: 0.35 + i * 0.12, duration: 0.35 }}
            style={{ originX: 0 }}
          />
          <motion.span
            dir="rtl"
            lang="ur"
            className="text-end font-nastaliq text-[26px] font-bold leading-[1.9] text-[#0F5132] sm:text-[32px]"
            initial={reduceMotion ? false : { opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ delay: 0.45 + i * 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {ur}
          </motion.span>
        </li>
      ))}
    </ul>
  );
}

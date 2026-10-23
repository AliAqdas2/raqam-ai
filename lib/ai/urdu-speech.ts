// lib/ai/urdu-speech.ts — Make Urdu replies sound natural when read aloud.
//
// The Urdu neural voices read digits and Latin-script words poorly: "42,000"
// comes out digit by digit or in an English cadence, and "budget" or
// "Savings Rate" in an Urdu sentence is mispronounced. Before an Urdu reply
// is spoken (lib/ai/tts.ts `prepareTextForSpeech`), this module
//   1. drops English glosses in brackets after an Urdu term ("مہنگائی (Inflation)"),
//   2. respells common English finance words in Urdu script, the way
//      Pakistanis say them ("budget" → "بجٹ"),
//   3. reads numbers as Urdu words in the Pakistani system
//      (ہزار / لاکھ / کروڑ / ارب): "42,000" → "بیالیس ہزار".
// Pure: only affects the spoken text, never what is shown on screen.

// ─── Numbers ────────────────────────────────────────────────────────────────────

/** 0–99. Urdu numbers below 100 are irregular, so each has its own word. */
const UNDER_100: readonly string[] = [
  "صفر", "ایک", "دو", "تین", "چار", "پانچ", "چھ", "سات", "آٹھ", "نو",
  "دس", "گیارہ", "بارہ", "تیرہ", "چودہ", "پندرہ", "سولہ", "سترہ", "اٹھارہ", "انیس",
  "بیس", "اکیس", "بائیس", "تئیس", "چوبیس", "پچیس", "چھبیس", "ستائیس", "اٹھائیس", "انتیس",
  "تیس", "اکتیس", "بتیس", "تینتیس", "چونتیس", "پینتیس", "چھتیس", "سینتیس", "اڑتیس", "انتالیس",
  "چالیس", "اکتالیس", "بیالیس", "تینتالیس", "چوالیس", "پینتالیس", "چھیالیس", "سینتالیس", "اڑتالیس", "انچاس",
  "پچاس", "اکیاون", "باون", "ترپن", "چون", "پچپن", "چھپن", "ستاون", "اٹھاون", "انسٹھ",
  "ساٹھ", "اکسٹھ", "باسٹھ", "تریسٹھ", "چونسٹھ", "پینسٹھ", "چھیاسٹھ", "سڑسٹھ", "اڑسٹھ", "انہتر",
  "ستر", "اکہتر", "بہتر", "تہتر", "چوہتر", "پچھتر", "چھہتر", "ستتر", "اٹھہتر", "اناسی",
  "اسی", "اکیاسی", "بیاسی", "تراسی", "چوراسی", "پچاسی", "چھیاسی", "ستاسی", "اٹھاسی", "نواسی",
  "نوے", "اکانوے", "بانوے", "ترانوے", "چورانوے", "پچانوے", "چھیانوے", "ستانوے", "اٹھانوے", "ننانوے",
];

/** Pakistani place values, largest first. */
const SCALES: ReadonlyArray<[number, string]> = [
  [1_000_000_000, "ارب"],
  [10_000_000, "کروڑ"],
  [100_000, "لاکھ"],
  [1_000, "ہزار"],
  [100, "سو"],
];

/** Integers at or above this are read digit by digit (account numbers etc.). */
const MAX_WORDED = 1_000_000_000_000;

/**
 * A non-negative integer in Urdu words, Pakistani system:
 * 1250 → "ایک ہزار دو سو پچاس", 150000 → "ایک لاکھ پچاس ہزار".
 */
export function urduNumberWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  n = Math.floor(n);
  if (n >= MAX_WORDED) {
    return String(n)
      .split("")
      .map((d) => UNDER_100[Number(d)])
      .join(" ");
  }
  if (n < 100) return UNDER_100[n];

  const parts: string[] = [];
  let rest = n;
  for (const [value, word] of SCALES) {
    if (rest >= value) {
      parts.push(`${urduNumberWords(Math.floor(rest / value))} ${word}`);
      rest %= value;
    }
  }
  if (rest > 0) parts.push(UNDER_100[rest]);
  return parts.join(" ");
}

const URDU_DIGITS = /[۰-۹٠-٩]/g;

function toAsciiDigits(text: string): string {
  return text.replace(URDU_DIGITS, (d) => {
    const code = d.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

/**
 * Numbers like "42,000", "1,50,000", "42.9", "50.6%" — not glued to letters,
 * so "5G" or "COVID19" are left alone.
 */
const NUMBER = /(?<![\p{L}\d.,])(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d+))?(\s?[%٪])?(?![\p{L}\d])/gu;

function speakNumbers(text: string): string {
  return toAsciiDigits(text).replace(
    NUMBER,
    (_m, whole: string, fraction: string | undefined, percent: string | undefined) => {
      let words = urduNumberWords(Number(whole.replace(/,/g, "")));
      if (fraction) {
        // Decimals are read digit by digit: 42.9 → "بیالیس اعشاریہ نو".
        const digits = fraction.split("").map((d) => UNDER_100[Number(d)]);
        words += ` اعشاریہ ${digits.join(" ")}`;
      }
      if (percent) words += " فیصد";
      return words;
    },
  );
}

// ─── English words ──────────────────────────────────────────────────────────────

/**
 * English words common in Raqam's Urdu replies, spelled the way Pakistanis
 * pronounce them. Multi-word entries come first so they win over their parts.
 * Words not listed stay in English for the voice to attempt.
 */
const ENGLISH_TO_URDU: ReadonlyArray<[string, string]> = [
  ["savings rate", "سیونگز ریٹ"],
  ["credit card", "کریڈٹ کارڈ"],
  ["debit card", "ڈیبٹ کارڈ"],
  ["compound interest", "کمپاؤنڈ انٹرسٹ"],
  ["purchasing power", "پرچیزنگ پاور"],
  ["bank account", "بینک اکاؤنٹ"],
  ["food delivery", "فوڈ ڈلیوری"],
  ["savings goal", "سیونگز گول"],
  ["budget", "بجٹ"],
  ["budgets", "بجٹ"],
  ["savings", "سیونگز"],
  ["saving", "سیونگ"],
  ["income", "انکم"],
  ["expense", "ایکسپینس"],
  ["expenses", "ایکسپینسز"],
  ["salary", "سیلری"],
  ["profit", "پرافٹ"],
  ["interest", "انٹرسٹ"],
  ["inflation", "انفلیشن"],
  ["loan", "لون"],
  ["bill", "بل"],
  ["bills", "بلز"],
  ["utilities", "یوٹیلیٹیز"],
  ["transport", "ٹرانسپورٹ"],
  ["transportation", "ٹرانسپورٹیشن"],
  ["grocery", "گروسری"],
  ["groceries", "گروسری"],
  ["petrol", "پیٹرول"],
  ["food", "فوڈ"],
  ["shopping", "شاپنگ"],
  ["rent", "کرایہ"],
  ["transaction", "ٹرانزیکشن"],
  ["transactions", "ٹرانزیکشنز"],
  ["category", "کیٹیگری"],
  ["categories", "کیٹیگریز"],
  ["goal", "گول"],
  ["goals", "گولز"],
  ["balance", "بیلنس"],
  ["total", "ٹوٹل"],
  ["net", "نیٹ"],
  ["rate", "ریٹ"],
  ["cash", "کیش"],
  ["bank", "بینک"],
  ["account", "اکاؤنٹ"],
  ["investment", "انویسٹمنٹ"],
  ["insurance", "انشورنس"],
  ["tax", "ٹیکس"],
  ["phone", "فون"],
  ["mobile", "موبائل"],
  ["online", "آن لائن"],
  ["app", "ایپ"],
  ["record", "ریکارڈ"],
  ["receipt", "رسید"],
  ["jazzcash", "جاز کیش"],
  ["easypaisa", "ایزی پیسہ"],
  ["raast", "راست"],
  ["raqam", "رقم"],
  ["emi", "ای ایم آئی"],
  ["ai", "اے آئی"],
];

const LEXICON = new Map(ENGLISH_TO_URDU.map(([en, ur]) => [en, ur]));

const LEXICON_PATTERN = new RegExp(
  `(?<![A-Za-z])(${[...LEXICON.keys()]
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace(/ /g, "\\s+"))
    .join("|")})(?![A-Za-z])`,
  "gi",
);

function respellEnglish(text: string): string {
  return text.replace(
    LEXICON_PATTERN,
    (m) => LEXICON.get(m.toLowerCase().replace(/\s+/g, " ")) ?? m,
  );
}

/**
 * "مہنگائی (Inflation)" → "مہنگائی". Replies gloss Urdu terms with the English
 * word in brackets; read aloud that just says the same thing twice.
 */
function dropEnglishGlosses(text: string): string {
  return text.replace(
    /([؀-ۿ]\S*)\s*\(\s*[A-Za-z][A-Za-z\s'&/.-]*\)/g,
    "$1",
  );
}

/** Rewrite already-cleaned Urdu reply text so the Urdu voice reads it naturally. */
export function prepareUrduForSpeech(text: string): string {
  return speakNumbers(respellEnglish(dropEnglishGlosses(text)))
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

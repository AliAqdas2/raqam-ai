// Live check of what "Call Raqam" will say back: real guardrail → triage →
// specialist agents on Gemini, fed the kind of transcripts the call produces
// (Urdu script from AssemblyAI, Roman Urdu, English, mixed).
//
// Every reply must be speakable within the call loop's limits: no error, not
// empty, never Hindi script, under the TTS character cap, and back before the
// loop's send timeout. Intent routing through a real LLM is not deterministic,
// so routing is asserted in aggregate, like ai.live.test.ts.
//
// Skipped unless GOOGLE_GENERATIVE_AI_API_KEY is set:
//   GOOGLE_GENERATIVE_AI_API_KEY=<key> npx vitest run tests/live/call-replies.live.test.ts

import { describe, it, expect } from "vitest";
import { containsDevanagari } from "@/lib/ai/transcription";
import { MAX_TTS_CHARS, prepareTextForSpeech, detectSpeechLanguage } from "@/lib/ai/tts";
import { DEFAULT_CALL_LOOP_OPTIONS } from "@/lib/voice/call-loop";

const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
// Free-tier Gemini allows ~5 requests/minute per model and each turn makes
// about three; pace the cases like a real conversation instead of a burst.
const PACE_MS = Number(process.env.CALL_LIVE_PACE_MS ?? 12_000);

type Intent = "educate" | "analyze" | "recommend" | "act" | "offTopic";

interface Case {
  says: string;
  intent: Intent | Intent[];
  /** For act: whether a confirmation card should be proposed. */
  proposes?: boolean;
  /** The reply should be in this language. */
  lang?: "ur" | "en";
}

const CASES: Case[] = [
  // ── educate ──
  { says: "مہنگائی کیا ہوتی ہے؟", intent: "educate", lang: "ur" },
  { says: "what is compound interest?", intent: "educate", lang: "en" },
  { says: "committee kya hoti hai?", intent: "educate" },
  // ── analyze (grounded in the fake data below) ──
  { says: "اس مہینے کتنا خرچ ہوا؟", intent: "analyze", lang: "ur" },
  { says: "food ka budget kitna bacha hai?", intent: "analyze" },
  { says: "kya main 15000 ka phone afford kar sakta hoon?", intent: ["analyze", "recommend"] },
  // ── recommend ──
  { says: "paise bachane ke liye mujhe kya karna chahiye?", intent: ["recommend", "analyze"] },
  // ── act ──
  { says: "آج پانچ سو روپے پیٹرول پر خرچ ہوئے", intent: "act", proposes: true },
  { says: "Aaj Rs 500 ka khana order kiya", intent: "act", proposes: true },
  { says: "kal paise diye", intent: "act", proposes: false }, // no amount → clarify
  // ── off topic ──
  { says: "cricket ka score kya hai?", intent: "offTopic" },
];

// A realistic month of data so analyze replies have real figures to cite.
const SUMMARY = {
  totalIncome: 85000,
  totalExpenses: 42000,
  netSavings: 43000,
  savingsRate: 50.6,
  categoryBreakdown: [
    { name: "food", nameUr: "کھانا", amount: 18000, percentage: 42.9 },
    { name: "transport", nameUr: "سفر", amount: 9000, percentage: 21.4 },
    { name: "utilities", nameUr: "بل", amount: 15000, percentage: 35.7 },
  ],
  recentTransactions: [
    { label: "Salary", amount: 85000, type: "income", meta: "Oct 1" },
    { label: "Grocery", amount: 6500, type: "expense", meta: "Oct 20" },
  ],
  upcomingBills: [{ label: "Bijli ka bill", amount: "Rs. 7,000" }],
};
const INTEL = {
  currentMonth: { income: 85000, expenses: 42000, daysElapsed: 24, totalDaysInMonth: 31 },
  historicalMonths: [
    { month: 1, income: 85000, expenses: 47000, netSavings: 38000, savingsRate: 44.7 },
    { month: 2, income: 85000, expenses: 45000, netSavings: 40000, savingsRate: 47.1 },
  ],
  currentCategorySpending: [
    { categoryId: "c1", name: "food", nameUr: "کھانا", amount: 18000 },
    { categoryId: "c2", name: "transport", nameUr: "سفر", amount: 9000 },
  ],
  categoryRollingAverages: [
    { categoryId: "c1", name: "food", nameUr: "کھانا", average: 12000, currentSpend: 18000 },
  ],
};

const api = {
  summary: { getFinancialSummary: "summary", getIntelligenceData: "intel" },
  budgets: { get: "budget", getBudgetCategories: "budgetCategories" },
  goals: { list: "goals" },
};
const ctx = {
  runQuery: async (ref: string) => {
    switch (ref) {
      case "summary":
        return SUMMARY;
      case "intel":
        return INTEL;
      case "budget":
        return { _id: "b1" };
      case "budgetCategories":
        return [{ categoryName: "food", categoryNameUr: "کھانا", limit: 20000, spent: 18000 }];
      case "goals":
        return [{ name: "Bike", nameUr: "بائیک", targetAmount: 150000, currentAmount: 40000, isCompleted: false }];
      default:
        throw new Error(`unexpected query ${ref}`);
    }
  },
};

describe.skipIf(!KEY)("Call Raqam replies — live", () => {
  it(
    "every reply is speakable, on time, and never Hindi script",
    async () => {
      const { orchestrate } = await import("@/lib/ai/orchestrator");
      const rows: string[] = [];
      let routed = 0;
      const problems: string[] = [];

      for (const [i, c] of CASES.entries()) {
        if (i > 0) await new Promise((r) => setTimeout(r, PACE_MS));
        const started = Date.now();
        const r = await orchestrate(
          { userMessage: c.says, preferredLanguage: "ur", conversationHistory: [] },
          ctx,
          api,
        );
        const ms = Date.now() - started;
        const wanted = Array.isArray(c.intent) ? c.intent : [c.intent];
        if (wanted.includes(r.intentType)) routed++;

        const spoken = prepareTextForSpeech(r.content, detectSpeechLanguage(r.content, "ur"));
        const fail = (why: string) => problems.push(`"${c.says}": ${why}`);
        if (r.error) fail(`error ${r.error}`);
        if (!r.content.trim() || !spoken) fail("empty / unspeakable reply");
        if (containsDevanagari(r.content)) fail("Hindi script in reply");
        if (r.content.length > MAX_TTS_CHARS) fail(`too long (${r.content.length} chars)`);
        if (ms >= DEFAULT_CALL_LOOP_OPTIONS.sendTimeoutMs) fail(`slow (${ms} ms)`);
        if (c.proposes !== undefined && r.intentType === "act" && Boolean(r.pendingAction) !== c.proposes) {
          fail(c.proposes ? "no confirmation card proposed" : "proposed an action without an amount");
        }
        if (c.lang && detectSpeechLanguage(r.content, "ur") !== c.lang) {
          fail(`replied in the wrong language`);
        }

        rows.push(
          `${String(ms).padStart(6)} ms  ${r.intentType.padEnd(9)} ${r.pendingAction ? "[card] " : "       "}` +
            `${c.says}\n         → ${r.content.replace(/\s+/g, " ").slice(0, 160)}`,
        );
      }

      console.log("\nCall replies:\n" + rows.join("\n"));
      if (problems.length) console.warn("Problems:\n  " + problems.join("\n  "));

      expect(problems).toEqual([]);
      expect(routed / CASES.length).toBeGreaterThanOrEqual(0.8);
    },
    15 * 60_000,
  );
});

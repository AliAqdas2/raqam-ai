// Live check of the AI intent router (AGENTS.md §13: "intent classifier: sample
// inputs → correct intent type"). Routing through a real LLM is not deterministic,
// so this asserts AGGREGATE accuracy, not per-sample.
//
// Skipped automatically unless GOOGLE_GENERATIVE_AI_API_KEY is present, so
// `npm test` and CI stay offline. Run it explicitly with:
//
//   GOOGLE_GENERATIVE_AI_API_KEY=<key> npx vitest run tests/live       (bash)
//   $env:GOOGLE_GENERATIVE_AI_API_KEY="<key>"; npx vitest run tests/live (PowerShell)

import { describe, it, expect } from "vitest";

const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

type Intent = "educate" | "analyze" | "recommend" | "act" | "offTopic";

const SAMPLES: Array<{ text: string; expect: Intent }> = [
  // ── educate ──
  { text: "inflation kya hoti hai?", expect: "educate" },
  { text: "what is compound interest?", expect: "educate" },
  { text: "committee kya hoti hai aur kaise kaam karti hai?", expect: "educate" },
  { text: "riba kise kehte hain?", expect: "educate" },
  // ── analyze ──
  { text: "is mahine kitna kharch hua?", expect: "analyze" },
  { text: "meri savings kitni hai?", expect: "analyze" },
  { text: "kya main 15000 ka phone afford kar sakta hoon?", expect: "analyze" },
  { text: "where do I spend the most money?", expect: "analyze" },
  { text: "mahine ke end tak kitna bachega?", expect: "analyze" },
  // ── act ──
  { text: "500 ka petrol add karo", expect: "act" },
  { text: "kal ka grocery wala kharcha delete karo", expect: "act" },
  { text: "50000 ka savings goal banao", expect: "act" },
];

// A fake Convex action context: buildFinancialContext will throw, orchestrate
// swallows it, and routing proceeds with a null financial context (fine here).
const fakeCtx = {
  runQuery: async () => {
    throw new Error("no Convex backend in a live routing test");
  },
};

describe.skipIf(!KEY)("AI intent router — live", () => {
  it(
    "routes ≥ 80% of sample messages to the right specialist",
    async () => {
      const { orchestrate } = await import("@/lib/ai/orchestrator");

      const results: Array<{ text: string; got: Intent; want: Intent }> = [];
      for (const s of SAMPLES) {
        const r = await orchestrate(
          {
            userMessage: s.text,
            preferredLanguage: "ur",
            conversationHistory: [],
          },
          fakeCtx,
          {},
        );
        results.push({ text: s.text, got: r.intentType, want: s.expect });
      }

      const hits = results.filter((r) => r.got === r.want);
      const misses = results.filter((r) => r.got !== r.want);
      if (misses.length) {
        console.warn(
          "intent-router misses:\n" +
            misses.map((m) => `  "${m.text}" → ${m.got} (want ${m.want})`).join("\n"),
        );
      }

      expect(hits.length / SAMPLES.length).toBeGreaterThanOrEqual(0.8);
    },
    240_000,
  );
});

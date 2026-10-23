import { describe, it, expect } from "vitest";
import {
  buildGuardrailReply,
  createRelevanceGuardrail,
  extractGuardrailInput,
  formatGuardrailPrompt,
  isBlockingVerdict,
  isTrivialSmallTalk,
  parseGuardrailVerdict,
  type GuardrailOutputInfo,
  type RelevanceClassifier,
} from "@/lib/ai/guardrail";

describe("isTrivialSmallTalk", () => {
  it.each([
    "hi",
    "Salam!",
    "Assalam o Alaikum",
    "shukriya",
    "Thank you.",
    "theek hai",
    "السلام علیکم",
    "شکریہ!",
    "  OK  ",
  ])("treats %j as small talk", (text) => {
    expect(isTrivialSmallTalk(text)).toBe(true);
  });

  it.each([
    "hello, write me a poem",
    "salam, is mahine kitna kharch hua?",
    "thanks but who won the match",
    "",
    "   ",
  ])("does not fast-path %j", (text) => {
    expect(isTrivialSmallTalk(text)).toBe(false);
  });
});

describe("extractGuardrailInput", () => {
  it("handles a plain string input", () => {
    expect(extractGuardrailInput("budget banao")).toEqual({
      latest: "budget banao",
      context: [],
    });
  });

  it("takes the last user message and the turns before it", () => {
    const input = [
      { role: "user", content: "one" },
      { role: "assistant", content: "two" },
      { role: "user", content: "three" },
      { role: "assistant", content: "four" },
      { role: "user", content: "five" },
    ];
    const { latest, context } = extractGuardrailInput(input, 2);
    expect(latest).toBe("five");
    expect(context).toEqual([
      { role: "user", text: "three" },
      { role: "assistant", text: "four" },
    ]);
  });

  it("reads array content parts and skips non-message items", () => {
    const input = [
      { type: "function_call", name: "x" },
      {
        role: "user",
        content: [
          { type: "input_text", text: "500 ka " },
          { type: "input_text", text: "petrol" },
        ],
      },
    ];
    expect(extractGuardrailInput(input).latest).toBe("500 ka petrol");
  });

  it("returns an empty latest message when there is no user turn", () => {
    expect(
      extractGuardrailInput([{ role: "assistant", content: "hi" }]).latest,
    ).toBe("");
  });
});

describe("parseGuardrailVerdict", () => {
  it("parses bare JSON", () => {
    expect(
      parseGuardrailVerdict(
        '{"related": false, "category": "off_topic", "reason": "sports"}',
      ),
    ).toEqual({ related: false, category: "off_topic", reason: "sports" });
  });

  it("parses fenced JSON with surrounding prose", () => {
    const text =
      'Here you go:\n```json\n{"related": true, "category": "finance", "reason": "budget"}\n```';
    expect(parseGuardrailVerdict(text)?.related).toBe(true);
  });

  it.each([
    null,
    "",
    "not json",
    '{"related": "yes", "category": "finance", "reason": ""}',
    '{"related": true, "category": "weather", "reason": ""}',
    '{"related": true}',
  ])("rejects %j", (text) => {
    expect(parseGuardrailVerdict(text)).toBeNull();
  });
});

describe("isBlockingVerdict", () => {
  it("blocks unrelated verdicts", () => {
    expect(
      isBlockingVerdict({ related: false, category: "off_topic", reason: "" }),
    ).toBe(true);
  });

  it("blocks injection / harmful categories even if related=true", () => {
    expect(
      isBlockingVerdict({
        related: true,
        category: "prompt_injection",
        reason: "",
      }),
    ).toBe(true);
    expect(
      isBlockingVerdict({ related: true, category: "harmful", reason: "" }),
    ).toBe(true);
  });

  it.each(["finance", "app_help", "small_talk"] as const)(
    "allows related %s",
    (category) => {
      expect(isBlockingVerdict({ related: true, category, reason: "" })).toBe(
        false,
      );
    },
  );
});

describe("formatGuardrailPrompt", () => {
  it("delimits context and the latest message as data blocks", () => {
    const prompt = formatGuardrailPrompt("aur?", [
      { role: "user", text: "food pe kitna?" },
      { role: "assistant", text: "Rs. 9,000" },
    ]);
    expect(prompt).toContain("<conversation_context>");
    expect(prompt).toContain("User: food pe kitna?");
    expect(prompt).toContain("Assistant: Rs. 9,000");
    expect(prompt).toContain("<latest_user_message>\naur?\n</latest_user_message>");
  });

  it("truncates very long messages", () => {
    const prompt = formatGuardrailPrompt("x".repeat(5000), []);
    expect(prompt.length).toBeLessThan(2200);
  });
});

describe("createRelevanceGuardrail", () => {
  const args = (input: string) =>
    ({ input, agent: {}, context: {} }) as unknown as Parameters<
      ReturnType<typeof createRelevanceGuardrail>["execute"]
    >[0];

  it("is a blocking (non-parallel) guardrail", () => {
    const g = createRelevanceGuardrail(async () => null);
    expect(g.runInParallel).toBe(false);
  });

  it("trips on a blocking verdict", async () => {
    const classify: RelevanceClassifier = async () => ({
      related: false,
      category: "off_topic",
      reason: "movies",
    });
    const out = await createRelevanceGuardrail(classify).execute(
      args("best movie of 2026?"),
    );
    expect(out.tripwireTriggered).toBe(true);
    expect((out.outputInfo as GuardrailOutputInfo).source).toBe("agent");
  });

  it("does not call the classifier for small talk", async () => {
    let called = false;
    const out = await createRelevanceGuardrail(async () => {
      called = true;
      return null;
    }).execute(args("shukriya"));
    expect(called).toBe(false);
    expect(out.tripwireTriggered).toBe(false);
    expect((out.outputInfo as GuardrailOutputInfo).source).toBe("fast_path");
  });

  it("fails open on classifier errors and records why", async () => {
    const out = await createRelevanceGuardrail(async () => {
      throw new Error("429 rate limited");
    }).execute(args("kitna kharch hua?"));
    expect(out.tripwireTriggered).toBe(false);
    const info = out.outputInfo as GuardrailOutputInfo;
    expect(info.source).toBe("fail_open");
    expect(info.error).toContain("429");
  });
});

describe("buildGuardrailReply", () => {
  it("is in Urdu script for ur and English for en", () => {
    expect(buildGuardrailReply("off_topic", "ur")).toMatch(/[؀-ۿ]/);
    expect(buildGuardrailReply("off_topic", "en")).not.toMatch(
      /[؀-ۿ]/,
    );
  });

  it("gives a distinct reply per category", () => {
    for (const lang of ["ur", "en"] as const) {
      const replies = new Set(
        (["off_topic", "prompt_injection", "harmful"] as const).map((c) =>
          buildGuardrailReply(c, lang),
        ),
      );
      expect(replies.size).toBe(3);
    }
  });
});

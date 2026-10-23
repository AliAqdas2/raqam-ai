import { describe, it, expect } from "vitest";
import {
  AZURE_OUTPUT_FORMAT,
  AZURE_VOICES,
  MAX_TTS_CHARS,
  buildSsml,
  bytesToBase64,
  detectSpeechLanguage,
  escapeXml,
  prepareTextForSpeech,
  synthesizeSpeechChain,
  synthesizeWithAzure,
  speechWatchdogMs,
  SYNTHESIS_TIMEOUT_MS,
} from "@/lib/ai/tts";

describe("detectSpeechLanguage", () => {
  it("detects Urdu script", () => {
    expect(detectSpeechLanguage("آپ نے اس مہینے Rs. 12,500 خرچ کیے")).toBe("ur");
  });

  it("keeps Urdu when English finance terms are mixed in", () => {
    expect(
      detectSpeechLanguage("آپ کا food budget اور credit card کا بل ہے"),
    ).toBe("ur");
  });

  it("detects English", () => {
    expect(detectSpeechLanguage("You spent Rs. 12,500 on food.")).toBe("en");
  });

  it("uses the fallback when there are no letters", () => {
    expect(detectSpeechLanguage("1,200 / 500", "en")).toBe("en");
    expect(detectSpeechLanguage("", "ur")).toBe("ur");
  });
});

describe("prepareTextForSpeech", () => {
  it("strips markdown syntax but keeps the words", () => {
    const md =
      "## Summary\n\n- **Food**: Rs. 9,000\n- *Transport*: Rs 1,200\n\nSee [budgets](/budgets).";
    expect(prepareTextForSpeech(md, "en")).toBe(
      "Summary\nFood: 9,000 rupees\nTransport: 1,200 rupees\nSee budgets.",
    );
  });

  it("reads currency as روپے in Urdu", () => {
    expect(prepareTextForSpeech("کل خرچ Rs. 4,500 ہے", "ur")).toBe(
      "کل خرچ چار ہزار پانچ سو روپے ہے",
    );
    expect(prepareTextForSpeech("₨1,000 and PKR 50", "en")).toBe(
      "1,000 rupees and 50 rupees",
    );
  });

  it("does not treat 'rs' inside words as currency", () => {
    expect(prepareTextForSpeech("in 3 hours 5 minutes", "en")).toBe(
      "in 3 hours 5 minutes",
    );
  });

  it("never reads code blocks (e.g. a leaked action JSON)", () => {
    const md = 'Confirm?\n```json\n{"action":"createTransaction"}\n```';
    expect(prepareTextForSpeech(md, "en")).toBe("Confirm?");
  });

  it("removes emoji and table rules", () => {
    const md = "| Category | Amount |\n|---|---|\n| Food 🍔 | 500 |";
    const out = prepareTextForSpeech(md, "en");
    expect(out).not.toMatch(/🍔|---/);
    expect(out).toContain("Food");
  });

  it("caps very long text at a sentence boundary", () => {
    const sentence = "This is a sentence about money. ";
    const out = prepareTextForSpeech(sentence.repeat(200), "en");
    expect(out.length).toBeLessThanOrEqual(MAX_TTS_CHARS);
    expect(out.endsWith(".")).toBe(true);
  });
});

describe("SSML", () => {
  it("escapes XML special characters", () => {
    expect(escapeXml(`a & b < c > "d" 'e'`)).toBe(
      "a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;",
    );
  });

  it("builds a voice document with breaks between lines", () => {
    const ssml = buildSsml("Line one\nLine <two>", AZURE_VOICES.ur.female, 10);
    expect(ssml).toContain('xml:lang="ur-PK"');
    expect(ssml).toContain('<voice name="ur-PK-UzmaNeural">');
    expect(ssml).toContain('<prosody rate="+10%">');
    expect(ssml).toContain('Line one<break time="350ms"/>Line &lt;two&gt;');
  });

  it("clamps the speaking rate", () => {
    expect(buildSsml("x", AZURE_VOICES.en.male, -90)).toContain('rate="-50%"');
    expect(buildSsml("x", AZURE_VOICES.en.male, 90)).toContain('rate="+50%"');
  });
});

describe("bytesToBase64", () => {
  it("matches Node's encoder, including large buffers", () => {
    const bytes = new Uint8Array(100_000).map((_, i) => i % 256);
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
  });
});

describe("synthesizeWithAzure", () => {
  it("posts SSML with the key, format and region endpoint", async () => {
    let url = "";
    let init: RequestInit | undefined;
    const fetchImpl = (async (u: string, i: RequestInit) => {
      url = u;
      init = i;
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }) as unknown as typeof fetch;

    const b64 = await synthesizeWithAzure({
      apiKey: "k",
      region: "eastus",
      ssml: "<speak/>",
      fetchImpl,
    });

    expect(url).toBe(
      "https://eastus.tts.speech.microsoft.com/cognitiveservices/v1",
    );
    const headers = init?.headers as Record<string, string>;
    expect(headers["Ocp-Apim-Subscription-Key"]).toBe("k");
    expect(headers["X-Microsoft-OutputFormat"]).toBe(AZURE_OUTPUT_FORMAT);
    expect(init?.body).toBe("<speak/>");
    expect(b64).toBe("AQID");
  });

  it("throws on HTTP errors and on empty audio", async () => {
    const failing = (async () =>
      new Response("quota", { status: 429 })) as unknown as typeof fetch;
    await expect(
      synthesizeWithAzure({ apiKey: "k", region: "r", ssml: "", fetchImpl: failing }),
    ).rejects.toThrow(/429/);

    const empty = (async () =>
      new Response(new Uint8Array(), { status: 200 })) as unknown as typeof fetch;
    await expect(
      synthesizeWithAzure({ apiKey: "k", region: "r", ssml: "", fetchImpl: empty }),
    ).rejects.toThrow(/empty/);
  });
});

describe("synthesizeSpeechChain", () => {
  it("uses Azure with the Urdu voice for Urdu text", async () => {
    let sentSsml = "";
    const res = await synthesizeSpeechChain(
      { text: "آپ کی بچت Rs. 5,000 ہے", preferredLanguage: "en", gender: "male" },
      {
        synthesizeAzure: async (ssml) => {
          sentSsml = ssml;
          return "QUJD";
        },
      },
    );
    expect(res).toEqual({
      audioBase64: "QUJD",
      mimeType: "audio/mpeg",
      provider: "azure",
      language: "ur",
      error: null,
    });
    expect(sentSsml).toContain("ur-PK-AsadNeural");
    expect(sentSsml).toContain("پانچ ہزار روپے");
  });

  it("uses the English voice for English text", async () => {
    let sentSsml = "";
    await synthesizeSpeechChain(
      { text: "You saved Rs. 5,000.", preferredLanguage: "ur" },
      {
        synthesizeAzure: async (ssml) => {
          sentSsml = ssml;
          return "x";
        },
      },
    );
    expect(sentSsml).toContain("en-US-AvaMultilingualNeural");
  });

  it("returns provider null (browser fallback) when Azure fails", async () => {
    const res = await synthesizeSpeechChain(
      { text: "hello", preferredLanguage: "en" },
      {
        synthesizeAzure: async () => {
          throw new Error("401");
        },
        onProviderError: () => {},
      },
    );
    expect(res.provider).toBeNull();
    expect(res.error).toContain("azure: 401");
    expect(res.language).toBe("en");
  });

  it("returns provider null when nothing is configured", async () => {
    const res = await synthesizeSpeechChain(
      { text: "hello", preferredLanguage: "en" },
      {},
    );
    expect(res.provider).toBeNull();
    expect(res.error).toMatch(/No TTS provider/);
  });

  it("does not call the provider for empty text", async () => {
    let called = false;
    const res = await synthesizeSpeechChain(
      { text: "```json\n{}\n```", preferredLanguage: "ur" },
      {
        synthesizeAzure: async () => {
          called = true;
          return "";
        },
      },
    );
    expect(called).toBe(false);
    expect(res.error).toBe("Nothing to speak");
  });
});

describe("speechWatchdogMs", () => {
  it("always leaves room for synthesis plus playback", () => {
    expect(speechWatchdogMs("")).toBeGreaterThan(SYNTHESIS_TIMEOUT_MS);
    // ~70 ms/char is normal speech; the watchdog must not cut it off.
    const text = "ا".repeat(400);
    expect(speechWatchdogMs(text)).toBeGreaterThan(SYNTHESIS_TIMEOUT_MS + 400 * 70);
  });

  it("is bounded even for very long text", () => {
    const capped = speechWatchdogMs("a".repeat(MAX_TTS_CHARS));
    expect(speechWatchdogMs("a".repeat(MAX_TTS_CHARS * 10))).toBe(capped);
    expect(capped).toBeLessThan(10 * 60_000);
  });
});

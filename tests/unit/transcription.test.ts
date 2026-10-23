import { describe, it, expect, vi } from "vitest";
import {
  transcribeWithAssemblyAI,
  transcribeAudioChain,
  base64ToBytes,
  containsDevanagari,
  ASSEMBLYAI_SPEECH_MODEL,
} from "@/lib/ai/transcription";

// ─── Fake fetch helpers ────────────────────────────────────────────────────────

function jsonResponse(
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const noSleep = () => Promise.resolve();
const audio = new Uint8Array([1, 2, 3, 4]);

// ─── transcribeWithAssemblyAI ──────────────────────────────────────────────────

describe("transcribeWithAssemblyAI", () => {
  it("uploads, submits with universal-2 + language_detection, and polls to completion", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        const u = String(url);
        calls.push({ url: u, init });
        if (u.endsWith("/v2/upload")) {
          return jsonResponse({ upload_url: "https://cdn.assemblyai.com/x" });
        }
        if (u.endsWith("/v2/transcript")) {
          return jsonResponse({ id: "t1", status: "queued" });
        }
        return jsonResponse({
          id: "t1",
          status: "completed",
          text: "  aaj panch sau kharch  ",
          language_code: "ur",
        });
      },
    ) as unknown as typeof fetch;

    const res = await transcribeWithAssemblyAI({
      apiKey: "test-key",
      audio,
      fetchImpl,
      sleep: noSleep,
    });

    expect(res.transcript).toBe("aaj panch sau kharch");
    expect(res.languageCode).toBe("ur");

    const submit = calls.find(
      (c) => c.url.endsWith("/v2/transcript") && c.init?.method === "POST",
    );
    expect(submit).toBeDefined();
    const body = JSON.parse(String(submit!.init!.body));
    expect(body.speech_models).toEqual([ASSEMBLYAI_SPEECH_MODEL]);
    expect(body.language_detection).toBe(true);
    // Detection is limited to Urdu + English so Urdu is never labelled Hindi.
    expect(body.language_detection_options).toEqual({
      expected_languages: ["ur", "en"],
      fallback_language: "ur",
    });
    expect(body.audio_url).toBe("https://cdn.assemblyai.com/x");

    // Raw API key in the Authorization header — no "Bearer" prefix.
    const headers = submit!.init!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("test-key");
  });

  it("throws the job error field when status is 'error'", async () => {
    const fetchImpl = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith("/v2/upload")) return jsonResponse({ upload_url: "u" });
      if (u.endsWith("/v2/transcript")) {
        return jsonResponse({ id: "t", status: "processing" });
      }
      return jsonResponse({ id: "t", status: "error", error: "audio too short" });
    }) as unknown as typeof fetch;

    await expect(
      transcribeWithAssemblyAI({ apiKey: "k", audio, fetchImpl, sleep: noSleep }),
    ).rejects.toThrow(/audio too short/);
  });

  it("throws on an HTTP 401 at upload", async () => {
    const fetchImpl = (async () =>
      jsonResponse({ error: "Unauthorized" }, {
        ok: false,
        status: 401,
      })) as unknown as typeof fetch;

    await expect(
      transcribeWithAssemblyAI({
        apiKey: "bad",
        audio,
        fetchImpl,
        sleep: noSleep,
      }),
    ).rejects.toThrow(/401/);
  });

  it("times out when the job never completes", async () => {
    let clock = 0;
    const now = () => clock;
    const sleep = async (ms: number) => {
      clock += ms;
    };
    const fetchImpl = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith("/v2/upload")) return jsonResponse({ upload_url: "u" });
      if (u.endsWith("/v2/transcript")) {
        return jsonResponse({ id: "t", status: "processing" });
      }
      return jsonResponse({ id: "t", status: "processing" });
    }) as unknown as typeof fetch;

    await expect(
      transcribeWithAssemblyAI({
        apiKey: "k",
        audio,
        fetchImpl,
        now,
        sleep,
        timeoutMs: 10_000,
        pollIntervalMs: 3_000,
      }),
    ).rejects.toThrow(/timed out/i);
  });

  it("rejects empty audio without calling the network", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    await expect(
      transcribeWithAssemblyAI({
        apiKey: "k",
        audio: new Uint8Array(),
        fetchImpl,
      }),
    ).rejects.toThrow(/no audio data/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

// ─── transcribeAudioChain ──────────────────────────────────────────────────────

describe("transcribeAudioChain", () => {
  const input = {
    audioBase64: Buffer.from("hello").toString("base64"),
    mimeType: "audio/webm",
  };
  const silent = { onProviderError: () => {} };

  it("returns the AssemblyAI transcript when it succeeds", async () => {
    const res = await transcribeAudioChain(input, {
      ...silent,
      transcribeAssemblyAI: async () => "from assemblyai",
      transcribeGemini: async () => "from gemini",
    });
    expect(res).toEqual({
      transcript: "from assemblyai",
      provider: "assemblyai",
      error: null,
    });
  });

  it("falls through to Gemini when AssemblyAI returns empty", async () => {
    const res = await transcribeAudioChain(input, {
      ...silent,
      transcribeAssemblyAI: async () => "   ",
      transcribeGemini: async () => "gemini text",
    });
    expect(res.provider).toBe("gemini");
    expect(res.transcript).toBe("gemini text");
  });

  it("falls through to Gemini when AssemblyAI throws", async () => {
    const res = await transcribeAudioChain(input, {
      ...silent,
      transcribeAssemblyAI: async () => {
        throw new Error("aai boom");
      },
      transcribeGemini: async () => "recovered",
    });
    expect(res).toEqual({
      transcript: "recovered",
      provider: "gemini",
      error: null,
    });
  });

  it("returns provider null with a combined error when both providers fail", async () => {
    const res = await transcribeAudioChain(input, {
      ...silent,
      transcribeAssemblyAI: async () => {
        throw new Error("aai down");
      },
      transcribeGemini: async () => {
        throw new Error("gemini down");
      },
    });
    expect(res.provider).toBeNull();
    expect(res.transcript).toBe("");
    expect(res.error).toMatch(/aai down/);
    expect(res.error).toMatch(/gemini down/);
  });

  it("returns an error when no provider is configured", async () => {
    const res = await transcribeAudioChain(input, silent);
    expect(res.provider).toBeNull();
    expect(res.error).toMatch(/no transcription provider/i);
  });

  it("short-circuits on empty audio", async () => {
    const res = await transcribeAudioChain(
      { audioBase64: "", mimeType: "audio/webm" },
      { ...silent, transcribeAssemblyAI: async () => "x" },
    );
    expect(res.provider).toBeNull();
    expect(res.error).toMatch(/no audio data/i);
  });
});

// ─── base64ToBytes ─────────────────────────────────────────────────────────────

describe("base64ToBytes", () => {
  it("round-trips ASCII bytes", () => {
    const bytes = base64ToBytes(Buffer.from("abc").toString("base64"));
    expect(Array.from(bytes)).toEqual([97, 98, 99]);
  });
});

describe("Hindi script is never accepted", () => {
  const HINDI = "आज पाँच सौ रुपये खर्च हुए";
  const URDU = "آج پانچ سو روپے خرچ ہوئے";

  it("containsDevanagari tells the scripts apart", () => {
    expect(containsDevanagari(HINDI)).toBe(true);
    expect(containsDevanagari(URDU)).toBe(false);
    expect(containsDevanagari("aaj 500 rupay kharch huay")).toBe(false);
    expect(containsDevanagari(`${URDU} budget`)).toBe(false);
  });

  it("falls through to Gemini when AssemblyAI returns Devanagari", async () => {
    const res = await transcribeAudioChain(
      { audioBase64: "AQID", mimeType: "audio/wav" },
      {
        transcribeAssemblyAI: async () => HINDI,
        transcribeGemini: async () => URDU,
        onProviderError: () => {},
      },
    );
    expect(res).toEqual({ transcript: URDU, provider: "gemini", error: null });
  });

  it("returns no transcript rather than Hindi when every provider writes Devanagari", async () => {
    const res = await transcribeAudioChain(
      { audioBase64: "AQID", mimeType: "audio/wav" },
      {
        transcribeAssemblyAI: async () => HINDI,
        transcribeGemini: async () => HINDI,
        onProviderError: () => {},
      },
    );
    expect(res.transcript).toBe("");
    expect(res.provider).toBeNull();
    expect(res.error).toContain("Hindi-script transcript rejected");
  });
});

// lib/ai/transcription.ts — Speech-to-text with a provider fallback chain.
//
// Priority order (product decision, 2026-08-30):
//   1. AssemblyAI  — primary. Model "universal-2": the cheapest AssemblyAI tier
//                    and the only AssemblyAI model that supports Urdu.
//   2. Gemini      — fallback, via lib/ai/models.ts `callGeminiWithFallback`.
//   3. Web Speech  — tertiary, in the browser (see hooks/useVoiceInput.ts). Kicks
//                    in when this module returns `provider: null`.
//
// This module is pure: no Convex, no DOM. `fetch`, the clock, and `sleep` are all
// injectable so the AssemblyAI flow is unit-testable without network or real
// delays. Imported from convex/ai.ts ("use node") and tests/unit/transcription.test.ts.

export const ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com";

/** Cheapest AssemblyAI speech model — and the only one that supports Urdu. */
export const ASSEMBLYAI_SPEECH_MODEL = "universal-2";

/**
 * Spoken Urdu and Hindi sound almost the same, so unconstrained language
 * detection often labels Urdu speech as Hindi and writes it in Devanagari.
 * Detection is limited to the two languages the app supports, and anything
 * the model is unsure about is transcribed as Urdu.
 */
export const ASSEMBLYAI_EXPECTED_LANGUAGES = ["ur", "en"] as const;
export const ASSEMBLYAI_FALLBACK_LANGUAGE = "ur";

export type TranscriptProvider = "assemblyai" | "gemini" | "browser";

/** True when the text contains Devanagari (Hindi script) letters. */
export function containsDevanagari(text: string): boolean {
  return /[\u0900-\u097F\uA8E0-\uA8FF]/.test(text);
}

export interface TranscriptionResult {
  transcript: string;
  provider: TranscriptProvider | null;
  error: string | null;
}

// ─── AssemblyAI REST flow ──────────────────────────────────────────────────────

export interface AssemblyAITranscribeOptions {
  apiKey: string;
  /** Raw audio bytes (already decoded from base64). */
  audio: Uint8Array;
  /** Ask AssemblyAI to auto-detect the spoken language. Default true. */
  languageDetection?: boolean;
  /** Poll interval while the job runs. Default 1000ms. */
  pollIntervalMs?: number;
  /**
   * Give up after this long and throw. Default 20000ms: short enough that the
   * Gemini fallback still fits inside the client's 30 s wait (useVoiceInput).
   */
  timeoutMs?: number;
  /** Injectable fetch (defaults to the global). */
  fetchImpl?: typeof fetch;
  /** Injectable clock (defaults to Date.now). */
  now?: () => number;
  /** Injectable sleep (defaults to a setTimeout promise). */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface AssemblyAIUploadResponse {
  upload_url?: string;
}

interface AssemblyAITranscriptResponse {
  id?: string;
  status: "queued" | "processing" | "completed" | "error";
  text?: string | null;
  error?: string | null;
  language_code?: string | null;
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "";
  }
}

/** Copy bytes into a plain ArrayBuffer — a portable `fetch` body across runtimes. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

/**
 * Upload + submit + poll against AssemblyAI. Resolves with the recognised text
 * (possibly an empty string if the audio was silent). Throws on HTTP errors, a
 * job-level `error` status, or timeout.
 */
export async function transcribeWithAssemblyAI(
  opts: AssemblyAITranscribeOptions,
): Promise<{ transcript: string; languageCode: string | null }> {
  const {
    apiKey,
    audio,
    languageDetection = true,
    pollIntervalMs = 1000,
    timeoutMs = 20000,
    fetchImpl = fetch,
    now = Date.now,
    sleep = defaultSleep,
  } = opts;

  if (!apiKey) throw new Error("AssemblyAI API key is missing");
  if (!audio || audio.byteLength === 0) {
    throw new Error("No audio data to transcribe");
  }

  // The Authorization header is the RAW key — no "Bearer" prefix (AssemblyAI).
  const authHeaders: Record<string, string> = { Authorization: apiKey };

  // 1. Upload the raw bytes.
  const uploadRes = await fetchImpl(`${ASSEMBLYAI_BASE_URL}/v2/upload`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/octet-stream" },
    body: toArrayBuffer(audio),
  });
  if (!uploadRes.ok) {
    throw new Error(
      `AssemblyAI upload failed: HTTP ${uploadRes.status} ${await safeText(uploadRes)}`,
    );
  }
  const uploaded = (await uploadRes.json()) as AssemblyAIUploadResponse;
  if (!uploaded.upload_url) {
    throw new Error("AssemblyAI upload returned no upload_url");
  }

  // 2. Submit the transcription job.
  const submitRes = await fetchImpl(`${ASSEMBLYAI_BASE_URL}/v2/transcript`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      audio_url: uploaded.upload_url,
      speech_models: [ASSEMBLYAI_SPEECH_MODEL],
      language_detection: languageDetection,
      ...(languageDetection
        ? {
            language_detection_options: {
              expected_languages: [...ASSEMBLYAI_EXPECTED_LANGUAGES],
              fallback_language: ASSEMBLYAI_FALLBACK_LANGUAGE,
            },
          }
        : { language_code: ASSEMBLYAI_FALLBACK_LANGUAGE }),
    }),
  });
  if (!submitRes.ok) {
    throw new Error(
      `AssemblyAI submit failed: HTTP ${submitRes.status} ${await safeText(submitRes)}`,
    );
  }
  const submitted = (await submitRes.json()) as AssemblyAITranscriptResponse;
  if (!submitted.id) {
    throw new Error("AssemblyAI submit returned no transcript id");
  }

  // 3. Poll until completed / error / timeout.
  const deadline = now() + timeoutMs;
  let current = submitted;

  while (current.status !== "completed" && current.status !== "error") {
    if (now() >= deadline) {
      throw new Error("AssemblyAI transcription timed out");
    }
    await sleep(pollIntervalMs);
    const pollRes = await fetchImpl(
      `${ASSEMBLYAI_BASE_URL}/v2/transcript/${submitted.id}`,
      { method: "GET", headers: authHeaders },
    );
    if (!pollRes.ok) {
      throw new Error(
        `AssemblyAI poll failed: HTTP ${pollRes.status} ${await safeText(pollRes)}`,
      );
    }
    current = (await pollRes.json()) as AssemblyAITranscriptResponse;
  }

  if (current.status === "error") {
    throw new Error(
      `AssemblyAI transcription error: ${current.error ?? "unknown"}`,
    );
  }

  return {
    transcript: (current.text ?? "").trim(),
    languageCode: current.language_code ?? null,
  };
}

// ─── Fallback chain ────────────────────────────────────────────────────────────

export interface TranscribeChainDeps {
  /** Transcribe raw bytes via AssemblyAI. Omit when no API key is configured. */
  transcribeAssemblyAI?: (audio: Uint8Array) => Promise<string>;
  /** Transcribe base64 audio via Gemini. Omit when no API key is configured. */
  transcribeGemini?: (audioBase64: string, mimeType: string) => Promise<string>;
  /** Optional logger for provider failures (defaults to console.warn). */
  onProviderError?: (provider: TranscriptProvider, err: unknown) => void;
}

export interface TranscribeChainInput {
  audioBase64: string;
  mimeType: string;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Run the AssemblyAI → Gemini chain. The first provider to return a non-empty
 * transcript wins. A transcript in Devanagari (Hindi script) is never
 * accepted: it counts as a failure and the next provider is tried. When both are unavailable / empty / failing, returns
 * `provider: null` so the caller can fall back to the browser Web Speech API.
 */
export async function transcribeAudioChain(
  input: TranscribeChainInput,
  deps: TranscribeChainDeps,
): Promise<TranscriptionResult> {
  const log =
    deps.onProviderError ??
    ((p, e) => console.warn(`[transcription] ${p} failed:`, e));

  if (!input.audioBase64) {
    return {
      transcript: "",
      provider: null,
      error: "No audio data to transcribe",
    };
  }

  const errors: string[] = [];

  // 1. AssemblyAI (primary)
  if (deps.transcribeAssemblyAI) {
    try {
      const bytes = base64ToBytes(input.audioBase64);
      const text = (await deps.transcribeAssemblyAI(bytes)).trim();
      if (text && !containsDevanagari(text)) {
        return { transcript: text, provider: "assemblyai", error: null };
      }
      errors.push(
        text ? "assemblyai: Hindi-script transcript rejected" : "assemblyai: empty transcript",
      );
    } catch (err) {
      log("assemblyai", err);
      errors.push(`assemblyai: ${errMsg(err)}`);
    }
  }

  // 2. Gemini (fallback)
  if (deps.transcribeGemini) {
    try {
      const text = (
        await deps.transcribeGemini(input.audioBase64, input.mimeType)
      ).trim();
      if (text && !containsDevanagari(text)) {
        return { transcript: text, provider: "gemini", error: null };
      }
      errors.push(
        text ? "gemini: Hindi-script transcript rejected" : "gemini: empty transcript",
      );
    } catch (err) {
      log("gemini", err);
      errors.push(`gemini: ${errMsg(err)}`);
    }
  }

  return {
    transcript: "",
    provider: null,
    error:
      errors.length > 0
        ? `All server transcription providers failed — ${errors.join("; ")}`
        : "No transcription provider is configured",
  };
}

/** Decode a base64 string to raw bytes. Works in Node and modern browsers. */
export function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

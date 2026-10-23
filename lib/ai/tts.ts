// lib/ai/tts.ts — Text-to-speech: text preparation, voice selection, SSML and
// the provider fallback chain. Mirrors lib/ai/transcription.ts (speech-to-text)
// so the assistant can talk back — the second half of a two-way voice loop.
//
// Priority order:
//   1. Azure AI Speech neural TTS — server-side, via the `ai.synthesizeSpeech`
//      Convex action. Native Pakistani Urdu voices (ur-PK-UzmaNeural /
//      ur-PK-AsadNeural) and natural multilingual English voices. Free F0 tier
//      (0.5M chars / month), then pay-as-you-go.
//   2. Browser speechSynthesis — client-side, in hooks/useTextToSpeech.ts. Used
//      when the server path returns `provider: null` (no key, quota, outage).
//
// Everything in this file except `synthesizeWithAzure` is pure and unit-tested.

import { prepareUrduForSpeech } from "./urdu-speech";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type SpeechLanguage = "ur" | "en";
export type VoiceGender = "female" | "male";
export type TtsProvider = "azure" | "browser";

export interface SynthesisResult {
  audioBase64: string;
  mimeType: string;
  provider: Exclude<TtsProvider, "browser"> | null;
  /** The language the text was spoken in (after detection). */
  language: SpeechLanguage;
  error: string | null;
}

// ─── Voices ─────────────────────────────────────────────────────────────────────

export const AZURE_VOICES: Record<
  SpeechLanguage,
  Record<VoiceGender, { name: string; locale: string }>
> = {
  ur: {
    female: { name: "ur-PK-UzmaNeural", locale: "ur-PK" },
    male: { name: "ur-PK-AsadNeural", locale: "ur-PK" },
  },
  en: {
    female: { name: "en-US-AvaMultilingualNeural", locale: "en-US" },
    male: { name: "en-US-AndrewMultilingualNeural", locale: "en-US" },
  },
};

/** BCP-47 locale for the browser speechSynthesis fallback. */
export const BROWSER_LOCALES: Record<SpeechLanguage, string> = {
  ur: "ur-PK",
  en: "en-US",
};

/** Hard cap on characters sent for synthesis (cost + latency bound). */
export const MAX_TTS_CHARS = 2500;

/** Give up on server synthesis after this long and use the browser voice. */
export const SYNTHESIS_TIMEOUT_MS = 15_000;

/**
 * Upper bound on how long speaking `text` may take, end to end (synthesis +
 * playback). Playback that runs past it is stopped, so a lost `ended` /
 * `onend` event (a known Chrome speechSynthesis bug) can never stall the
 * voice call. Normal speech is ~70 ms per character; this allows ~2x that.
 */
export function speechWatchdogMs(text: string): number {
  const chars = Math.min(text.length, MAX_TTS_CHARS);
  return SYNTHESIS_TIMEOUT_MS + 5_000 + chars * 150;
}

// ─── Language detection ─────────────────────────────────────────────────────────

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
const LATIN_LETTER = /[A-Za-z]/g;

/**
 * Pick the voice language from the text itself: Urdu script → "ur", otherwise
 * "en". Urdu replies routinely contain English finance terms ("budget",
 * "Rs."), so Urdu wins whenever Arabic-script letters make up at least a
 * quarter of the letters.
 */
export function detectSpeechLanguage(
  text: string,
  fallback: SpeechLanguage = "ur",
): SpeechLanguage {
  const arabic = (text.match(ARABIC_SCRIPT) ?? []).length;
  const latin = (text.match(LATIN_LETTER) ?? []).length;
  if (arabic === 0 && latin === 0) return fallback;
  return arabic / (arabic + latin) >= 0.25 ? "ur" : "en";
}

// ─── Text preparation ───────────────────────────────────────────────────────────

/**
 * Turn an assistant reply (markdown) into plain text a voice can read:
 * drop code blocks, markdown syntax, emoji and table rules; read currency
 * naturally ("Rs. 1,200" → "1,200 روپے" / "1,200 rupees").
 */
export function prepareTextForSpeech(
  markdown: string,
  language: SpeechLanguage,
): string {
  const rupees = language === "ur" ? "روپے" : "rupees";
  let text = markdown
    // Fenced code blocks (e.g. a leaked action JSON) are never read aloud.
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    // Images, then links → their label.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // Headings, blockquotes, list markers.
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*(?:[-*+•]|\d+[.)])\s+/gm, "")
    // Table separator rows, then remaining pipes.
    .replace(/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/gm, " ")
    .replace(/\|/g, ", ")
    // Bold / italic / strikethrough markers.
    .replace(/(\*\*|__|~~)(.*?)\1/g, "$2")
    .replace(/(^|\W)[*_](\S[^*_]*?)[*_](?=\W|$)/g, "$1$2")
    // Currency: "Rs. 1,200" / "Rs 1200" / "₨1,200" / "PKR 1,200".
    .replace(
      /(?<![A-Za-z])(?:Rs\.?|₨|PKR)\s?(\d[\d,]*(?:\.\d+)?)/gi,
      (_m, amount: string) => `${amount} ${rupees}`,
    )
    // Emoji and pictographs.
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    // Separators that would otherwise be read literally.
    .replace(/[—–]/g, ", ")
    .replace(/\s*\n+\s*/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  // Urdu voice: numbers as Urdu words, English finance terms respelled.
  if (language === "ur") text = prepareUrduForSpeech(text);

  if (text.length > MAX_TTS_CHARS) {
    // Cut at the last sentence end before the cap so the voice doesn't stop
    // mid-word.
    const slice = text.slice(0, MAX_TTS_CHARS);
    const lastStop = Math.max(
      slice.lastIndexOf("۔"),
      slice.lastIndexOf(". "),
      slice.lastIndexOf("؟"),
      slice.lastIndexOf("?"),
      slice.lastIndexOf("\n"),
    );
    text = (lastStop > MAX_TTS_CHARS * 0.5 ? slice.slice(0, lastStop + 1) : slice).trim();
  }
  return text;
}

// ─── SSML ───────────────────────────────────────────────────────────────────────

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build the SSML document for Azure. `rate` is a relative percentage
 * (-50…+50); newlines become short breaks so list items are paced naturally.
 */
export function buildSsml(
  text: string,
  voice: { name: string; locale: string },
  rate = 0,
): string {
  const clampedRate = Math.max(-50, Math.min(50, Math.round(rate)));
  const body = text
    .split("\n")
    .map((line) => escapeXml(line.trim()))
    .filter(Boolean)
    .join('<break time="350ms"/>');
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.locale}">` +
    `<voice name="${voice.name}"><prosody rate="${clampedRate >= 0 ? "+" : ""}${clampedRate}%">${body}</prosody></voice>` +
    `</speak>`
  );
}

// ─── Azure provider ─────────────────────────────────────────────────────────────

export const AZURE_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

/**
 * Call the Azure AI Speech REST endpoint. Returns MP3 bytes as base64.
 * Throws on non-2xx so the chain can fall back.
 */
export async function synthesizeWithAzure(opts: {
  apiKey: string;
  region: string;
  ssml: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(
    `https://${opts.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": opts.apiKey,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": AZURE_OUTPUT_FORMAT,
        "User-Agent": "raqam-ai",
      },
      body: opts.ssml,
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Azure TTS HTTP ${res.status} ${detail.slice(0, 200)}`.trim());
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length === 0) throw new Error("Azure TTS returned empty audio");
  return bytesToBase64(bytes);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// ─── Chain ──────────────────────────────────────────────────────────────────────

export interface SynthesisChainInput {
  text: string;
  /** Used when the text has no letters to detect from. */
  preferredLanguage: SpeechLanguage;
  gender?: VoiceGender;
  rate?: number;
}

export interface SynthesisChainDeps {
  /** Present only when Azure is configured. Receives SSML, returns base64 MP3. */
  synthesizeAzure?: (ssml: string) => Promise<string>;
  onProviderError?: (provider: string, err: unknown) => void;
}

/**
 * Run the server-side TTS chain. Never throws: on total failure it returns
 * `provider: null` with an error so the client can use speechSynthesis.
 */
export async function synthesizeSpeechChain(
  input: SynthesisChainInput,
  deps: SynthesisChainDeps,
): Promise<SynthesisResult> {
  const language = detectSpeechLanguage(input.text, input.preferredLanguage);
  const text = prepareTextForSpeech(input.text, language);
  const empty = { audioBase64: "", mimeType: "", provider: null, language };

  if (!text) return { ...empty, error: "Nothing to speak" };

  if (deps.synthesizeAzure) {
    try {
      const voice = AZURE_VOICES[language][input.gender ?? "female"];
      const audioBase64 = await deps.synthesizeAzure(
        buildSsml(text, voice, input.rate ?? 0),
      );
      return {
        audioBase64,
        mimeType: "audio/mpeg",
        provider: "azure",
        language,
        error: null,
      };
    } catch (err) {
      (deps.onProviderError ?? ((p, e) => console.warn(`[tts] ${p} failed:`, e)))(
        "azure",
        err,
      );
      return {
        ...empty,
        error: `azure: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return { ...empty, error: "No TTS provider configured" };
}

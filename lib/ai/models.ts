// lib/ai/models.ts — Centralized Gemini model configuration with fallback chains.
//
// All Gemini model references across the project go through this file.
// Models are ordered by preference; callers iterate through the chain until
// one succeeds. This protects against model deprecations and transient outages.

// ─── Model chains (all free-tier eligible) ──────────────────────────────────────

/**
 * General-purpose text generation models.
 * Used by the orchestrator and any agent that calls the OpenAI-compatible
 * endpoint or the generateContent REST API.
 *
 * Ordered by reliability on the free tier (verified Aug 2026).
 * gemini-2.5-* models return 404 and are excluded.
 * gemini-3.7-flash times out on free tier and is excluded.
 */
export const TEXT_MODELS: readonly string[] = [
  "gemini-3.6-flash", // Stable, reliable (verified working)
  "gemini-3.5-flash-lite", // Stable, fast (verified working)
  "gemini-3.5-flash", // Stable, legacy
] as const;

/**
 * Audio transcription models — tried in order until one succeeds.
 * gemini-3.5-transcribe is purpose-built for speech-to-text with
 * utterance detection, speaker diarization, and word timestamps.
 * Falls back to general Flash models if the specialized model is unavailable.
 */
export const TRANSCRIBE_MODELS: readonly string[] = [
  "gemini-3.5-transcribe", // Purpose-built speech-to-text
  ...TEXT_MODELS, // General models as fallback
] as const;

/**
 * Vision / multimodal models for image understanding (receipt OCR, etc.).
 * All current Flash models support vision input via inline_data.
 */
export const VISION_MODELS: readonly string[] = TEXT_MODELS;

/**
 * The primary model used by the orchestrator for agent reasoning.
 * Import this constant instead of hard-coding model names.
 */
export const PRIMARY_MODEL = TEXT_MODELS[0];

/**
 * Model for the input relevance guardrail (lib/ai/guardrail.ts). It runs in
 * blocking mode before triage on every message, so it uses the fastest
 * stable model — a yes/no topical check does not need the primary model.
 */
export const GUARDRAIL_MODEL = TEXT_MODELS[1];

// ─── Gemini REST API helper with automatic fallback ─────────────────────────────

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiRequest {
  contents: Array<{
    parts: Array<
      { text: string } | { inline_data: { mime_type: string; data: string } }
    >;
  }>;
  generationConfig?: Record<string, unknown>;
}

export interface GeminiResponse {
  text: string;
  /** Which model ultimately succeeded */
  modelUsed: string;
}

/**
 * Calls the Gemini generateContent REST API, trying each model in the
 * provided chain until one succeeds. Returns the response text and the
 * model that was used.
 *
 * Throws if ALL models in the chain fail.
 */
export async function callGeminiWithFallback(
  apiKey: string,
  models: readonly string[],
  request: GeminiRequest,
): Promise<GeminiResponse> {
  const errors: string[] = [];

  for (const model of models) {
    try {
      const response = await fetch(
        `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        },
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => "unknown");
        errors.push(
          `${model}: HTTP ${response.status} — ${errText.slice(0, 200)}`,
        );
        continue; // Try next model
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      // Check if the API returned an error inside a 200 response
      if (data?.error) {
        errors.push(`${model}: API error — ${data.error.message ?? "unknown"}`);
        continue;
      }

      return { text, modelUsed: model };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${model}: ${msg}`);
      continue;
    }
  }

  // All models failed
  throw new Error(`All Gemini models failed:\n${errors.join("\n")}`);
}

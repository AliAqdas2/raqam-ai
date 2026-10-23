"use node";

// convex/ai.ts — Node.js Convex action for the AI pipeline.
//
// Runs in the Convex Node runtime ("use node") so the real `openai` client and
// the `@openai/agents` SDK work without shims. Node actions cannot touch
// `ctx.db` directly — all reads/writes go through `ctx.runQuery` / `ctx.runMutation`
// against the queries and mutations in `convex/assistant.ts`.

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { orchestrate } from "@/lib/ai/orchestrator";
import {
  callGeminiWithFallback,
  TRANSCRIBE_MODELS,
  VISION_MODELS,
} from "@/lib/ai/models";
import {
  transcribeAudioChain,
  transcribeWithAssemblyAI,
} from "@/lib/ai/transcription";
import {
  synthesizeSpeechChain,
  synthesizeWithAzure,
} from "@/lib/ai/tts";

/**
 * The main AI pipeline action. Called from the client hook.
 *
 * Flow:
 * 1. Save user message to Convex
 * 2. Fetch conversation history for context
 * 3. Run AI orchestrator (classify intent → build context → generate response)
 * 4. Save assistant response to Convex
 * 5. If action proposed, create pendingAction for confirmation gate
 * 6. Return the response to the client
 */
export const sendMessage = action({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    inputMode: v.optional(
      v.union(v.literal("text"), v.literal("voice"), v.literal("receipt")),
    ),
  },
  handler: async (ctx, args) => {
    // 1. Save user message
    await ctx.runMutation(api.assistant.saveUserMessage, {
      conversationId: args.conversationId,
      content: args.content,
      inputMode: args.inputMode,
    });

    // 2. Fetch conversation history (last 10 messages)
    const history = await ctx.runQuery(api.assistant.getConversationHistory, {
      conversationId: args.conversationId,
    });

    // 3. Get user's preferred language
    const preferredLanguage = await ctx.runQuery(
      api.assistant.getPreferredLanguage,
      {},
    );

    // 4. Run AI orchestrator
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiRef = api as any;
    const result = await orchestrate(
      {
        userMessage: args.content,
        preferredLanguage: preferredLanguage as "ur" | "en",
        conversationHistory: history,
      },
      ctx,
      apiRef,
    );

    // 5. Save assistant response
    await ctx.runMutation(api.assistant.saveAssistantMessage, {
      conversationId: args.conversationId,
      content: result.content,
      intentType: result.intentType,
    });

    // 6. If action proposed, create pendingAction for the confirmation gate
    if (result.pendingAction && result.pendingAction.userFacingMessage) {
      await ctx.runMutation(apiRef.pendingActions.createPendingAction, {
        conversationId: args.conversationId,
        actionType: result.pendingAction.actionType,
        parameters: result.pendingAction.parameters,
        userFacingMessage: result.pendingAction.userFacingMessage,
      });
    }

    return result;
  },
});

/**
 * Audio transcription — runs the provider fallback chain defined in
 * `lib/ai/transcription.ts`:  AssemblyAI (model "universal-2") → Gemini.
 * The browser's Web Speech API is the third fallback and lives client-side in
 * `hooks/useVoiceInput.ts`; it takes over when this returns `provider: null`.
 *
 * Returns `{ transcript, provider, error }`. `provider` is "assemblyai" |
 * "gemini" | null so the UI can show which engine produced the text.
 */
export const transcribeAudio = action({
  args: {
    audioBase64: v.string(),
    mimeType: v.string(),
  },
  handler: async (_ctx, args) => {
    const assemblyAiKey = process.env.ASSEMBLYAI_API_KEY;
    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!assemblyAiKey && !geminiKey) {
      return {
        transcript: "",
        provider: null,
        error:
          "No transcription provider configured. Set ASSEMBLYAI_API_KEY (preferred) or GOOGLE_GENERATIVE_AI_API_KEY in the Convex environment.",
      };
    }

    if (!assemblyAiKey) {
      console.warn(
        "[transcribeAudio] ASSEMBLYAI_API_KEY is not set in the Convex environment — " +
          "falling back to Gemini only. Set it with:  npx convex env set ASSEMBLYAI_API_KEY <key>",
      );
    }

    // Gemini rejects codec-qualified MIME types (e.g. "audio/webm;codecs=opus")
    // and WebM entirely. The client normally sends "audio/wav"; strip any
    // parameters as a safety net.
    const geminiMimeType = args.mimeType.split(";")[0].trim() || "audio/wav";

    const result = await transcribeAudioChain(
      { audioBase64: args.audioBase64, mimeType: args.mimeType },
      {
        transcribeAssemblyAI: assemblyAiKey
          ? (audio) =>
              transcribeWithAssemblyAI({ apiKey: assemblyAiKey, audio }).then(
                (r) => r.transcript,
              )
          : undefined,
        transcribeGemini: geminiKey
          ? async (audioBase64) => {
              const res = await callGeminiWithFallback(
                geminiKey,
                TRANSCRIBE_MODELS,
                {
                  contents: [
                    {
                      parts: [
                        {
                          text: `Transcribe the following audio recording to text. The speech may be in Urdu or English. Return ONLY the transcribed text, nothing else. If the audio is unclear or silent, return an empty string.`,
                        },
                        {
                          inline_data: {
                            mime_type: geminiMimeType,
                            data: audioBase64,
                          },
                        },
                      ],
                    },
                  ],
                },
              );
              return res.text.trim();
            }
          : undefined,
        onProviderError: (provider, err) =>
          console.error(`Audio transcription — ${provider} failed:`, err),
      },
    );

    return result;
  },
});

/**
 * Text-to-speech — the assistant's voice. Runs the provider chain in
 * `lib/ai/tts.ts` (Azure AI Speech neural voices). Returns base64 MP3, or
 * `provider: null` so `hooks/useTextToSpeech.ts` falls back to the browser's
 * speechSynthesis.
 *
 * Unlike transcription, this requires a signed-in caller: synthesis is billed
 * per character, so the endpoint must not be callable anonymously.
 */
export const synthesizeSpeech = action({
  args: {
    text: v.string(),
    preferredLanguage: v.union(v.literal("ur"), v.literal("en")),
    gender: v.optional(v.union(v.literal("female"), v.literal("male"))),
    rate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const apiKey = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;

    return await synthesizeSpeechChain(
      {
        text: args.text,
        preferredLanguage: args.preferredLanguage,
        gender: args.gender,
        rate: args.rate,
      },
      {
        synthesizeAzure:
          apiKey && region
            ? (ssml) => synthesizeWithAzure({ apiKey, region, ssml })
            : undefined,
        onProviderError: (provider, err) =>
          console.error(`Speech synthesis — ${provider} failed:`, err),
      },
    );
  },
});

/**
 * Receipt OCR action — uses Gemini vision to extract fields from a receipt image.
 * Falls back through the VISION_MODELS chain if the primary model fails.
 */
export const processReceipt = action({
  args: {
    imageBase64: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return {
        error:
          "GOOGLE_GENERATIVE_AI_API_KEY not set in Convex environment variables.",
        extracted: null,
      };
    }

    try {
      const result = await callGeminiWithFallback(apiKey, VISION_MODELS, {
        contents: [
          {
            parts: [
              {
                text: `Extract data from this receipt image. Return ONLY a JSON object (no markdown, no code fences) with these exact fields:
{
  "merchant": "store/merchant name",
  "amount": "total amount as a number string (e.g. 1500)",
  "date": "date in YYYY-MM-DD format",
  "description": "brief description of items/purchase",
  "categorySuggestion": "suggested category: food, transport, shopping, utilities, entertainment, health, education, or other"
}
If a field cannot be determined, use an empty string. The amount should be the total/grand total. Do NOT include any text outside the JSON object.`,
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: args.imageBase64,
                },
              },
            ],
          },
        ],
      });

      // Try to parse the JSON from the response
      let extracted: {
        merchant: string;
        amount: string;
        date: string;
        description: string;
        categorySuggestion: string;
      };

      try {
        const cleaned = result.text
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        extracted = JSON.parse(cleaned);
      } catch {
        console.warn("Failed to parse receipt OCR JSON:", result.text);
        return {
          error: "Could not parse receipt data. Please try a clearer image.",
          extracted: null,
        };
      }

      return {
        extracted: {
          merchant: extracted.merchant ?? "",
          amount: extracted.amount ?? "",
          date: extracted.date ?? "",
          description: extracted.description ?? "",
          categorySuggestion: extracted.categorySuggestion ?? "",
        },
        error: null,
      };
    } catch (err) {
      console.error("Receipt OCR error:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to process receipt image",
        extracted: null,
      };
    }
  },
});

// Live end-to-end check that spoken Urdu is transcribed in Urdu script, never
// Hindi (Devanagari). Real Urdu speech is produced with the app's own Azure
// voice, then sent through AssemblyAI exactly as the voice input does.
//
// Skipped unless AZURE_SPEECH_KEY, AZURE_SPEECH_REGION and ASSEMBLYAI_API_KEY
// are all set:
//   AZURE_SPEECH_KEY=… AZURE_SPEECH_REGION=… ASSEMBLYAI_API_KEY=… \
//     npx vitest run tests/live/urdu-script.live.test.ts

import { describe, it, expect } from "vitest";
import { AZURE_VOICES, buildSsml, synthesizeWithAzure } from "@/lib/ai/tts";
import {
  base64ToBytes,
  containsDevanagari,
  transcribeWithAssemblyAI,
} from "@/lib/ai/transcription";

const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION;
const ASSEMBLY_KEY = process.env.ASSEMBLYAI_API_KEY;

// Everyday sentences a user says on a call. Spoken Urdu and Hindi sound
// nearly identical here, which is exactly what used to trip detection.
const PHRASES = [
  "آج میں نے پانچ سو روپے پیٹرول پر خرچ کیے",
  "اس مہینے میرا کتنا خرچہ ہوا ہے",
  "کیا میں پندرہ ہزار کا فون خرید سکتا ہوں",
];

const ARABIC_SCRIPT = /[؀-ۿ]/;

describe.skipIf(!AZURE_KEY || !AZURE_REGION || !ASSEMBLY_KEY)(
  "Urdu speech → Urdu script — live",
  () => {
    it(
      "transcribes spoken Urdu in Urdu script, never Devanagari",
      async () => {
        for (const voice of Object.values(AZURE_VOICES.ur)) {
          for (const phrase of PHRASES) {
            const audio = base64ToBytes(
              await synthesizeWithAzure({
                apiKey: AZURE_KEY!,
                region: AZURE_REGION!,
                ssml: buildSsml(phrase, voice),
              }),
            );
            const { transcript, languageCode } = await transcribeWithAssemblyAI({
              apiKey: ASSEMBLY_KEY!,
              audio,
            });
            console.log(`[${voice.name}] ${languageCode}: ${transcript}`);
            expect(containsDevanagari(transcript)).toBe(false);
            expect(transcript).toMatch(ARABIC_SCRIPT);
          }
        }
      },
      10 * 60_000,
    );
  },
);

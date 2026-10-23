"use client";

// hooks/useVoiceInput.ts — Voice capture with a transcription fallback chain.
//
// Priority order (product decision, 2026-08-30):
//   1. AssemblyAI  — server-side, via the `ai.transcribeAudio` Convex action
//   2. Gemini      — server-side, same action (see lib/ai/transcription.ts)
//   3. Web Speech  — browser-native, runs live *in parallel* with recording so it
//                    also powers the interim transcript; its result is used only
//                    when the server path (AssemblyAI + Gemini) produces nothing.
//
// The primary path records a blob with MediaRecorder, decodes + re-encodes it to
// mono 16 kHz WAV (so every provider accepts it — Gemini rejects WebM), then
// sends it to the server. If MediaRecorder / getUserMedia is unavailable, the
// hook falls back to a Web-Speech-only capture path.

import * as React from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  containsDevanagari,
  type TranscriptProvider,
} from "@/lib/ai/transcription";
import {
  TARGET_SAMPLE_RATE,
  encodeWav,
  downsampleMono,
  mixToMono,
  arrayBufferToBase64,
} from "@/lib/audio/wav";

// ─── Web Speech API type declarations ──────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitAudioContext?: typeof AudioContext;
  }
}

// ─── Hook interface ────────────────────────────────────────────────────────────

/** Stable error identifiers — the UI maps these to localized strings. */
export type VoiceErrorCode =
  | "mic-denied"
  | "no-speech"
  | "transcribe-failed"
  | "not-supported"
  | "timeout";

export interface VoiceOutcome {
  transcript: string;
  provider: TranscriptProvider | null;
  error: VoiceErrorCode | null;
}

export interface UseVoiceInputReturn {
  /** Whether the microphone is actively recording / listening. */
  isListening: boolean;
  /** Whether the recording is being transcribed (after the user hits stop). */
  processing: boolean;
  /** Final transcribed text. */
  transcript: string;
  /** Live interim text while the user is still speaking (Web Speech). */
  interimTranscript: string;
  /** Which engine produced the final transcript. */
  provider: TranscriptProvider | null;
  /** Start (or restart) recording. */
  startListening: () => void;
  /** Stop recording and kick off transcription. */
  stopListening: () => void;
  /** Reset transcript, provider and error state. */
  reset: () => void;
  /**
   * Promise-based result waiter — reads from refs to avoid stale closures.
   * Resolves once transcription settles or a 30s safety timeout elapses.
   */
  waitForResult: () => Promise<VoiceOutcome>;
  /** Stable error code, or null. Map to text with the i18n dictionary. */
  error: VoiceErrorCode | null;
  /** Whether the browser can capture voice at all. */
  supported: boolean;
  /** Current microphone loudness, 0…1 (0 when not recording). */
  getInputLevel: () => number;
}

export interface VoiceInputOptions {
  /**
   * Stop recording automatically once the speaker goes quiet — used by the
   * hands-free voice call. Omit for push-to-talk (the chat composer).
   */
  autoStop?: {
    /** Silence after speech that ends the turn. */
    silenceMs: number;
    /** Give up if no speech starts within this long. */
    noSpeechMs: number;
    /** Hard cap on one recording. */
    maxMs: number;
  };
}

/**
 * Pure end-of-speech decision for the voice-activity detector, exported for
 * unit tests. Times are in ms since recording started.
 */
export function shouldAutoStop(
  state: { elapsed: number; heardSpeech: boolean; lastSpeechAt: number },
  cfg: NonNullable<VoiceInputOptions["autoStop"]>,
): boolean {
  if (state.elapsed >= cfg.maxMs) return true;
  if (!state.heardSpeech) return state.elapsed >= cfg.noSpeechMs;
  return state.elapsed - state.lastSpeechAt >= cfg.silenceMs;
}

/** RMS of a time-domain byte buffer (128 = silence), normalised to 0…1. */
export function rmsLevel(buf: Uint8Array): number {
  if (buf.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Failed to read audio recording"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Decode a recorded blob and re-encode it as mono 16 kHz WAV so every
 * transcription provider accepts it. Returns null if the browser cannot decode
 * the recording (the caller then falls back to sending the raw blob).
 */
async function blobToWavBase64(
  blob: Blob,
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    if (blob.size === 0) return null;
    const AudioCtx =
      (typeof window !== "undefined" && window.AudioContext) ||
      (typeof window !== "undefined" && window.webkitAudioContext) ||
      null;
    if (!AudioCtx) return null;

    const arrayBuffer = await blob.arrayBuffer();
    const ctx = new AudioCtx();
    try {
      // decodeAudioData detaches its input — hand it a copy.
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      const channels: Float32Array[] = [];
      for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
        channels.push(audioBuffer.getChannelData(c));
      }
      const mono = mixToMono(channels);
      if (mono.length === 0) return null;
      const down = downsampleMono(
        mono,
        audioBuffer.sampleRate,
        TARGET_SAMPLE_RATE,
      );
      const wav = encodeWav(down, TARGET_SAMPLE_RATE);
      return { base64: arrayBufferToBase64(wav), mimeType: "audio/wav" };
    } finally {
      void ctx.close();
    }
  } catch {
    return null;
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useVoiceInput(
  lang: string = "ur-PK",
  options: VoiceInputOptions = {},
): UseVoiceInputReturn {
  const autoStop = options.autoStop;
  const [isListening, setIsListening] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [provider, setProvider] = React.useState<TranscriptProvider | null>(
    null,
  );
  const [error, setError] = React.useState<VoiceErrorCode | null>(null);

  // Outcome refs — waitForResult() polls these to avoid stale closures.
  const settledRef = React.useRef(false);
  const outcomeRef = React.useRef<VoiceOutcome>({
    transcript: "",
    provider: null,
    error: null,
  });

  // Capture refs
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);
  const webSpeechFinalRef = React.useRef("");
  // true once the MediaRecorder path is running for this session
  const usingRecorderRef = React.useRef(false);
  // Level meter + voice-activity detection
  const meterCtxRef = React.useRef<AudioContext | null>(null);
  const meterAnalyserRef = React.useRef<AnalyserNode | null>(null);
  const meterBufRef = React.useRef<Uint8Array<ArrayBuffer> | null>(null);
  const vadTimerRef = React.useRef<number | null>(null);
  // With autoStop: did the VAD hear any speech this recording? If not, the
  // recording is discarded without a (billed) transcription call.
  const vadHeardSpeechRef = React.useRef<boolean | null>(null);
  const stopListeningRef = React.useRef<() => void>(() => {});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transcribeAudio = useAction((api as any).ai.transcribeAudio);
  const transcribeAudioRef = React.useRef(transcribeAudio);
  React.useEffect(() => {
    transcribeAudioRef.current = transcribeAudio;
  }, [transcribeAudio]);

  const speechSupported =
    typeof window !== "undefined" &&
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);
  const recorderSupported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined";
  const supported = speechSupported || recorderSupported;

  // ─── Settle ────────────────────────────────────────────────────────────────

  const settle = React.useCallback((outcome: VoiceOutcome) => {
    outcomeRef.current = outcome;
    settledRef.current = true;
    setTranscript(outcome.transcript);
    setProvider(outcome.provider);
    setError(outcome.error);
    setProcessing(false);
    setIsListening(false);
  }, []);

  const stopMeter = React.useCallback(() => {
    if (vadTimerRef.current !== null) {
      window.clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
    meterAnalyserRef.current = null;
    meterBufRef.current = null;
    void meterCtxRef.current?.close().catch(() => {});
    meterCtxRef.current = null;
  }, []);

  const stopStream = React.useCallback(() => {
    stopMeter();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, [stopMeter]);

  /** Attach a level meter to the mic stream; with autoStop, also run the VAD. */
  const startMeter = React.useCallback(
    (stream: MediaStream) => {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try {
        const ctx = new Ctx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(analyser);
        meterCtxRef.current = ctx;
        meterAnalyserRef.current = analyser;
        meterBufRef.current = new Uint8Array(analyser.fftSize);
      } catch {
        return;
      }
      if (!autoStop) return;

      // Adaptive threshold: estimate the room noise floor during the first
      // 300 ms, then treat anything clearly above it as speech.
      const startedAt = performance.now();
      let noiseFloor = 0.01;
      let calibrationFrames = 0;
      let heardSpeech = false;
      vadHeardSpeechRef.current = false;
      let lastSpeechAt = 0;
      vadTimerRef.current = window.setInterval(() => {
        const analyser = meterAnalyserRef.current;
        const buf = meterBufRef.current;
        if (!analyser || !buf) return;
        analyser.getByteTimeDomainData(buf);
        const level = rmsLevel(buf);
        const elapsed = performance.now() - startedAt;

        if (elapsed < 300) {
          calibrationFrames++;
          noiseFloor += (level - noiseFloor) / calibrationFrames;
          return;
        }
        if (level > Math.max(0.03, noiseFloor * 2.5)) {
          heardSpeech = true;
          vadHeardSpeechRef.current = true;
          lastSpeechAt = elapsed;
        }
        if (shouldAutoStop({ elapsed, heardSpeech, lastSpeechAt }, autoStop)) {
          stopListeningRef.current();
        }
      }, 80);
    },
    [autoStop],
  );

  // ─── Transcribe the recorded blob (server chain, Web Speech fallback) ───────

  const finalizeFromRecorder = React.useCallback(
    async (recorderMime: string) => {
      stopStream();
      const blob = new Blob(audioChunksRef.current, {
        type: recorderMime || "audio/webm",
      });
      audioChunksRef.current = [];

      const webSpeechText = webSpeechFinalRef.current.trim();
      const vadHeardSpeech = vadHeardSpeechRef.current;
      vadHeardSpeechRef.current = null;

      const fallBackToWebSpeech = (): boolean => {
        if (webSpeechText) {
          settle({
            transcript: webSpeechText,
            provider: "browser",
            error: null,
          });
          return true;
        }
        return false;
      };

      if (blob.size === 0 || (vadHeardSpeech === false && !webSpeechText)) {
        if (!fallBackToWebSpeech()) {
          settle({ transcript: "", provider: null, error: "no-speech" });
        }
        return;
      }

      try {
        const wav = await blobToWavBase64(blob);
        const base64 = wav ? wav.base64 : await blobToBase64(blob);
        const mimeType = wav ? wav.mimeType : blob.type || "audio/webm";

        const res = (await transcribeAudioRef.current({
          audioBase64: base64,
          mimeType,
        })) as
          | { transcript?: string; provider?: string; error?: string }
          | undefined;

        const serverText = (res?.transcript ?? "").trim();
        if (serverText && !containsDevanagari(serverText)) {
          settle({
            transcript: serverText,
            provider: (res?.provider as TranscriptProvider) ?? "assemblyai",
            error: null,
          });
          return;
        }

        if (res?.error) {
          console.warn("[voice] server transcription failed:", res.error);
        }
        if (fallBackToWebSpeech()) return;
        settle({ transcript: "", provider: null, error: "transcribe-failed" });
      } catch (err) {
        console.warn("[voice] transcription action threw:", err);
        if (fallBackToWebSpeech()) return;
        settle({ transcript: "", provider: null, error: "transcribe-failed" });
      }
    },
    [settle, stopStream],
  );

  const finalizeRef = React.useRef(finalizeFromRecorder);
  React.useEffect(() => {
    finalizeRef.current = finalizeFromRecorder;
  }, [finalizeFromRecorder]);

  // ─── Web Speech recognition (parallel / tertiary) ──────────────────────────

  React.useEffect(() => {
    if (!speechSupported) return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition!;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      // Never surface Hindi script: if the browser heard Urdu as Hindi, that
      // text is dropped and the server transcript is used instead.
      if (final && !containsDevanagari(final)) webSpeechFinalRef.current += final;
      setInterimTranscript(containsDevanagari(interim) ? "" : interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        if (!usingRecorderRef.current && !settledRef.current) {
          settle({ transcript: "", provider: null, error: "mic-denied" });
        } else {
          setError("mic-denied");
        }
      }
      // network / no-speech / service-not-allowed / aborted are non-fatal here —
      // the server path is primary and handles the final outcome.
    };

    recognition.onend = () => {
      setInterimTranscript("");
      // Web-Speech-only path: recognition end is the final outcome.
      if (!usingRecorderRef.current && !settledRef.current) {
        const text = webSpeechFinalRef.current.trim();
        settle(
          text
            ? { transcript: text, provider: "browser", error: null }
            : { transcript: "", provider: null, error: "no-speech" },
        );
      }
    };

    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [speechSupported, lang, settle]);

  // ─── Controls ──────────────────────────────────────────────────────────────

  const resetInternal = React.useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setProvider(null);
    setError(null);
    setProcessing(false);
    webSpeechFinalRef.current = "";
    settledRef.current = false;
    outcomeRef.current = { transcript: "", provider: null, error: null };
  }, []);

  const startListening = React.useCallback(async () => {
    resetInternal();
    usingRecorderRef.current = false;
    audioChunksRef.current = [];
    setIsListening(true);

    // Start Web Speech in parallel — live interim text + tertiary fallback.
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {
        // Already running — ignore.
      }
    }

    // Primary path: record a blob for server-side transcription.
    if (recorderSupported) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        usingRecorderRef.current = true;

        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          void finalizeRef.current(recorder.mimeType);
        };
        recorder.onerror = () => {
          usingRecorderRef.current = false;
          stopStream();
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        startMeter(stream);
        return;
      } catch (err) {
        usingRecorderRef.current = false;
        const name = (err as Error | undefined)?.name;
        if (name === "NotAllowedError" || name === "SecurityError") {
          try {
            recognitionRef.current?.abort();
          } catch {
            // ignore
          }
          // Settle so waitForResult() resolves now instead of after 30 s.
          settle({ transcript: "", provider: null, error: "mic-denied" });
          return;
        }
        // Otherwise fall through to the Web-Speech-only path.
      }
    }

    if (!recognitionRef.current) {
      settle({ transcript: "", provider: null, error: "not-supported" });
    }
  }, [resetInternal, recorderSupported, stopStream, startMeter, settle]);

  const stopListening = React.useCallback(() => {
    // Stop the VAD first so it cannot fire stop twice.
    if (vadTimerRef.current !== null) {
      window.clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
    setProcessing(true);
    setIsListening(false);

    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop(); // → onstop → finalizeFromRecorder
      mediaRecorderRef.current = null;
      return;
    }

    // Web-Speech-only path — settle now if recognition already produced text,
    // otherwise recognition.onend will settle.
    if (!usingRecorderRef.current && !settledRef.current) {
      const text = webSpeechFinalRef.current.trim();
      if (text) {
        settle({ transcript: text, provider: "browser", error: null });
      }
    }
  }, [settle]);

  React.useEffect(() => {
    stopListeningRef.current = stopListening;
  }, [stopListening]);

  const reset = React.useCallback(() => {
    resetInternal();
  }, [resetInternal]);

  const getInputLevel = React.useCallback((): number => {
    const analyser = meterAnalyserRef.current;
    const buf = meterBufRef.current;
    if (!analyser || !buf) return 0;
    analyser.getByteTimeDomainData(buf);
    return Math.min(1, rmsLevel(buf) * 4);
  }, []);

  const waitForResult = React.useCallback((): Promise<VoiceOutcome> => {
    return new Promise((resolve) => {
      let elapsed = 0;
      const check = () => {
        elapsed += 200;
        if (settledRef.current) {
          resolve(outcomeRef.current);
          return;
        }
        if (elapsed > 30000) {
          const text = webSpeechFinalRef.current.trim();
          resolve(
            text
              ? { transcript: text, provider: "browser", error: null }
              : { transcript: "", provider: null, error: "timeout" },
          );
          return;
        }
        setTimeout(check, 200);
      };
      check();
    });
  }, []);

  // Cleanup on unmount.
  React.useEffect(() => {
    return () => {
      if (vadTimerRef.current !== null) window.clearInterval(vadTimerRef.current);
      void meterCtxRef.current?.close().catch(() => {});
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  return {
    isListening,
    processing,
    transcript,
    interimTranscript,
    provider,
    startListening,
    stopListening,
    reset,
    waitForResult,
    error,
    supported,
    getInputLevel,
  };
}

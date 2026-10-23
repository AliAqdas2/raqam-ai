"use client";

// hooks/useTextToSpeech.ts — Speak assistant replies aloud.
//
// Fallback chain (see lib/ai/tts.ts):
//   1. Azure neural voices via the `ai.synthesizeSpeech` Convex action (MP3)
//   2. The browser's speechSynthesis, when the server returns provider: null
//
// One reusable <audio> element is "unlocked" on the first user gesture
// (`unlock()`), so replies can play later without a fresh tap — needed on
// iOS Safari for the voice-call loop. An AnalyserNode on that element exposes
// the live output level for the call orb.

import * as React from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  BROWSER_LOCALES,
  detectSpeechLanguage,
  prepareTextForSpeech,
  type SpeechLanguage,
  type TtsProvider,
} from "@/lib/ai/tts";
import { useVoicePrefs } from "@/hooks/useVoicePrefs";
import { encodeWav } from "@/lib/audio/wav";

export type SpeechStatus = "idle" | "loading" | "speaking";

export interface SpeakOptions {
  /** Identifies what is being spoken (e.g. a message id) for UI state. */
  id?: string;
  /** Language to assume when the text has no letters to detect from. */
  preferredLanguage?: SpeechLanguage;
}

export interface UseTextToSpeechReturn {
  status: SpeechStatus;
  /** The `id` passed to the current speak() call, if any. */
  activeId: string | null;
  provider: TtsProvider | null;
  /**
   * Speak text. Resolves when playback finishes, is stopped, or fails —
   * never rejects, so callers can `await` it in a conversation loop.
   */
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  stop: () => void;
  /** Call from a click/tap handler before the first automatic playback. */
  unlock: () => void;
  /** Current output loudness, 0…1 (for visualisers). */
  getLevel: () => number;
}

// 0.1 s of silence — played once inside a user gesture to unlock autoplay.
let silentUrl: string | null = null;
function silentAudioUrl(): string {
  if (!silentUrl) {
    const wav = encodeWav(new Float32Array(1600), 16000);
    silentUrl = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
  }
  return silentUrl;
}

function base64ToBlobUrl(base64: string, mimeType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

function pickBrowserVoice(lang: SpeechLanguage): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const locale = BROWSER_LOCALES[lang].toLowerCase();
  const prefix = locale.split("-")[0];
  return (
    voices.find((v) => v.lang.toLowerCase() === locale) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ??
    // Hindi voices read Urdu-script text poorly but Roman/English well; for
    // Urdu prefer any Urdu voice, else let the browser choose.
    null
  );
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const { prefs } = useVoicePrefs();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const synthesize = useAction((api as any).ai.synthesizeSpeech);

  const [status, setStatus] = React.useState<SpeechStatus>("idle");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [provider, setProvider] = React.useState<TtsProvider | null>(null);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const levelBufRef = React.useRef<Uint8Array<ArrayBuffer> | null>(null);
  const browserSpeakingRef = React.useRef(false);
  // Monotonic token: a newer speak()/stop() invalidates older in-flight calls.
  const tokenRef = React.useRef(0);
  const finishRef = React.useRef<(() => void) | null>(null);
  // Cache synthesized audio per (text, voice) so replays are instant.
  const cacheRef = React.useRef(new Map<string, string>());

  const getAudio = React.useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = "auto";
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  const ensureAnalyser = React.useCallback(() => {
    if (analyserRef.current || typeof window === "undefined") return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(getAudio());
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      levelBufRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      // Visualiser is optional — playback still works without it.
    }
  }, [getAudio]);

  const unlock = React.useCallback(() => {
    const el = getAudio();
    ensureAnalyser();
    void audioCtxRef.current?.resume().catch(() => {});
    el.src = silentAudioUrl();
    void el.play().catch(() => {});
    // Warm up the browser voice list (Chrome loads it lazily).
    window.speechSynthesis?.getVoices();
  }, [getAudio, ensureAnalyser]);

  const finish = React.useCallback(() => {
    browserSpeakingRef.current = false;
    setStatus("idle");
    setActiveId(null);
    const done = finishRef.current;
    finishRef.current = null;
    done?.();
  }, []);

  const stop = React.useCallback(() => {
    tokenRef.current++;
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
    if (browserSpeakingRef.current) window.speechSynthesis?.cancel();
    finish();
  }, [finish]);

  const speakWithBrowser = React.useCallback(
    (text: string, lang: SpeechLanguage, token: number): Promise<void> =>
      new Promise((resolve) => {
        const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
        const spoken = prepareTextForSpeech(text, lang);
        if (!synth || !spoken) return resolve();
        const utter = new SpeechSynthesisUtterance(spoken);
        utter.lang = BROWSER_LOCALES[lang];
        const voice = pickBrowserVoice(lang);
        if (voice) utter.voice = voice;
        utter.rate = 1 + prefs.rate / 100;
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        if (token !== tokenRef.current) return resolve();
        browserSpeakingRef.current = true;
        setProvider("browser");
        setStatus("speaking");
        synth.cancel();
        synth.speak(utter);
      }),
    [prefs.rate],
  );

  const speak = React.useCallback(
    async (text: string, options: SpeakOptions = {}): Promise<void> => {
      stop();
      const token = ++tokenRef.current;
      const preferredLanguage = options.preferredLanguage ?? "ur";
      const lang = detectSpeechLanguage(text, preferredLanguage);

      return new Promise<void>((resolve) => {
        finishRef.current = resolve;
        setActiveId(options.id ?? null);
        setStatus("loading");

        void (async () => {
          const cacheKey = `${prefs.gender}|${prefs.rate}|${text}`;
          let url = cacheRef.current.get(cacheKey) ?? null;

          if (!url) {
            try {
              const res = (await synthesize({
                text,
                preferredLanguage,
                gender: prefs.gender,
                rate: prefs.rate,
              })) as { audioBase64: string; mimeType: string; provider: string | null };
              if (res?.provider && res.audioBase64) {
                url = base64ToBlobUrl(res.audioBase64, res.mimeType || "audio/mpeg");
                cacheRef.current.set(cacheKey, url);
              }
            } catch (err) {
              console.warn("[tts] server synthesis failed:", err);
            }
          }
          if (token !== tokenRef.current) return; // superseded or stopped

          if (url) {
            const el = getAudio();
            ensureAnalyser();
            void audioCtxRef.current?.resume().catch(() => {});
            el.onended = () => token === tokenRef.current && finish();
            el.onerror = () => token === tokenRef.current && finish();
            el.src = url;
            setProvider("azure");
            setStatus("speaking");
            try {
              await el.play();
              return;
            } catch (err) {
              // Autoplay blocked or decode failure — use the browser voice.
              console.warn("[tts] audio playback failed:", err);
            }
          }

          await speakWithBrowser(text, lang, token);
          if (token === tokenRef.current) finish();
        })();
      });
    },
    [stop, synthesize, prefs.gender, prefs.rate, getAudio, ensureAnalyser, finish, speakWithBrowser],
  );

  const getLevel = React.useCallback((): number => {
    if (browserSpeakingRef.current) {
      // speechSynthesis exposes no audio stream — synthesise a gentle pulse.
      return 0.35 + 0.25 * Math.abs(Math.sin(performance.now() / 180));
    }
    const analyser = analyserRef.current;
    const buf = levelBufRef.current;
    if (!analyser || !buf || audioRef.current?.paused) return 0;
    analyser.getByteFrequencyData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i];
    return Math.min(1, sum / buf.length / 110);
  }, []);

  React.useEffect(() => {
    const cache = cacheRef.current;
    const token = tokenRef;
    const audio = audioRef;
    const audioCtx = audioCtxRef;
    const analyser = analyserRef;
    return () => {
      token.current++;
      audio.current?.pause();
      if (browserSpeakingRef.current) window.speechSynthesis?.cancel();
      void audioCtx.current?.close().catch(() => {});
      // Reset everything: an element routed into a closed AudioContext stays
      // silent, so a remount (e.g. StrictMode) must build a fresh pair.
      audio.current = null;
      audioCtx.current = null;
      analyser.current = null;
      levelBufRef.current = null;
      cache.forEach((u) => URL.revokeObjectURL(u));
      cache.clear();
    };
  }, []);

  return { status, activeId, provider, speak, stop, unlock, getLevel };
}

"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Pause, Volume2 } from "lucide-react";
import { VoiceOrb, type OrbMode } from "@/components/assistant/VoiceOrb";
import { cn } from "@/lib/utils";

type Lang = "ur" | "en";
type Phase = "listening" | "thinking" | "speaking" | "rest";

interface Exchange {
  user: string;
  reply: string;
  /** Shows the confirmation chips under the reply (write action). */
  confirm?: boolean;
  /** Shows the "outside my scope" tag (input guardrail). */
  offTopic?: boolean;
}

const SCRIPT: Record<Lang, Exchange[]> = {
  ur: [
    {
      user: "اس مہینے کھانے پر کتنا خرچ ہوا؟",
      reply: "آپ کے لین دین کے مطابق Rs. 15,800، یعنی آپ کے کھانے کے بجٹ کا 88٪۔",
    },
    {
      user: "500 روپے کا پیٹرول شامل کرو",
      reply: "Rs. 500 کا پیٹرول، نقل و حمل میں۔ اسکرین پر تصدیق کر دیں۔",
      confirm: true,
    },
    {
      user: "کل کا کرکٹ میچ کس نے جیتا؟",
      reply: "یہ میرے دائرے سے باہر ہے۔ میں صرف آپ کے پیسوں کی بات کرتا ہوں۔",
      offTopic: true,
    },
  ],
  en: [
    {
      user: "How much did I spend on food this month?",
      reply: "Based on your transactions, Rs. 15,800: that's 88% of your food budget.",
    },
    {
      user: "Add Rs. 500 for petrol",
      reply: "Rs. 500 for petrol, under transport. Confirm it on screen.",
      confirm: true,
    },
    {
      user: "Who won yesterday's cricket match?",
      reply: "That's outside what I do. I only talk about your money.",
      offTopic: true,
    },
  ],
};

const LABELS = {
  ur: {
    listening: "سن رہا ہوں",
    thinking: "سوچ رہا ہوں",
    speaking: "بول رہا ہوں",
    rest: "رقم تیار ہے",
    hear: "رقم کی آواز سنیں",
    stop: "روکیں",
    confirm: "تصدیق کریں",
    cancel: "منسوخ",
    offTopic: "دائرے سے باہر",
    you: "آپ",
  },
  en: {
    listening: "Listening",
    thinking: "Thinking",
    speaking: "Speaking",
    rest: "Raqam is ready",
    hear: "Hear Raqam speak",
    stop: "Stop",
    confirm: "Confirm",
    cancel: "Cancel",
    offTopic: "Outside my scope",
    you: "You",
  },
} as const;

const AUDIO_SRC: Record<Lang, string> = {
  ur: "/audio/raqam-sample-ur.mp3",
  en: "/audio/raqam-sample-en.mp3",
};

function words(text: string) {
  return text.split(/\s+/);
}

/**
 * The hero's "call": a scripted, looping voice conversation around the gold
 * orb, plus a real recorded Raqam voice (Azure neural TTS) on demand. Remount
 * with `key={lang}` so a language switch restarts cleanly.
 */
export function HeroCallDemo({ lang }: { lang: Lang }) {
  const L = LABELS[lang];
  const script = SCRIPT[lang];
  const reduceMotion = useReducedMotion();

  const [idx, setIdx] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>(reduceMotion ? "rest" : "listening");
  const [userWords, setUserWords] = React.useState(reduceMotion ? 99 : 0);
  const [replyWords, setReplyWords] = React.useState(reduceMotion ? 99 : 0);
  const [playing, setPlaying] = React.useState(false);

  const phaseRef = React.useRef(phase);
  React.useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const bufRef = React.useRef<Uint8Array<ArrayBuffer> | null>(null);
  const ctxRef = React.useRef<AudioContext | null>(null);

  // ── Scripted loop (paused while the real voice plays) ──
  React.useEffect(() => {
    if (reduceMotion || playing) return;
    let cancelled = false;
    const timers: number[] = [];
    const wait = (ms: number) =>
      new Promise<void>((r) => timers.push(window.setTimeout(r, ms)));

    (async () => {
      let i = idx;
      while (!cancelled) {
        const ex = script[i];
        setIdx(i);
        setUserWords(0);
        setReplyWords(0);
        setPhase("listening");
        await wait(500);
        for (let w = 1; w <= words(ex.user).length && !cancelled; w++) {
          setUserWords(w);
          await wait(170);
        }
        if (cancelled) return;
        await wait(450);
        setPhase("thinking");
        await wait(1000);
        if (cancelled) return;
        setPhase("speaking");
        for (let w = 1; w <= words(ex.reply).length && !cancelled; w++) {
          setReplyWords(w);
          await wait(140);
        }
        if (cancelled) return;
        await wait(600);
        setPhase("rest");
        await wait(2600);
        i = (i + 1) % script.length;
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
    // `idx` is read once to resume where the real-voice playback left off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, playing, script]);

  // ── Real voice ──
  const stopAudio = React.useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const playAudio = React.useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio(AUDIO_SRC[lang]);
      el.preload = "auto";
      audioRef.current = el;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        try {
          const ctx = new Ctx();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          ctx.createMediaElementSource(el).connect(analyser);
          analyser.connect(ctx.destination);
          ctxRef.current = ctx;
          analyserRef.current = analyser;
          bufRef.current = new Uint8Array(analyser.frequencyBinCount);
        } catch {
          // Visualiser optional.
        }
      }
      el.onended = () => setPlaying(false);
    }
    void ctxRef.current?.resume();
    const el = audioRef.current;
    el.currentTime = 0;
    // Show the exchange the recording answers.
    setIdx(0);
    setUserWords(99);
    setReplyWords(99);
    setPhase("speaking");
    setPlaying(true);
    void el.play().catch(() => setPlaying(false));
  }, [lang]);

  React.useEffect(
    () => () => {
      audioRef.current?.pause();
      void ctxRef.current?.close().catch(() => {});
    },
    [],
  );

  const getLevel = React.useCallback(() => {
    const analyser = analyserRef.current;
    const buf = bufRef.current;
    if (audioRef.current && !audioRef.current.paused && analyser && buf) {
      analyser.getByteFrequencyData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i];
      return Math.min(1, sum / buf.length / 100);
    }
    const p = phaseRef.current;
    if (p !== "listening" && p !== "speaking") return 0;
    // Speech-like envelope: syllable flutter riding on a slower phrase swell.
    const t = performance.now();
    const syllable = Math.abs(Math.sin(t / 95)) * Math.abs(Math.sin(t / 230));
    const phrase = 0.55 + 0.45 * Math.sin(t / 900);
    return (p === "speaking" ? 0.75 : 0.5) * syllable * phrase;
  }, []);

  const ex = script[idx];
  const orbMode: OrbMode =
    phase === "rest" ? "idle" : phase === "thinking" ? "thinking" : phase;
  const userText = words(ex.user).slice(0, userWords).join(" ");
  const replyText = words(ex.reply).slice(0, replyWords).join(" ");
  const replyDone = replyWords >= words(ex.reply).length;
  const isLatin = lang === "en";

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <VoiceOrb mode={orbMode} getLevel={getLevel} size={128} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={playing ? "playing" : phase}
          className="-mt-3 text-[18px] font-bold text-white"
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
        >
          {L[playing ? "speaking" : phase]}
        </motion.span>
      </AnimatePresence>

      {/* Captions */}
      <div
        className="flex min-h-[176px] w-full flex-col gap-2.5"
        aria-live="off"
        dir={isLatin ? "ltr" : "rtl"}
      >
        {userText ? (
          <div className="flex flex-col items-start gap-1">
            <span className="text-[11.5px] text-[#8FB49E]">{L.you}</span>
            <p
              className={cn(
                "max-w-[92%] rounded-[14px] rounded-ss-[4px] bg-white/[0.08] px-3.5 py-2 text-[14.5px] text-[#DCE7DF]",
                isLatin ? "leading-[1.6]" : "font-reading leading-[2.1]",
              )}
            >
              {userText}
            </p>
          </div>
        ) : null}

        {replyText ? (
          <div className="flex flex-col items-end gap-1.5">
            {ex.offTopic ? (
              <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11.5px] text-[#B9CFC1]">
                {L.offTopic}
              </span>
            ) : null}
            <p
              className={cn(
                "max-w-[92%] rounded-[14px] rounded-se-[4px] bg-[#E8B931] px-3.5 py-2 text-[14.5px] font-medium text-[#0B3B26]",
                isLatin ? "leading-[1.6]" : "font-reading leading-[2.1]",
              )}
            >
              {replyText}
            </p>
            {ex.confirm && replyDone ? (
              <motion.div
                className="flex gap-2"
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="rounded-[10px] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#0F5132]">
                  {L.confirm}
                </span>
                <span className="rounded-[10px] border border-white/20 px-3 py-1.5 text-[12.5px] text-[#DCE7DF]">
                  {L.cancel}
                </span>
              </motion.div>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={playing ? stopAudio : playAudio}
        aria-pressed={playing}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E8B931]/50 px-5 text-[14px] font-medium text-[#F6D46A] transition-colors hover:bg-[#E8B931]/10"
      >
        {playing ? (
          <Pause className="h-4 w-4" aria-hidden />
        ) : (
          <Volume2 className="h-4 w-4" aria-hidden />
        )}
        {playing ? L.stop : L.hear}
      </button>
    </div>
  );
}

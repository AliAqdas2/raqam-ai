"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Mic, Square } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

const BAR_COUNT = 44;

// Deterministic pseudo-random bar heights (%), so SSR and CSR match.
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) =>
  Math.round(26 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 64),
);

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface VoiceRecorderProps {
  mode: "recording" | "processing";
  interimText: string;
  onStop: () => void;
}

/**
 * Replaces the composer while a recording is in progress or being transcribed.
 * Never rendered alongside the composer — no stacked input boxes. Mounts fresh
 * per recording, so the elapsed-time counter resets on its own.
 */
export function VoiceRecorder({ mode, interimText, onStop }: VoiceRecorderProps) {
  const { t } = useLanguage();
  const recording = mode === "recording";

  const [seconds, setSeconds] = React.useState(0);
  React.useEffect(() => {
    if (mode !== "recording") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [mode]);

  return (
    <motion.div
      className="border-t border-border bg-card px-6 py-5 sm:px-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
        <div className="relative grid h-14 w-14 place-items-center">
          {recording && (
            <span className="absolute inset-0 animate-[rq-glow_1.6s_ease-in-out_infinite] rounded-full bg-primary/15" />
          )}
          <span className="relative grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
            {recording ? (
              <Mic className="h-5 w-5" />
            ) : (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            )}
          </span>
        </div>

        <span className="font-[var(--font-manrope)] text-[13px] tabular-nums text-muted-foreground">
          {formatClock(seconds)}
        </span>

        <div className="flex h-8 items-center justify-center gap-[3px]">
          {BAR_HEIGHTS.map((h, i) => (
            <span
              key={i}
              className={cn(
                "w-[3px] origin-center rounded-full bg-primary/40",
                recording && "animate-[rq-pulse_1s_ease-in-out_infinite]",
              )}
              style={{
                height: recording ? `${h}%` : "18%",
                animationDelay: `${(i % 12) * 0.06}s`,
              }}
            />
          ))}
        </div>

        <p className="min-h-[1.25rem] max-w-md truncate text-center text-[13.5px] text-muted-foreground">
          {recording
            ? interimText || t("voice.recording")
            : t("voice.transcribing")}
        </p>

        {recording && (
          <button
            type="button"
            onClick={onStop}
            className="mt-1 inline-flex min-h-12 items-center gap-2 rounded-[12px] bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-[#14231B]"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            {t("voice.stop")}
          </button>
        )}
      </div>
    </motion.div>
  );
}

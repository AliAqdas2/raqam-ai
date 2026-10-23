"use client";

import { Square, Volume2 } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import type { SpeechStatus } from "@/hooks/useTextToSpeech";

/** "Listen" control under an assistant reply. */
export function SpeakButton({
  status,
  onToggle,
  className,
}: {
  /** Status of THIS message's playback (idle if another message is playing). */
  status: SpeechStatus;
  onToggle: () => void;
  className?: string;
}) {
  const { t } = useLanguage();
  const active = status !== "idle";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={active ? t("tts.stop") : t("tts.listen")}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-primary",
        className,
      )}
    >
      {status === "loading" ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : status === "speaking" ? (
        <Square className="h-3 w-3 fill-current" aria-hidden />
      ) : (
        <Volume2 className="h-4 w-4" aria-hidden />
      )}
      <span>
        {status === "loading"
          ? t("tts.loading")
          : status === "speaking"
            ? t("tts.stop")
            : t("tts.listen")}
      </span>
      {status === "speaking" ? (
        <span className="flex h-3 items-end gap-[2px]" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[2px] origin-bottom animate-[rq-pulse_0.9s_ease-in-out_infinite] rounded-full bg-current"
              style={{ height: "100%", animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
      ) : null}
    </button>
  );
}

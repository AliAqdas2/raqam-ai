"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";
import { MarkdownMessage } from "@/components/assistant/MarkdownMessage";
import { AssistantAvatar } from "@/components/assistant/AssistantAvatar";
import { SpeakButton } from "@/components/assistant/SpeakButton";
import type { SpeechStatus } from "@/hooks/useTextToSpeech";
import { cn, isLatinScript } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n/ur";
import type { ChatMessage as ChatMessageType } from "@/hooks/useAssistant";

const INTENT_STYLES: Record<
  NonNullable<ChatMessageType["intentType"]>,
  { bg: string; text: string; key: TranslationKey }
> = {
  educate: { bg: "#EDF1FA", text: "#31518F", key: "assistant.intentEducate" },
  analyze: { bg: "#E6EFE9", text: "#0F5132", key: "assistant.intentAnalyze" },
  recommend: { bg: "#FDF3D8", text: "#6B5B2E", key: "assistant.intentRecommend" },
  act: { bg: "#FDF3D8", text: "#6B5B2E", key: "assistant.intentAct" },
  offTopic: { bg: "#F1EEE4", text: "#4C5A52", key: "assistant.intentOffTopic" },
};

export function ChatMessage({
  message,
  speech,
}: {
  message: ChatMessageType;
  /** Read-aloud control for assistant replies. */
  speech?: { status: SpeechStatus; onToggle: () => void };
}) {
  const { t } = useLanguage();
  const latin = isLatinScript(message.content);

  // ── User bubble (right side under RTL) ──
  if (message.role === "user") {
    return (
      <motion.div
        className="flex max-w-[82%] flex-col self-start sm:max-w-[68%]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        dir={latin ? "ltr" : "rtl"}
      >
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-[16px_16px_16px_4px] bg-primary px-[18px] py-3 text-[15.5px] text-primary-foreground",
            latin ? "leading-[1.7]" : "leading-[2]",
          )}
        >
          {message.inputMode === "voice" && (
            <span className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[12px]">
              {t("assistant.voiceLabel")}
            </span>
          )}
          <span className="whitespace-pre-wrap break-words">
            {message.content}
          </span>
        </div>
      </motion.div>
    );
  }

  // ── Assistant bubble (left side under RTL) ──
  const intent = message.intentType
    ? INTENT_STYLES[message.intentType]
    : null;

  return (
    <motion.div
      className="flex max-w-[88%] items-start gap-2 self-end sm:max-w-[80%]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* DOM order: bubble then avatar → under RTL the avatar sits on the outer
          (left) edge, the bubble to its right. */}
      <div className="flex min-w-0 flex-col gap-1.5">
        {intent && (
          <span
            className="w-fit rounded-full px-2.5 py-1 font-[var(--font-manrope)] text-[10px] tracking-[.14em]"
            style={{ background: intent.bg, color: intent.text }}
          >
            {t(intent.key)}
          </span>
        )}
        <div
          className={cn(
            "rounded-[16px_16px_4px_16px] border border-border bg-card px-5 py-4 text-[15.5px]",
            latin ? "leading-[1.7]" : "font-reading",
          )}
          dir={latin ? "ltr" : "rtl"}
        >
          <MarkdownMessage content={message.content} />
        </div>
        {speech ? (
          <SpeakButton
            status={speech.status}
            onToggle={speech.onToggle}
            className="-ms-1 self-start"
          />
        ) : null}
      </div>
      <AssistantAvatar className="mt-1.5" />
    </motion.div>
  );
}

"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mic, Receipt, Send, MoreHorizontal, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";
import { cn } from "@/lib/utils";
import type { TranscriptProvider } from "@/lib/ai/transcription";
import type { TranslationKey } from "@/lib/i18n/ur";

const ROTATING_PLACEHOLDERS: TranslationKey[] = [
  "assistant.placeholderRotate1",
  "assistant.placeholderRotate2",
  "assistant.placeholderRotate3",
  "assistant.placeholderRotate4",
];

const PLACEHOLDER_INTERVAL_MS = 4500;

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onMic: () => void;
  onReceipt: () => void;
  onClearVoiceDraft: () => void;
  sending: boolean;
  voiceSupported: boolean;
  voiceBusy: boolean;
  /** Non-null when the current text is an unsent voice transcript. */
  voiceProvider: TranscriptProvider | null;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onMic,
  onReceipt,
  onClearVoiceDraft,
  sending,
  voiceSupported,
  voiceBusy,
  voiceProvider,
}: ChatComposerProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [phIndex, setPhIndex] = React.useState(0);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 200,
  });

  React.useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Rotating placeholders — pause while focused or typing
  React.useEffect(() => {
    if (reduceMotion || focused || value.trim().length > 0) return;
    const id = window.setInterval(() => {
      setPhIndex((i) => (i + 1) % ROTATING_PLACEHOLDERS.length);
    }, PLACEHOLDER_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, focused, value]);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const canSend = value.trim().length > 0 && !sending;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  const providerLabel =
    voiceProvider === "assemblyai"
      ? t("voice.byAssemblyai")
      : voiceProvider === "gemini"
        ? t("voice.byGemini")
        : voiceProvider === "browser"
          ? t("voice.byBrowser")
          : null;

  const placeholderKey =
    ROTATING_PLACEHOLDERS[phIndex] ?? "assistant.placeholder";
  const placeholder = reduceMotion
    ? t("assistant.placeholder")
    : t(placeholderKey);

  return (
    <div className="border-t border-border bg-card px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-8">
      <div
        className={cn(
          "mx-auto flex max-w-3xl flex-col gap-2 rounded-[18px] border bg-input px-3 pb-2.5 pt-3 transition-colors",
          focused ? "border-primary/40" : "border-input",
        )}
      >
        {voiceProvider ? (
          <div className="flex flex-wrap items-center gap-2 rounded-[12px] bg-accent px-3 py-2 text-[13px] text-accent-foreground">
            <Mic className="h-4 w-4 shrink-0" aria-hidden />
            <span className="font-medium">{t("voice.reviewTitle")}</span>
            <span className="text-muted-foreground">
              {t("voice.reviewHint")}
            </span>
            {providerLabel ? (
              <span className="text-muted-foreground">· {providerLabel}</span>
            ) : null}
            <button
              type="button"
              onClick={onClearVoiceDraft}
              className="ms-auto inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[13px] hover:bg-black/5"
            >
              <X className="h-3.5 w-3.5" />
              {t("voice.cancel")}
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          {/* مزید — attachment / voice menu */}
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              disabled={sending || voiceBusy}
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-[12px] bg-accent px-2 text-[11px] font-medium text-primary transition-colors hover:bg-[#D5E5DA] disabled:opacity-40"
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden />
              <span>{t("assistant.more")}</span>
            </button>

            <AnimatePresence>
              {menuOpen ? (
                <motion.div
                  role="menu"
                  initial={
                    reduceMotion ? false : { opacity: 0, scale: 0.92, y: 6 }
                  }
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={
                    reduceMotion
                      ? undefined
                      : { opacity: 0, scale: 0.94, y: 4 }
                  }
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="absolute bottom-[calc(100%+0.5rem)] start-0 z-20 flex min-w-[11rem] flex-col gap-1 rounded-[14px] border border-[#E7E2D6] bg-white p-1.5 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!voiceSupported || sending || voiceBusy}
                    onClick={() => {
                      setMenuOpen(false);
                      onMic();
                    }}
                    className="flex min-h-12 items-center gap-3 rounded-[10px] px-3 text-start text-[14px] text-[#14231B] transition-colors hover:bg-[#F4F8F5] disabled:opacity-40"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#E6EFE9] text-[#0F5132]">
                      <Mic className="h-4 w-4" />
                    </span>
                    <span className="flex flex-col">
                      <span className="font-medium">{t("assistant.speak")}</span>
                      <span className="text-[12px] text-[#6B7A70]">
                        {voiceSupported
                          ? t("assistant.speakHint")
                          : t("voice.notSupported")}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={sending}
                    onClick={() => {
                      setMenuOpen(false);
                      onReceipt();
                    }}
                    className="flex min-h-12 items-center gap-3 rounded-[10px] px-3 text-start text-[14px] text-[#14231B] transition-colors hover:bg-[#F4F8F5] disabled:opacity-40"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#FDF3D8] text-[#B07D2A]">
                      <Receipt className="h-4 w-4" />
                    </span>
                    <span className="flex flex-col">
                      <span className="font-medium">
                        {t("assistant.receipt")}
                      </span>
                      <span className="text-[12px] text-[#6B7A70]">
                        {t("assistant.receiptHint")}
                      </span>
                    </span>
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Text */}
          <div className="relative min-w-0 flex-1">
            <AnimatePresence mode="wait" initial={false}>
              {!value && !focused ? (
                <motion.span
                  key={placeholder}
                  aria-hidden
                  className="pointer-events-none absolute inset-x-1.5 top-2.5 line-clamp-2 text-[15px] leading-[1.9] text-[#9BA79F]"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {placeholder}
                </motion.span>
              ) : null}
            </AnimatePresence>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              rows={1}
              dir="auto"
              aria-label={t("assistant.write")}
              placeholder={focused || value ? t("assistant.placeholder") : " "}
              className="relative z-[1] w-full resize-none bg-transparent px-1.5 py-2.5 text-[15.5px] leading-[1.9] placeholder:text-[#9BA79F] focus:outline-none"
              style={{ maxHeight: 200 }}
            />
          </div>

          {/* بھیجیں */}
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-primary px-4 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-[#14231B] disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden />
            <span>
              {sending ? t("assistant.sending") : t("assistant.send")}
            </span>
          </button>
        </div>
      </div>

      <p className="mx-auto mt-2 max-w-3xl px-2 text-[12.5px] leading-[1.8] text-[#8A9690]">
        {t("assistant.composerHint")}
      </p>
      <p className="mx-auto mt-1 max-w-3xl px-2 text-[11.5px] leading-[1.7] text-[#8A9690]">
        {t("assistant.disclaimer")}
      </p>
    </div>
  );
}

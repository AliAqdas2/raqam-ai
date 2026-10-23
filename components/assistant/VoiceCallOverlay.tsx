"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mic, MicOff, PhoneOff, Phone, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { VoiceOrb, type OrbMode } from "@/components/assistant/VoiceOrb";
import { ConfirmationCard } from "@/components/assistant/ConfirmationCard";
import { REVIEW_MS, type CallPhase, type useVoiceCall } from "@/hooks/useVoiceCall";
import type { PendingActionData } from "@/hooks/useAssistant";
import type { TranslationKey } from "@/lib/i18n/ur";
import { cn, isLatinScript } from "@/lib/utils";

type Call = ReturnType<typeof useVoiceCall>;

const PHASE_LABEL: Record<CallPhase, TranslationKey> = {
  idle: "call.phaseIdle",
  greeting: "call.phaseSpeaking",
  listening: "call.phaseListening",
  transcribing: "call.phaseThinking",
  review: "call.phaseReview",
  thinking: "call.phaseThinking",
  speaking: "call.phaseSpeaking",
  confirming: "call.phaseConfirming",
  paused: "call.phasePaused",
  ended: "call.phaseEnded",
  error: "call.phaseError",
};

function orbMode(phase: CallPhase): OrbMode {
  if (phase === "listening") return "listening";
  if (phase === "speaking" || phase === "greeting") return "speaking";
  if (phase === "thinking" || phase === "transcribing") return "thinking";
  return "idle";
}

function CallTimer({ startedAt }: { startedAt: number }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  return (
    <span className="font-[var(--font-manrope)] text-[13px] tabular-nums text-[#8FB49E]">
      {String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}
    </span>
  );
}

function Caption({ text, muted }: { text: string; muted?: boolean }) {
  const latin = isLatinScript(text);
  return (
    <p
      dir={latin ? "ltr" : "rtl"}
      className={cn(
        "max-h-[22vh] overflow-y-auto whitespace-pre-line text-center",
        latin ? "leading-[1.7]" : "font-reading",
        muted ? "text-[14px] text-[#8FB49E]" : "text-[17px] text-[#EAF1EB] sm:text-[19px]",
      )}
    >
      {text}
    </p>
  );
}

export function VoiceCallOverlay({
  open,
  call,
  pendingActions,
  onConfirm,
  onReject,
  onClose,
}: {
  open: boolean;
  call: Call;
  pendingActions: PendingActionData[];
  onConfirm: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const { phase } = call;

  // Close on Escape (ends the call).
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        call.end();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, call, onClose]);

  const lastUser = [...call.turns].reverse().find((x) => x.role === "user");
  const lastAssistant = [...call.turns].reverse().find((x) => x.role === "assistant");
  const live = phase === "listening" || phase === "review" || phase === "transcribing";
  const notStarted = phase === "idle" || phase === "ended";
  const awaiting = pendingActions.filter((a) => a.status === "pending");

  const orbLabel =
    phase === "speaking" || phase === "greeting"
      ? t("call.tapToInterrupt")
      : phase === "listening"
        ? t("call.tapToFinish")
        : phase === "paused"
          ? t("call.tapToTalk")
          : t(PHASE_LABEL[phase]);

  const endAndClose = () => {
    call.end();
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={t("call.title")}
          className="fixed inset-0 z-[60] flex flex-col bg-[#0B3B26] text-[#EAF1EB]"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Subtle geometric ground — the jaali lattice of the brand */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #E8B931 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />

          {/* Top bar */}
          <header className="relative flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
            <div className="flex flex-col">
              <span className="text-[16px] font-bold">{t("call.title")}</span>
              {call.startedAt ? (
                <CallTimer startedAt={call.startedAt} />
              ) : (
                <span className="text-[13px] text-[#8FB49E]">{t("call.subtitle")}</span>
              )}
            </div>
            <button
              type="button"
              onClick={endAndClose}
              aria-label={t("call.close")}
              className="grid h-11 w-11 place-items-center rounded-full text-[#8FB49E] transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {/* Stage */}
          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-5">
            <VoiceOrb
              mode={orbMode(phase)}
              getLevel={call.getLevel}
              size={notStarted ? 150 : 168}
              onClick={notStarted ? () => void call.start() : call.tapOrb}
              label={notStarted ? t("call.start") : orbLabel}
            />

            <div className="flex flex-col items-center gap-1 text-center" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={phase}
                  className="text-[22px] font-bold sm:text-[26px]"
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  {t(PHASE_LABEL[phase])}
                </motion.span>
              </AnimatePresence>
              {!notStarted && phase !== "error" ? (
                <span className="text-[13px] text-[#8FB49E]">{orbLabel}</span>
              ) : null}
            </div>

            {/* Captions */}
            <div className="flex w-full max-w-xl flex-col items-center gap-3">
              {phase === "error" ? (
                <Caption
                  text={
                    call.voiceError === "mic-denied"
                      ? t("voice.micDenied")
                      : t("voice.notSupported")
                  }
                />
              ) : notStarted ? (
                <Caption text={t("call.intro")} muted />
              ) : phase === "review" ? (
                <div className="flex w-full flex-col items-center gap-3">
                  <Caption text={call.reviewText} />
                  <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full bg-[#E8B931]"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: REVIEW_MS / 1000, ease: "linear" }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={call.cancelReview}
                      className="min-h-11 rounded-full border border-white/20 px-5 text-[14px] text-[#DCE7DF] hover:bg-white/10"
                    >
                      {t("call.discard")}
                    </button>
                    <button
                      type="button"
                      onClick={call.sendReviewNow}
                      className="min-h-11 rounded-full bg-[#E8B931] px-5 text-[14px] font-semibold text-[#0B3B26] hover:bg-[#F2C846]"
                    >
                      {t("call.sendNow")}
                    </button>
                  </div>
                </div>
              ) : live ? (
                <Caption text={call.interimText || lastUser?.text || ""} muted />
              ) : (
                <>
                  {lastUser ? <Caption text={lastUser.text} muted /> : null}
                  {lastAssistant ? <Caption text={lastAssistant.text} /> : null}
                </>
              )}
            </div>

            {/* Confirmation gate — always a tap, never a spoken "yes" */}
            {awaiting.length > 0 ? (
              <div className="w-full max-w-md text-[#14231B]">
                {awaiting.map((action) => (
                  <ConfirmationCard
                    key={action.id}
                    action={action}
                    onConfirm={onConfirm}
                    onReject={onReject}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* Controls */}
          <footer className="relative flex items-center justify-center gap-6 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
            {notStarted ? (
              <button
                type="button"
                onClick={() => void call.start()}
                disabled={!call.voiceSupported}
                className="inline-flex min-h-14 items-center gap-2.5 rounded-full bg-[#22B07D] px-8 text-[16px] font-semibold text-white shadow-[0_10px_30px_-8px_rgba(34,176,125,0.7)] transition-transform active:scale-95 disabled:opacity-40"
              >
                <Phone className="h-5 w-5" aria-hidden />
                {t("call.start")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={call.toggleMute}
                  aria-pressed={call.muted}
                  aria-label={call.muted ? t("call.unmute") : t("call.mute")}
                  className={cn(
                    "grid h-14 w-14 place-items-center rounded-full transition-colors",
                    call.muted
                      ? "bg-[#EAF1EB] text-[#0B3B26]"
                      : "bg-white/10 text-white hover:bg-white/20",
                  )}
                >
                  {call.muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </button>
                <button
                  type="button"
                  onClick={endAndClose}
                  aria-label={t("call.end")}
                  className="grid h-16 w-16 place-items-center rounded-full bg-[#B3261E] text-white shadow-[0_10px_30px_-8px_rgba(179,38,30,0.8)] transition-transform hover:bg-[#9C1F18] active:scale-95"
                >
                  <PhoneOff className="h-7 w-7" />
                </button>
              </>
            )}
          </footer>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

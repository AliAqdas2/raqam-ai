"use client";

// hooks/useVoiceCall.ts — "Call Raqam": a hands-free, two-way voice
// conversation with the assistant.
//
//   greet → listen (auto-stops on silence) → review (transcript shown, short
//   cancel window) → think (same AI pipeline + guardrail as the chat) →
//   speak the reply → listen again …
//
// Safety properties carried over from the chat (AGENTS.md §7, §9.5, Phase 11):
//   • The transcript is always shown to the user before it is sent, with a
//     window to cancel it.
//   • Write actions still go through the confirmation gate: when a reply
//     proposes one, the loop pauses until the user taps Confirm or Cancel on
//     the card. A spoken "yes" never confirms a mutation.

import * as React from "react";
import { useVoiceInput, type VoiceInputOptions } from "@/hooks/useVoiceInput";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import type {
  AssistantReply,
  InputMode,
  PendingActionData,
  SendMessageOptions,
} from "@/hooks/useAssistant";
import type { TranslationKey } from "@/lib/i18n/ur";

export type CallPhase =
  | "idle" // not started (overlay shows "Start call")
  | "greeting"
  | "listening"
  | "transcribing"
  | "review" // transcript visible, auto-sends after REVIEW_MS
  | "thinking"
  | "speaking"
  | "confirming" // waiting for the user to tap Confirm / Cancel
  | "paused" // muted, or nobody spoke — tap the orb to talk
  | "ended"
  | "error";

export interface CallTurn {
  role: "user" | "assistant";
  text: string;
}

/** Turn-taking for hands-free calls — tuned for natural Urdu speech pauses. */
export const CALL_AUTO_STOP: NonNullable<VoiceInputOptions["autoStop"]> = {
  silenceMs: 1400,
  noSpeechMs: 9000,
  // Below useVoiceInput.waitForResult's 30 s safety timeout.
  maxMs: 28000,
};

/** How long a transcript stays on screen before it is sent automatically. */
export const REVIEW_MS = 1800;

/** After this many empty turns in a row, stop listening until tapped. */
const MAX_SILENT_TURNS = 2;

interface UseVoiceCallArgs {
  language: "ur" | "en";
  t: (key: TranslationKey) => string;
  sendMessage: (
    content: string,
    mode?: InputMode,
    options?: SendMessageOptions,
  ) => Promise<AssistantReply | null>;
  pendingActions: PendingActionData[];
}

export function useVoiceCall({
  language,
  t,
  sendMessage,
  pendingActions,
}: UseVoiceCallArgs) {
  const voice = useVoiceInput(language === "ur" ? "ur-PK" : "en-US", {
    autoStop: CALL_AUTO_STOP,
  });
  const tts = useTextToSpeech();

  const [phase, setPhase] = React.useState<CallPhase>("idle");
  const [turns, setTurns] = React.useState<CallTurn[]>([]);
  const [reviewText, setReviewText] = React.useState("");
  const [muted, setMuted] = React.useState(false);
  const [startedAt, setStartedAt] = React.useState<number | null>(null);

  // A new run id cancels every in-flight await of the previous loop.
  const runRef = React.useRef(0);
  const reviewDecisionRef = React.useRef<((send: boolean) => void) | null>(null);
  const mutedRef = React.useRef(muted);
  const pendingRef = React.useRef(pendingActions);
  React.useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  React.useEffect(() => {
    pendingRef.current = pendingActions;
  }, [pendingActions]);

  const alive = (run: number) => runRef.current === run;

  const say = React.useCallback(
    async (run: number, text: string) => {
      if (!alive(run) || !text) return;
      setPhase("speaking");
      setTurns((prev) => [...prev, { role: "assistant", text }]);
      await tts.speak(text, { preferredLanguage: language });
    },
    [tts, language],
  );

  /** Resolves true to send, false to discard; auto-sends after REVIEW_MS. */
  const awaitReview = React.useCallback(
    (run: number): Promise<boolean> =>
      new Promise((resolve) => {
        const timer = window.setTimeout(() => decide(true), REVIEW_MS);
        function decide(send: boolean) {
          window.clearTimeout(timer);
          reviewDecisionRef.current = null;
          resolve(send && alive(run));
        }
        reviewDecisionRef.current = decide;
      }),
    [],
  );

  const waitForConfirmation = React.useCallback(
    (run: number): Promise<"executed" | "rejected" | "failed" | null> =>
      new Promise((resolve) => {
        // The proposed action arrives reactively; give it a moment to appear,
        // then wait until no action is left in "pending".
        const startedWaiting = Date.now();
        let seenPending = false;
        const id = window.setInterval(() => {
          if (!alive(run)) {
            window.clearInterval(id);
            return resolve(null);
          }
          const actions = pendingRef.current;
          const pending = actions.some((a) => a.status === "pending");
          if (pending) seenPending = true;
          if (!pending && (seenPending || Date.now() - startedWaiting > 4000)) {
            window.clearInterval(id);
            const last = actions[actions.length - 1];
            resolve(
              last && last.status !== "pending" && last.status !== "confirmed"
                ? last.status
                : null,
            );
          }
        }, 300);
      }),
    [],
  );

  const loop = React.useCallback(
    async (run: number) => {
      let silentTurns = 0;
      while (alive(run)) {
        if (mutedRef.current) {
          setPhase("paused");
          return;
        }

        // ── Listen ──
        setPhase("listening");
        voice.startListening();
        const outcome = await voice.waitForResult();
        if (!alive(run)) return;

        if (outcome.error === "mic-denied" || outcome.error === "not-supported") {
          setPhase("error");
          return;
        }
        const heard = outcome.transcript.trim();
        if (!heard) {
          silentTurns++;
          if (silentTurns >= MAX_SILENT_TURNS) {
            await say(run, t("call.stillHere"));
            if (alive(run)) setPhase("paused");
            return;
          }
          continue;
        }
        silentTurns = 0;

        // ── Review: show the transcript before it enters the AI pipeline ──
        setReviewText(heard);
        setPhase("review");
        const send = await awaitReview(run);
        setReviewText("");
        if (!alive(run)) return;
        if (!send) continue;

        // ── Think ──
        setTurns((prev) => [...prev, { role: "user", text: heard }]);
        setPhase("thinking");
        const reply = await sendMessage(heard, "voice");
        if (!alive(run)) return;
        if (!reply) {
          await say(run, t("call.error"));
          continue;
        }

        // ── Speak ──
        await say(run, reply.content);
        if (!alive(run)) return;

        // ── Confirmation gate ──
        if (reply.proposedAction) {
          setPhase("confirming");
          const result = await waitForConfirmation(run);
          if (!alive(run)) return;
          if (result === "executed") await say(run, t("call.actionDone"));
          else if (result === "rejected") await say(run, t("call.actionCancelled"));
          else if (result === "failed") await say(run, t("call.actionFailed"));
        }
      }
    },
    [voice, say, awaitReview, sendMessage, waitForConfirmation, t],
  );

  /** Start the call. Must be called from a tap/click (unlocks audio). */
  const start = React.useCallback(async () => {
    tts.unlock();
    const run = ++runRef.current;
    setTurns([]);
    setMuted(false);
    mutedRef.current = false;
    setStartedAt(Date.now());
    setPhase("greeting");
    await say(run, t("call.greeting"));
    if (alive(run)) void loop(run);
  }, [tts, say, loop, t]);

  const end = React.useCallback(() => {
    runRef.current++;
    reviewDecisionRef.current?.(false);
    tts.stop();
    if (voice.isListening) voice.stopListening();
    voice.reset();
    setReviewText("");
    setStartedAt(null);
    setPhase("ended");
  }, [tts, voice]);

  /**
   * The big orb: interrupts the assistant while it speaks, ends the user's
   * turn early while listening, or resumes a paused call.
   */
  const tapOrb = React.useCallback(() => {
    if (phase === "speaking" || phase === "greeting") {
      tts.stop(); // speak() resolves → the loop moves on to listening
    } else if (phase === "listening") {
      voice.stopListening();
    } else if (phase === "paused") {
      setMuted(false);
      mutedRef.current = false;
      const run = ++runRef.current;
      void loop(run);
    } else if (phase === "review") {
      reviewDecisionRef.current?.(true);
    }
  }, [phase, tts, voice, loop]);

  const toggleMute = React.useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (next && phase === "listening") {
      // Abandon this turn without sending it.
      runRef.current++;
      voice.stopListening();
      voice.reset();
      setPhase("paused");
    } else if (!next && phase === "paused") {
      const run = ++runRef.current;
      void loop(run);
    }
  }, [phase, voice, loop]);

  const cancelReview = React.useCallback(() => {
    reviewDecisionRef.current?.(false);
  }, []);
  const sendReviewNow = React.useCallback(() => {
    reviewDecisionRef.current?.(true);
  }, []);

  React.useEffect(
    () => () => {
      runRef.current++;
    },
    [],
  );

  /** Combined level for the orb: mic while listening, voice while speaking. */
  const getLevel = React.useCallback(() => {
    if (phase === "listening") return voice.getInputLevel();
    if (phase === "speaking" || phase === "greeting") return tts.getLevel();
    return 0;
  }, [phase, voice, tts]);

  return {
    phase,
    turns,
    reviewText,
    interimText: voice.interimTranscript,
    muted,
    startedAt,
    voiceSupported: voice.supported,
    voiceError: voice.error,
    ttsProvider: tts.provider,
    start,
    end,
    tapOrb,
    toggleMute,
    cancelReview,
    sendReviewNow,
    getLevel,
  };
}

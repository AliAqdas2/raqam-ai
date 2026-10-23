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
//
// The turn-taking itself lives in lib/voice/call-loop.ts (pure, unit-tested);
// this hook only wires the microphone, TTS and assistant into it.

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
import {
  runCallLoop,
  sayLine,
  type CallLoopDeps,
  type CallPhase,
  type CallTurn,
  type ConfirmationResult,
} from "@/lib/voice/call-loop";

export type { CallPhase, CallTurn };

/** Turn-taking for hands-free calls — tuned for natural Urdu speech pauses. */
export const CALL_AUTO_STOP: NonNullable<VoiceInputOptions["autoStop"]> = {
  silenceMs: 1400,
  noSpeechMs: 9000,
  // Below useVoiceInput.waitForResult's 30 s safety timeout.
  maxMs: 28000,
};

/** How long a transcript stays on screen before it is sent automatically. */
export const REVIEW_MS = 1800;

interface UseVoiceCallArgs {
  language: "ur" | "en";
  t: (key: TranslationKey) => string;
  sendMessage: (
    content: string,
    mode?: InputMode,
    options?: SendMessageOptions,
  ) => Promise<AssistantReply | null>;
  pendingActions: PendingActionData[];
  confirmAction: (actionId: string) => Promise<void>;
  rejectAction: (actionId: string) => Promise<void>;
}

export function useVoiceCall({
  language,
  t,
  sendMessage,
  pendingActions,
  confirmAction: confirmActionBase,
  rejectAction: rejectActionBase,
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
  // Set while the loop waits on the confirmation card; the card's buttons
  // report their outcome through it.
  const actionDecisionRef = React.useRef<
    ((result: ConfirmationResult) => void) | null
  >(null);
  const mutedRef = React.useRef(muted);
  const pendingRef = React.useRef(pendingActions);
  React.useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  React.useEffect(() => {
    pendingRef.current = pendingActions;
  }, [pendingActions]);

  const alive = (run: number) => runRef.current === run;

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
    (run: number): Promise<ConfirmationResult> =>
      new Promise((resolve) => {
        // The outcome normally arrives from confirmAction / rejectAction
        // below. The poll only covers the edges: no card ever appeared, or the
        // card went away without a decision through this call. Resolved
        // actions drop out of pendingActions (the query lists "pending" only),
        // so the list alone cannot tell executed from rejected.
        const startedWaiting = Date.now();
        let seenPending = false;
        let goneAt: number | null = null;
        const done = (result: ConfirmationResult) => {
          window.clearInterval(id);
          actionDecisionRef.current = null;
          resolve(alive(run) ? result : null);
        };
        actionDecisionRef.current = done;
        const id = window.setInterval(() => {
          if (!alive(run)) return done(null);
          const pending = pendingRef.current.some((a) => a.status === "pending");
          if (pending) {
            seenPending = true;
            goneAt = null;
            return;
          }
          if (!seenPending) {
            if (Date.now() - startedWaiting > 4000) done(null);
            return;
          }
          goneAt ??= Date.now();
          if (Date.now() - goneAt > 3000) done(null);
        }, 300);
      }),
    [],
  );

  /** The card's Confirm / Cancel, reporting the outcome to the loop. */
  const confirmAction = React.useCallback(
    async (actionId: string) => {
      try {
        await confirmActionBase(actionId);
        actionDecisionRef.current?.("executed");
      } catch (err) {
        actionDecisionRef.current?.("failed");
        throw err;
      }
    },
    [confirmActionBase],
  );
  const rejectAction = React.useCallback(
    async (actionId: string) => {
      await rejectActionBase(actionId);
      actionDecisionRef.current?.("rejected");
    },
    [rejectActionBase],
  );

  /** Bind the call loop's dependencies to one run of the loop. */
  const depsFor = React.useCallback(
    (run: number): CallLoopDeps => ({
      isAlive: () => alive(run),
      isMuted: () => mutedRef.current,
      setPhase: (p) => {
        if (alive(run)) setPhase(p);
      },
      addTurn: (turn) => {
        if (alive(run)) setTurns((prev) => [...prev, turn]);
      },
      listen: () => {
        voice.startListening();
        return voice.waitForResult();
      },
      review: async (text) => {
        setReviewText(text);
        const send = await awaitReview(run);
        setReviewText("");
        return send;
      },
      send: (text) => sendMessage(text, "voice"),
      speak: (text) => tts.speak(text, { preferredLanguage: language }),
      waitForConfirmation: () => waitForConfirmation(run),
      t,
    }),
    [voice, awaitReview, sendMessage, tts, language, waitForConfirmation, t],
  );

  const loop = React.useCallback(
    async (run: number) => {
      await runCallLoop(depsFor(run));
    },
    [depsFor],
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
    const deps = depsFor(run);
    await sayLine({ ...deps, setPhase: () => {} }, t("call.greeting"));
    if (alive(run)) void loop(run);
  }, [tts, depsFor, loop, t]);

  const end = React.useCallback(() => {
    runRef.current++;
    reviewDecisionRef.current?.(false);
    actionDecisionRef.current?.(null);
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

  // While the recording is being transcribed the loop is still awaiting
  // listen(); show that as its own phase instead of "listening".
  const displayPhase: CallPhase =
    phase === "listening" && voice.processing ? "transcribing" : phase;

  return {
    phase: displayPhase,
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
    confirmAction,
    rejectAction,
    getLevel,
  };
}

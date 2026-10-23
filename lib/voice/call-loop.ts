// lib/voice/call-loop.ts — The turn-taking loop behind "Call Raqam".
//
//   listen → review → think → speak → (confirmation gate) → listen …
//
// Pure and dependency-injected: no React, no DOM, no Convex. hooks/useVoiceCall.ts
// wires the real microphone, TTS and assistant into it, and
// tests/unit/call-loop.test.ts drives every branch with fakes.
//
// Liveness rule: every await in here is bounded. The microphone wait is capped
// by useVoiceInput (30 s), speech by the TTS watchdog, the assistant by
// `sendTimeoutMs`, and the confirmation gate by `confirmTimeoutMs`, so a lost
// event or a hung network call can never leave the call stuck in one phase.

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

export interface CallListenOutcome {
  transcript: string;
  error: string | null;
}

export interface CallReply {
  content: string;
  proposedAction: boolean;
}

export type ConfirmationResult = "executed" | "rejected" | "failed" | null;

export interface CallLoopDeps {
  /** False once the call ended or a newer loop took over. */
  isAlive: () => boolean;
  isMuted: () => boolean;
  setPhase: (phase: CallPhase) => void;
  addTurn: (turn: CallTurn) => void;
  /** Record one utterance and resolve with its transcript. */
  listen: () => Promise<CallListenOutcome>;
  /** Show the transcript; resolve true to send it, false to discard. */
  review: (text: string) => Promise<boolean>;
  /** Send to the assistant; null when sending failed. */
  send: (text: string) => Promise<CallReply | null>;
  /** Speak text aloud. Must resolve (never reject) when playback ends. */
  speak: (text: string) => Promise<void>;
  /** Resolve once the user has confirmed or cancelled the proposed action. */
  waitForConfirmation: () => Promise<ConfirmationResult>;
  t: (key: TranslationKey) => string;
}

export interface CallLoopOptions {
  /** After this many missed turns in a row, stop listening until tapped. */
  maxMissedTurns?: number;
  /** Give up waiting for the assistant after this long. */
  sendTimeoutMs?: number;
  /** Stop waiting on the confirmation card after this long. */
  confirmTimeoutMs?: number;
}

export const DEFAULT_CALL_LOOP_OPTIONS: Required<CallLoopOptions> = {
  maxMissedTurns: 2,
  sendTimeoutMs: 60_000,
  confirmTimeoutMs: 120_000,
};

const TIMED_OUT = Symbol("timed-out");

function within<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | typeof TIMED_OUT> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(TIMED_OUT), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        // A rejected dependency is treated like a failure, not a crash.
        resolve(null as T);
      },
    );
  });
}

/** Errors that mean the call cannot continue at all. */
const FATAL_MIC_ERRORS = new Set(["mic-denied", "not-supported"]);
/** Errors where the user spoke but no usable transcript came back. */
const TRANSCRIBE_ERRORS = new Set(["transcribe-failed", "timeout"]);

/** Speak and log one assistant line. */
export async function sayLine(deps: CallLoopDeps, text: string): Promise<void> {
  if (!deps.isAlive() || !text.trim()) return;
  deps.setPhase("speaking");
  deps.addTurn({ role: "assistant", text });
  await deps.speak(text);
}

/**
 * Run turns until the call ends, is muted, pauses after repeated missed
 * turns, or the microphone becomes unavailable. Resolves with the reason.
 */
export async function runCallLoop(
  deps: CallLoopDeps,
  options: CallLoopOptions = {},
): Promise<"ended" | "paused" | "error"> {
  const opts = { ...DEFAULT_CALL_LOOP_OPTIONS, ...options };
  const { t } = deps;
  let missed = 0;

  while (deps.isAlive()) {
    if (deps.isMuted()) {
      deps.setPhase("paused");
      return "paused";
    }

    // ── Listen ──
    deps.setPhase("listening");
    let outcome: CallListenOutcome;
    try {
      outcome = await deps.listen();
    } catch {
      outcome = { transcript: "", error: "transcribe-failed" };
    }
    if (!deps.isAlive()) return "ended";

    if (outcome.error && FATAL_MIC_ERRORS.has(outcome.error)) {
      deps.setPhase("error");
      return "error";
    }

    const heard = outcome.transcript.trim();
    if (!heard) {
      missed++;
      if (missed >= opts.maxMissedTurns) {
        await sayLine(deps, t("call.stillHere"));
        if (!deps.isAlive()) return "ended";
        deps.setPhase("paused");
        return "paused";
      }
      // The user spoke but we could not make it out: say so instead of
      // silently listening again (silence needs no reply).
      if (outcome.error && TRANSCRIBE_ERRORS.has(outcome.error)) {
        await sayLine(deps, t("call.didntCatch"));
      }
      continue;
    }
    missed = 0;

    // ── Review: show the transcript before it enters the AI pipeline ──
    deps.setPhase("review");
    const send = await deps.review(heard);
    if (!deps.isAlive()) return "ended";
    if (!send) continue;

    // ── Think ──
    deps.addTurn({ role: "user", text: heard });
    deps.setPhase("thinking");
    const reply = await within(deps.send(heard), opts.sendTimeoutMs);
    if (!deps.isAlive()) return "ended";
    if (reply === TIMED_OUT) {
      await sayLine(deps, t("call.slowReply"));
      continue;
    }
    if (!reply || !reply.content.trim()) {
      await sayLine(deps, t("call.error"));
      continue;
    }

    // ── Speak ──
    await sayLine(deps, reply.content);
    if (!deps.isAlive()) return "ended";

    // ── Confirmation gate: a spoken "yes" never confirms a mutation ──
    if (reply.proposedAction) {
      deps.setPhase("confirming");
      const result = await within(
        deps.waitForConfirmation(),
        opts.confirmTimeoutMs,
      );
      if (!deps.isAlive()) return "ended";
      if (result === TIMED_OUT) {
        await sayLine(deps, t("call.confirmTimeout"));
        if (!deps.isAlive()) return "ended";
        deps.setPhase("paused");
        return "paused";
      }
      if (result === "executed") await sayLine(deps, t("call.actionDone"));
      else if (result === "rejected") await sayLine(deps, t("call.actionCancelled"));
      else if (result === "failed") await sayLine(deps, t("call.actionFailed"));
    }
  }
  return "ended";
}

"use client";

// hooks/useVoicePrefs.ts — Per-device voice preferences for the assistant's
// spoken replies. These are UI conveniences, not financial records, so they
// live in localStorage (AGENTS.md §3 prohibits localStorage only for financial
// data). Every read/write is guarded: private windows and blocked storage fall
// back to the defaults.

import * as React from "react";
import type { VoiceGender } from "@/lib/ai/tts";

export interface VoicePrefs {
  /** Read every new assistant reply aloud in the chat. */
  autoSpeak: boolean;
  gender: VoiceGender;
  /** Relative speaking rate in percent (-30…+30). */
  rate: number;
}

export const DEFAULT_VOICE_PREFS: VoicePrefs = {
  autoSpeak: false,
  gender: "female",
  rate: 0,
};

const STORAGE_KEY = "raqam.voicePrefs.v1";
const listeners = new Set<() => void>();

function read(): VoicePrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VOICE_PREFS;
    const parsed = JSON.parse(raw) as Partial<VoicePrefs>;
    return {
      autoSpeak:
        typeof parsed.autoSpeak === "boolean"
          ? parsed.autoSpeak
          : DEFAULT_VOICE_PREFS.autoSpeak,
      gender: parsed.gender === "male" ? "male" : "female",
      rate:
        typeof parsed.rate === "number" && Number.isFinite(parsed.rate)
          ? Math.max(-30, Math.min(30, parsed.rate))
          : DEFAULT_VOICE_PREFS.rate,
    };
  } catch {
    return DEFAULT_VOICE_PREFS;
  }
}

// useSyncExternalStore needs a referentially stable snapshot.
let snapshot: VoicePrefs | null = null;
function getSnapshot(): VoicePrefs {
  if (!snapshot) snapshot = read();
  return snapshot;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      snapshot = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useVoicePrefs() {
  const prefs = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => DEFAULT_VOICE_PREFS,
  );

  const setPrefs = React.useCallback((patch: Partial<VoicePrefs>) => {
    snapshot = { ...getSnapshot(), ...patch };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Storage blocked — the change still applies for this session.
    }
    listeners.forEach((l) => l());
  }, []);

  return { prefs, setPrefs };
}

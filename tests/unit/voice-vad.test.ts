import { describe, it, expect } from "vitest";
import { rmsLevel, shouldAutoStop } from "@/hooks/useVoiceInput";
import { CALL_AUTO_STOP } from "@/hooks/useVoiceCall";

const cfg = { silenceMs: 1400, noSpeechMs: 9000, maxMs: 28000 };

describe("shouldAutoStop (voice-call turn taking)", () => {
  it("keeps listening while the speaker is talking", () => {
    expect(
      shouldAutoStop({ elapsed: 5000, heardSpeech: true, lastSpeechAt: 4800 }, cfg),
    ).toBe(false);
  });

  it("ends the turn after a pause of silenceMs following speech", () => {
    expect(
      shouldAutoStop({ elapsed: 6200, heardSpeech: true, lastSpeechAt: 4800 }, cfg),
    ).toBe(true);
    expect(
      shouldAutoStop({ elapsed: 6100, heardSpeech: true, lastSpeechAt: 4800 }, cfg),
    ).toBe(false);
  });

  it("waits up to noSpeechMs for speech to start", () => {
    expect(
      shouldAutoStop({ elapsed: 8000, heardSpeech: false, lastSpeechAt: 0 }, cfg),
    ).toBe(false);
    expect(
      shouldAutoStop({ elapsed: 9000, heardSpeech: false, lastSpeechAt: 0 }, cfg),
    ).toBe(true);
  });

  it("enforces the hard cap even mid-speech", () => {
    expect(
      shouldAutoStop({ elapsed: 28000, heardSpeech: true, lastSpeechAt: 27990 }, cfg),
    ).toBe(true);
  });

  it("caps call recordings below waitForResult's 30 s safety timeout", () => {
    expect(CALL_AUTO_STOP.maxMs).toBeLessThan(30000);
    expect(CALL_AUTO_STOP.silenceMs).toBeLessThan(CALL_AUTO_STOP.noSpeechMs);
  });
});

describe("rmsLevel", () => {
  it("is 0 for silence (128) and for an empty buffer", () => {
    expect(rmsLevel(new Uint8Array(512).fill(128))).toBe(0);
    expect(rmsLevel(new Uint8Array())).toBe(0);
  });

  it("is ~1 for a full-scale square wave", () => {
    const buf = new Uint8Array(512).map((_, i) => (i % 2 ? 255 : 0));
    expect(rmsLevel(buf)).toBeGreaterThan(0.99);
  });

  it("grows with amplitude", () => {
    const wave = (amp: number) =>
      new Uint8Array(512).map((_, i) => 128 + Math.round(amp * Math.sin(i / 8)));
    expect(rmsLevel(wave(60))).toBeGreaterThan(rmsLevel(wave(10)));
  });
});

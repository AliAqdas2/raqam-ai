import { describe, it, expect, vi, afterEach } from "vitest";
import {
  runCallLoop,
  type CallLoopDeps,
  type CallListenOutcome,
  type CallPhase,
  type CallReply,
  type ConfirmationResult,
} from "@/lib/voice/call-loop";

// ─── Scripted fake call ───────────────────────────────────────────────────────
//
// Each test scripts what the microphone hears, what the assistant replies and
// what the user taps. When the listen script runs out, the user hangs up, so
// every loop terminates. `spoken` is what the user would hear, in order.

type Step<T> = T | (() => Promise<T>);

interface Script {
  hears: Step<CallListenOutcome>[];
  replies?: Step<CallReply | null>[];
  reviews?: boolean[];
  confirmations?: Step<ConfirmationResult>[];
  muteAfterTurns?: number;
}

function fakeCall(script: Script) {
  const spoken: string[] = [];
  const phases: CallPhase[] = [];
  const sent: string[] = [];
  let alive = true;
  let muted = false;
  let turns = 0;
  const hears = [...script.hears];
  const replies = [...(script.replies ?? [])];
  const reviews = [...(script.reviews ?? [])];
  const confirmations = [...(script.confirmations ?? [])];

  const run = <T,>(s: Step<T> | undefined, fallback: T): Promise<T> =>
    s === undefined
      ? Promise.resolve(fallback)
      : typeof s === "function"
        ? (s as () => Promise<T>)()
        : Promise.resolve(s);

  const deps: CallLoopDeps = {
    isAlive: () => alive,
    isMuted: () => muted,
    setPhase: (p) => phases.push(p),
    addTurn: () => {},
    listen: async () => {
      const next = hears.shift();
      if (next === undefined) {
        alive = false; // the user hangs up
        return { transcript: "", error: null };
      }
      return run(next, { transcript: "", error: null });
    },
    review: async () => reviews.shift() ?? true,
    send: async (text) => {
      sent.push(text);
      turns++;
      if (script.muteAfterTurns && turns >= script.muteAfterTurns) muted = true;
      return run(replies.shift(), { content: "ok", proposedAction: false });
    },
    speak: async (text) => {
      spoken.push(text);
    },
    waitForConfirmation: () => run(confirmations.shift(), null),
    t: (key) => `<${key}>`,
  };
  return {
    deps,
    spoken,
    phases,
    sent,
    hangUp: () => {
      alive = false;
    },
  };
}

const said = (transcript: string): CallListenOutcome => ({ transcript, error: null });
const reply = (content: string, proposedAction = false): CallReply => ({
  content,
  proposedAction,
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Normal replies, one per specialist ──────────────────────────────────────

describe("runCallLoop — assistant replies", () => {
  it.each([
    ["educate", "inflation kya hoti hai?", "مہنگائی کا مطلب ہے…"],
    ["analyze", "is mahine kitna kharch hua?", "آپ کے transactions کے مطابق Rs. 12,400"],
    ["recommend", "kahan bachat karun?", "کھانے پر Rs. 2,000 کم کریں"],
    ["guardrail refusal", "cricket score batao", "میں صرف پیسوں کے بارے میں مدد کر سکتا ہوں"],
  ])("speaks a %s reply and keeps listening", async (_kind, question, answer) => {
    const call = fakeCall({ hears: [said(question)], replies: [reply(answer)] });
    const end = await runCallLoop(call.deps);

    expect(call.sent).toEqual([question]);
    expect(call.spoken).toEqual([answer]);
    expect(end).toBe("ended");
    // listen → review → think → speak → listen again
    expect(call.phases).toEqual([
      "listening",
      "review",
      "thinking",
      "speaking",
      "listening",
    ]);
  });

  it("handles several turns in a row", async () => {
    const call = fakeCall({
      hears: [said("pehla sawal"), said("doosra sawal"), said("teesra sawal")],
      replies: [reply("ek"), reply("do"), reply("teen")],
    });
    await runCallLoop(call.deps);
    expect(call.spoken).toEqual(["ek", "do", "teen"]);
  });

  it("says the error line when sending fails (null reply)", async () => {
    const call = fakeCall({ hears: [said("kuch bhi")], replies: [null] });
    await runCallLoop(call.deps);
    expect(call.spoken).toEqual(["<call.error>"]);
    expect(call.phases.at(-1)).toBe("listening"); // not stuck
  });

  it("says the error line for an empty reply instead of going silent", async () => {
    const call = fakeCall({ hears: [said("kuch bhi")], replies: [reply("   ")] });
    await runCallLoop(call.deps);
    expect(call.spoken).toEqual(["<call.error>"]);
  });

  it("treats a rejected send like a failed one", async () => {
    const call = fakeCall({
      hears: [said("kuch bhi")],
      replies: [() => Promise.reject(new Error("network"))],
    });
    await runCallLoop(call.deps);
    expect(call.spoken).toEqual(["<call.error>"]);
  });

  it("gives up on a reply that never comes and keeps the call going", async () => {
    vi.useFakeTimers();
    const call = fakeCall({
      hears: [said("sawal"), said("doosra")],
      replies: [() => new Promise<CallReply>(() => {}), reply("jawab")],
    });
    const done = runCallLoop(call.deps, { sendTimeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1001);
    await done;
    expect(call.spoken).toEqual(["<call.slowReply>", "jawab"]);
  });
});

// ─── Confirmation gate ───────────────────────────────────────────────────────

describe("runCallLoop — write actions", () => {
  it.each([
    ["executed", "<call.actionDone>"],
    ["rejected", "<call.actionCancelled>"],
    ["failed", "<call.actionFailed>"],
  ] as const)("speaks the outcome when the action is %s", async (result, line) => {
    const call = fakeCall({
      hears: [said("500 ka petrol add karo")],
      replies: [reply("Rs. 500 petrol, تصدیق کریں", true)],
      confirmations: [result],
    });
    await runCallLoop(call.deps);
    expect(call.spoken).toEqual(["Rs. 500 petrol, تصدیق کریں", line]);
    expect(call.phases).toContain("confirming");
  });

  it("says nothing extra when no card ever appeared", async () => {
    const call = fakeCall({
      hears: [said("goal banao")],
      replies: [reply("goal ki tafseel", true)],
      confirmations: [null],
    });
    await runCallLoop(call.deps);
    expect(call.spoken).toEqual(["goal ki tafseel"]);
    expect(call.phases.at(-1)).toBe("listening");
  });

  it("does not wait for a card when the reply proposes nothing", async () => {
    const wait = vi.fn(async () => "executed" as const);
    const call = fakeCall({ hears: [said("sawal")], replies: [reply("jawab")] });
    call.deps.waitForConfirmation = wait;
    await runCallLoop(call.deps);
    expect(wait).not.toHaveBeenCalled();
  });

  it("pauses instead of waiting forever on an untouched card", async () => {
    vi.useFakeTimers();
    const call = fakeCall({
      hears: [said("delete karo")],
      replies: [reply("delete karun?", true)],
      confirmations: [() => new Promise<ConfirmationResult>(() => {})],
    });
    const done = runCallLoop(call.deps, { confirmTimeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1001);
    expect(await done).toBe("paused");
    expect(call.spoken).toEqual(["delete karun?", "<call.confirmTimeout>"]);
    expect(call.phases.at(-1)).toBe("paused");
  });

  it("never confirms an action from speech", async () => {
    // "haan" after a proposal is just another message; the gate stays shut
    // until waitForConfirmation (the card) resolves.
    const call = fakeCall({
      hears: [said("500 ka petrol add karo"), said("haan")],
      replies: [reply("تصدیق کریں", true), reply("card par button dabayen")],
      confirmations: [null],
    });
    await runCallLoop(call.deps);
    expect(call.spoken).not.toContain("<call.actionDone>");
  });
});

// ─── Microphone outcomes ─────────────────────────────────────────────────────

describe("runCallLoop — listening", () => {
  it("listens again quietly after one silent turn", async () => {
    const call = fakeCall({
      hears: [{ transcript: "", error: "no-speech" }, said("ab bolta hoon")],
      replies: [reply("ji")],
    });
    await runCallLoop(call.deps);
    expect(call.spoken).toEqual(["ji"]);
  });

  it("pauses after two silent turns and says so", async () => {
    const call = fakeCall({
      hears: [
        { transcript: "", error: "no-speech" },
        { transcript: "", error: "no-speech" },
        said("never reached"),
      ],
    });
    expect(await runCallLoop(call.deps)).toBe("paused");
    expect(call.spoken).toEqual(["<call.stillHere>"]);
    expect(call.sent).toEqual([]);
  });

  it.each(["transcribe-failed", "timeout"])(
    "asks the user to repeat after a %s turn",
    async (error) => {
      const call = fakeCall({
        hears: [{ transcript: "", error }, said("dobara")],
        replies: [reply("ji")],
      });
      await runCallLoop(call.deps);
      expect(call.spoken).toEqual(["<call.didntCatch>", "ji"]);
    },
  );

  it("treats a throwing listen like a failed transcription", async () => {
    const call = fakeCall({
      hears: [() => Promise.reject(new Error("recorder")), said("dobara")],
      replies: [reply("ji")],
    });
    await runCallLoop(call.deps);
    expect(call.spoken).toEqual(["<call.didntCatch>", "ji"]);
  });

  it("resets the missed-turn count after a good turn", async () => {
    const call = fakeCall({
      hears: [
        { transcript: "", error: "no-speech" },
        said("ek"),
        { transcript: "", error: "no-speech" },
        said("do"),
      ],
      replies: [reply("1"), reply("2")],
    });
    await runCallLoop(call.deps);
    expect(call.spoken).toEqual(["1", "2"]);
  });

  it.each(["mic-denied", "not-supported"])(
    "stops with an error phase on %s",
    async (error) => {
      const call = fakeCall({ hears: [{ transcript: "", error }] });
      expect(await runCallLoop(call.deps)).toBe("error");
      expect(call.phases.at(-1)).toBe("error");
      expect(call.spoken).toEqual([]);
    },
  );

  it("does not send a transcript the user discarded", async () => {
    const call = fakeCall({
      hears: [said("galat"), said("sahi")],
      reviews: [false, true],
      replies: [reply("ji")],
    });
    await runCallLoop(call.deps);
    expect(call.sent).toEqual(["sahi"]);
  });
});

// ─── Mute and hang-up ────────────────────────────────────────────────────────

describe("runCallLoop — mute and end", () => {
  it("pauses at the next turn once muted", async () => {
    const call = fakeCall({
      hears: [said("ek"), said("never heard")],
      replies: [reply("1")],
      muteAfterTurns: 1,
    });
    expect(await runCallLoop(call.deps)).toBe("paused");
    expect(call.spoken).toEqual(["1"]);
  });

  it("stops without speaking when the user hangs up mid-reply", async () => {
    let finish!: (r: CallReply) => void;
    const call = fakeCall({
      hears: [said("sawal")],
      replies: [() => new Promise<CallReply>((r) => (finish = r))],
    });
    const done = runCallLoop(call.deps);
    await vi.waitFor(() => expect(call.sent).toEqual(["sawal"]));
    call.hangUp();
    finish(reply("late answer"));
    expect(await done).toBe("ended");
    expect(call.spoken).toEqual([]);
  });
});

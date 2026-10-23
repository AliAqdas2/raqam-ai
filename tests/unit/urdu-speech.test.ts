import { describe, it, expect } from "vitest";
import { prepareUrduForSpeech, urduNumberWords } from "@/lib/ai/urdu-speech";
import { prepareTextForSpeech } from "@/lib/ai/tts";

describe("urduNumberWords", () => {
  it.each([
    [0, "صفر"],
    [7, "سات"],
    [42, "بیالیس"],
    [99, "ننانوے"],
    [100, "ایک سو"],
    [500, "پانچ سو"],
    [1250, "ایک ہزار دو سو پچاس"],
    [15000, "پندرہ ہزار"],
    [42000, "بیالیس ہزار"],
    [150000, "ایک لاکھ پچاس ہزار"],
    [2_500_000, "پچیس لاکھ"],
    [10_000_000, "ایک کروڑ"],
    [9_999_999, "ننانوے لاکھ ننانوے ہزار نو سو ننانوے"],
    [3_000_000_000, "تین ارب"],
  ])("%i → %s", (n, words) => {
    expect(urduNumberWords(n)).toBe(words);
  });

  it("reads very long numbers digit by digit", () => {
    expect(urduNumberWords(1_234_567_890_123)).toBe(
      "ایک دو تین چار پانچ چھ سات آٹھ نو صفر ایک دو تین",
    );
  });
});

describe("prepareUrduForSpeech", () => {
  it("reads grouped amounts, decimals and percentages as words", () => {
    expect(prepareUrduForSpeech("کل خرچ 42,000 روپے")).toBe("کل خرچ بیالیس ہزار روپے");
    expect(prepareUrduForSpeech("1,50,000 روپے")).toBe("ایک لاکھ پچاس ہزار روپے");
    expect(prepareUrduForSpeech("بچت 50.6% ہے")).toBe("بچت پچاس اعشاریہ چھ فیصد ہے");
    expect(prepareUrduForSpeech("۱۲۰۰ روپے")).toBe("ایک ہزار دو سو روپے");
  });

  it("leaves numbers glued to letters alone", () => {
    expect(prepareUrduForSpeech("5G فون")).toBe("5G فون");
  });

  it("respells common English finance words in Urdu script", () => {
    expect(prepareUrduForSpeech("آپ کا Budget اور Savings Rate")).toBe(
      "آپ کا بجٹ اور سیونگز ریٹ",
    );
    expect(prepareUrduForSpeech("JazzCash سے credit card کا bill")).toBe(
      "جاز کیش سے کریڈٹ کارڈ کا بل",
    );
  });

  it("does not respell inside longer English words", () => {
    expect(prepareUrduForSpeech("billion internet happy")).toBe("billion internet happy");
  });

  it("drops English glosses after an Urdu term", () => {
    expect(prepareUrduForSpeech("مہنگائی (Inflation) بڑھ رہی ہے")).toBe("مہنگائی بڑھ رہی ہے");
    expect(prepareUrduForSpeech("قوتِ خرید (purchasing power) کم")).toBe("قوتِ خرید کم");
  });
});

describe("prepareTextForSpeech — Urdu reply end to end", () => {
  it("turns a real analyze reply into natural spoken Urdu", () => {
    const reply =
      "اس مہینے آپ کے کل اخراجات **Rs. 42,000** ہوئے ہیں۔\n" +
      "- **کھانا (Food):** Rs. 18,000 (جو کہ کل خرچ کا 42.9% بنتا ہے)";
    expect(prepareTextForSpeech(reply, "ur")).toBe(
      "اس مہینے آپ کے کل اخراجات بیالیس ہزار روپے ہوئے ہیں۔\n" +
        "کھانا: اٹھارہ ہزار روپے (جو کہ کل خرچ کا بیالیس اعشاریہ نو فیصد بنتا ہے)",
    );
  });

  it("leaves English replies untouched", () => {
    expect(prepareTextForSpeech("Your budget is Rs. 20,000", "en")).toBe(
      "Your budget is 20,000 rupees",
    );
  });
});

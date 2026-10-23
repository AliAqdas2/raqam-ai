"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { Volume2, Square } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useVoicePrefs } from "@/hooks/useVoicePrefs";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import {
  useNotificationPrefs,
  type NotificationPrefKey,
} from "@/hooks/useNotificationPrefs";

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange?: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className="flex h-[26px] w-[46px] shrink-0 items-center rounded-full p-[3px] transition-colors"
      style={{
        background: on ? "#0F5132" : "#DCD6C8",
        justifyContent: on ? "flex-end" : "flex-start",
      }}
    >
      <span className="h-5 w-5 rounded-full bg-white transition-all" />
    </button>
  );
}

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { signOut } = useAuth();
  const { prefs, setPref } = useNotificationPrefs();
  const { prefs: voicePrefs, setPrefs: setVoicePrefs } = useVoicePrefs();
  const tts = useTextToSpeech();
  const previewing = tts.status !== "idle";

  const segment = (active: boolean) =>
    `min-h-11 flex-1 rounded-[10px] px-3 text-[14px] transition-colors ${
      active
        ? "bg-white font-semibold text-[#0F5132] shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
        : "text-[#4C5A52] hover:text-[#0F5132]"
    }`;

  const isUrdu = language === "ur";

  const notifToggles: Array<{ label: string; key: NotificationPrefKey }> = [
    { label: t("settings.notifBudget80"), key: "budget80" },
    { label: t("settings.notifBudget100"), key: "budget100" },
    { label: t("settings.notifBillReminder"), key: "billReminder" },
    { label: t("settings.notifUnusualSpend"), key: "unusualSpend" },
    { label: t("settings.notifMonthlySummary"), key: "monthlySummary" },
  ];

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-1 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <h1 className="text-[26px] font-bold leading-[1.7]">
          {t("settings.title")}
        </h1>
        <p className="text-[14px] text-[#6B7A70]">{t("settings.subtitle")}</p>
      </header>

      <div className="grid grid-cols-1 items-start gap-[18px] px-6 pb-12 pt-7 sm:px-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-[18px]">
          {/* Language & format */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-6">
            <h2 className="text-[19px] font-bold">
              {t("settings.languageSection")}
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setLanguage("ur")}
                className={`flex flex-1 flex-col gap-1 rounded-[12px] border p-4 text-right transition-colors ${
                  isUrdu
                    ? "border-[#0F5132] bg-[#F4F8F5]"
                    : "border-[#DCD6C8] bg-[#FBF9F4]"
                }`}
              >
                <span className="text-[17px] font-bold">
                  {t("settings.urduLabel")}
                </span>
                <span className="text-[13px] text-[#4C5A52]">
                  {t("settings.urduDesc")}
                </span>
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`flex flex-1 flex-col gap-1 rounded-[12px] border p-4 text-right transition-colors ${
                  !isUrdu
                    ? "border-[#0F5132] bg-[#F4F8F5]"
                    : "border-[#DCD6C8] bg-[#FBF9F4]"
                }`}
              >
                <span className="font-[var(--font-manrope)] text-[17px] font-bold">
                  {t("settings.englishLabel")}
                </span>
                <span className="font-[var(--font-manrope)] text-[13px] text-[#4C5A52]">
                  {t("settings.englishDesc")}
                </span>
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-[#F1EEE4] pt-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px]">{t("settings.urduDigits")}</span>
                <span className="text-[13px] text-[#8A9690]">
                  {t("settings.urduDigitsDesc")}
                </span>
              </div>
              <Toggle on={false} />
            </div>
            <div className="flex items-center justify-between border-t border-[#F1EEE4] pt-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px]">{t("settings.currency")}</span>
                <span className="text-[13px] text-[#8A9690]">
                  {t("settings.currencyDesc")}
                </span>
              </div>
              <span className="rounded-[9px] border border-[#DCD6C8] px-3.5 py-[9px] text-[14px]">
                PKR ▾
              </span>
            </div>
          </div>

          {/* Notifications */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-[19px] font-bold">
                {t("settings.notificationsTitle")}
              </h2>
              <p className="text-[14px] leading-[1.9] text-[#6B7A70]">
                {t("settings.notificationsDesc")}
              </p>
            </div>
            {notifToggles.map((item, i) => (
              <div
                key={item.key}
                className={`flex items-center justify-between ${i > 0 ? "border-t border-[#F1EEE4] pt-3.5" : ""}`}
              >
                <span className="text-[15px]">{item.label}</span>
                <Toggle
                  on={prefs[item.key]}
                  onChange={() => setPref(item.key, !prefs[item.key])}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-[18px]">
          {/* Voice — how Raqam talks back */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-[19px] font-bold">{t("settings.voiceTitle")}</h2>
              <p className="text-[14px] leading-[1.9] text-[#6B7A70]">
                {t("settings.voiceDesc")}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px]">{t("settings.voiceAutoSpeak")}</span>
                <span className="text-[13px] text-[#8A9690]">
                  {t("settings.voiceAutoSpeakDesc")}
                </span>
              </div>
              <Toggle
                on={voicePrefs.autoSpeak}
                label={t("settings.voiceAutoSpeak")}
                onChange={() => setVoicePrefs({ autoSpeak: !voicePrefs.autoSpeak })}
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-[#F1EEE4] pt-3.5">
              <span className="text-[15px]">{t("settings.voiceWhich")}</span>
              <div className="flex gap-1 rounded-[12px] bg-[#F1EEE4] p-1" role="radiogroup">
                {(["female", "male"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={voicePrefs.gender === g}
                    onClick={() => setVoicePrefs({ gender: g })}
                    className={segment(voicePrefs.gender === g)}
                  >
                    {g === "female" ? t("settings.voiceFemale") : t("settings.voiceMale")}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-[#F1EEE4] pt-3.5">
              <span className="text-[15px]">{t("settings.voiceSpeed")}</span>
              <div className="flex gap-1 rounded-[12px] bg-[#F1EEE4] p-1" role="radiogroup">
                {(
                  [
                    [-15, "settings.voiceSlower"],
                    [0, "settings.voiceNormal"],
                    [15, "settings.voiceFaster"],
                  ] as const
                ).map(([rate, key]) => (
                  <button
                    key={rate}
                    type="button"
                    role="radio"
                    aria-checked={voicePrefs.rate === rate}
                    onClick={() => setVoicePrefs({ rate })}
                    className={segment(voicePrefs.rate === rate)}
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                previewing
                  ? tts.stop()
                  : void tts.speak(t("settings.voicePreviewText"), {
                      preferredLanguage: language,
                    })
              }
              className="inline-flex min-h-11 w-fit items-center gap-2 rounded-[10px] border border-[#CBD9CF] bg-[#F4F8F5] px-4 text-[14px] text-[#0F5132] transition-colors hover:bg-[#E6EFE9]"
            >
              {previewing ? (
                <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden />
              )}
              {previewing ? t("tts.stop") : t("settings.voicePreview")}
            </button>
          </div>

          {/* AI permissions */}
          <div className="flex flex-col gap-3.5 rounded-2xl border border-[#E7E2D6] bg-white p-6">
            <h2 className="text-[19px] font-bold">
              {t("settings.aiPermissionsTitle")}
            </h2>
            <div className="flex flex-col gap-2.5 text-[14px] leading-[1.95] text-[#4C5A52]">
              {[
                { ok: true, text: t("settings.aiPerm1") },
                { ok: true, text: t("settings.aiPerm2") },
                { ok: true, text: t("settings.aiPerm3") },
                { ok: false, text: t("settings.aiPerm4") },
                { ok: false, text: t("settings.aiPerm5") },
                { ok: false, text: t("settings.aiPerm6") },
              ].map((p) => (
                <div key={p.text} className="flex gap-2.5">
                  <span style={{ color: p.ok ? "#0F5132" : "#B3261E" }}>
                    {p.ok ? "✓" : "✕"}
                  </span>
                  <span>{p.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data management */}
          <div className="flex flex-col gap-3.5 rounded-2xl border border-[#E7E2D6] bg-white p-6">
            <h2 className="text-[19px] font-bold">{t("settings.dataTitle")}</h2>
            <div className="flex flex-col gap-3 text-[15px]">
              {[
                {
                  label: t("settings.dataViewConversations"),
                  danger: false,
                },
                { label: t("settings.dataExport"), danger: false },
                { label: t("settings.dataSignOut"), danger: false },
                { label: t("settings.dataDelete"), danger: true },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={
                    btn.label === t("settings.dataSignOut")
                      ? () => signOut()
                      : undefined
                  }
                  className={`cursor-pointer rounded-[10px] border py-[13px] px-4 text-right ${
                    btn.danger
                      ? "border-[#E7D6D4] bg-white text-[#B3261E]"
                      : "border-[#E7E2D6] bg-[#FBF9F4]"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="flex flex-col gap-2 rounded-2xl border border-[#E7E2D6] bg-[#FBF9F4] p-[22px]">
            <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#8A9690]">
              {t("settings.disclaimerLabel")}
            </span>
            <p className="text-[14px] leading-[2] text-[#4C5A52]">
              {t("settings.disclaimerText")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

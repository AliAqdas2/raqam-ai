"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { useLanguage } from "@/components/LanguageProvider";
import { StatefulButton } from "@/components/ui/stateful-button";
import { StepHeader } from "@/components/onboarding/StepHeader";
import type { TranslationKey } from "@/lib/i18n/ur";

const inputCls =
  "h-12 w-full rounded-[12px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 font-[var(--font-manrope)] text-[16px] font-semibold text-[#14231B] placeholder:font-normal placeholder:text-[#9BA79F] focus-visible:border-[#0F5132] focus-visible:ring-2 focus-visible:ring-[#0F5132]/20 focus-visible:outline-none";

const BUDGET_SLUGS = ["food", "transportation", "utilities"] as const;
const TOTAL_STEPS = 3;

const STEP_PROGRESS_KEYS: TranslationKey[] = [
  "onboarding.step.1",
  "onboarding.step.2",
  "onboarding.step.3",
];

function firstOfMonth(): number {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).getTime();
}
function todayMidnight(): number {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
}
function parseAmount(raw: string): number {
  const n = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { t, dir } = useLanguage();
  const reduceMotion = useReducedMotion();
  const rtl = dir === "rtl";

  const user = useQuery(api.users.getCurrentUser);
  const categories = useQuery(api.categories.list);
  const currentBudget = useQuery(api.budgets.get, {});
  const createTransaction = useMutation(api.transactions.create);
  const createBudget = useMutation(api.budgets.create);
  const upsertBudgetCategory = useMutation(api.budgets.upsertCategory);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [step, setStep] = React.useState(0);
  const [income, setIncome] = React.useState("");
  const [limits, setLimits] = React.useState<Record<string, string>>({});
  const [navBusy, setNavBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user && user.onboardingCompletedAt != null) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const catId = React.useCallback(
    (slug: string) => categories?.find((c) => c.name === slug)?._id,
    [categories],
  );
  const catLabel = React.useCallback(
    (slug: string) => categories?.find((c) => c.name === slug)?.nameUr ?? slug,
    [categories],
  );

  const goDashboard = React.useCallback(async () => {
    setError(null);
    try {
      await completeOnboarding({});
      router.replace("/dashboard");
    } catch {
      setError(t("onboarding.error"));
      throw new Error("onboarding skip failed");
    }
  }, [completeOnboarding, router, t]);

  const skip = React.useCallback(async () => {
    setNavBusy(true);
    try {
      await goDashboard();
    } catch {
      setNavBusy(false);
    }
  }, [goDashboard]);

  const finishToAssistant = React.useCallback(async () => {
    setError(null);
    const draft = t("onboarding.s3.example1");
    try {
      await completeOnboarding({});
      router.replace(`/assistant?draft=${encodeURIComponent(draft)}`);
    } catch {
      setError(t("onboarding.error"));
      throw new Error("onboarding finish failed");
    }
  }, [completeOnboarding, router, t]);

  const submitIncome = React.useCallback(async () => {
    const amount = parseAmount(income);
    const salaryId = catId("salary");
    if (amount > 0 && salaryId) {
      setError(null);
      try {
        await createTransaction({
          type: "income",
          amount,
          categoryId: salaryId,
          date: todayMidnight(),
          description: "ماہانہ آمدنی",
          source: "manual",
        });
      } catch {
        setError(t("onboarding.error"));
        throw new Error("onboarding income failed");
      }
    }
  }, [income, catId, createTransaction, t]);

  const submitBudget = React.useCallback(async () => {
    const filled = BUDGET_SLUGS.map((slug) => ({
      slug,
      limit: parseAmount(limits[slug] ?? ""),
    })).filter((r) => r.limit > 0);

    if (filled.length > 0) {
      setError(null);
      try {
        let budgetId = currentBudget?._id as string | undefined;
        if (!budgetId) {
          budgetId = (await createBudget({ month: firstOfMonth() })) as string;
        }
        for (const { slug, limit } of filled) {
          const cid = catId(slug);
          if (cid) {
            await upsertBudgetCategory({
              budgetId: budgetId as never,
              categoryId: cid,
              limit,
            });
          }
        }
      } catch {
        setError(t("onboarding.error"));
        throw new Error("onboarding budget failed");
      }
    }
  }, [limits, currentBudget, createBudget, upsertBudgetCategory, catId, t]);

  const slideX = reduceMotion ? 0 : rtl ? 28 : -28;

  if (user === undefined) {
    return (
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F5132] border-t-transparent" />
    );
  }

  return (
    <div dir={dir} className="flex w-full max-w-[460px] flex-col">
      <div className="mb-5 flex flex-col items-center gap-2 text-center">
        <div className="grid h-[42px] w-[42px] place-items-center rounded-[12px] bg-[#E8B931] pb-1 font-[var(--font-noto-nastaliq-urdu)] text-[21px] font-bold text-[#0B3B26]">
          ر
        </div>
        <p className="font-[var(--font-noto-nastaliq-urdu)] text-[17px] leading-[1.9] text-[#14231B]">
          {t("onboarding.welcome")}
        </p>
      </div>

      <StepHeader
        step={step}
        totalSteps={TOTAL_STEPS}
        progressLabel={t(STEP_PROGRESS_KEYS[step]!)}
      />

      <div className="overflow-hidden rounded-2xl border border-[#E7E2D6] bg-white shadow-sm">
        <div className="min-h-[280px] px-6 py-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={
                reduceMotion ? false : { opacity: 0, x: slideX }
              }
              animate={{ opacity: 1, x: 0 }}
              exit={
                reduceMotion
                  ? undefined
                  : { opacity: 0, x: rtl ? -28 : 28 }
              }
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {step === 0 && (
                <StepShell
                  title={t("onboarding.s1.title")}
                  desc={t("onboarding.s1.desc")}
                >
                  <label className="mb-1.5 block text-[13px] font-medium text-[#4C5A52]">
                    {t("onboarding.s1.label")}
                  </label>
                  <input
                    inputMode="numeric"
                    autoFocus
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder={t("onboarding.s1.placeholder")}
                    className={inputCls}
                    aria-describedby="onboarding-s1-hint"
                  />
                  <p
                    id="onboarding-s1-hint"
                    className="mt-2 text-[13px] leading-[1.8] text-[#6B7A70]"
                  >
                    {t("onboarding.s1.hint")}
                  </p>
                </StepShell>
              )}

              {step === 1 && (
                <StepShell
                  title={t("onboarding.s2.title")}
                  desc={t("onboarding.s2.desc")}
                >
                  <div className="flex flex-col gap-3">
                    {BUDGET_SLUGS.map((slug) => (
                      <div key={slug} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-[14px] text-[#4C5A52]">
                          {catLabel(slug)}
                        </span>
                        <input
                          inputMode="numeric"
                          value={limits[slug] ?? ""}
                          onChange={(e) =>
                            setLimits((p) => ({
                              ...p,
                              [slug]: e.target.value,
                            }))
                          }
                          placeholder={t("onboarding.s2.placeholder")}
                          className={`${inputCls} h-11 text-[15px]`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[13px] leading-[1.8] text-[#6B7A70]">
                    {t("onboarding.s2.hint")}
                  </p>
                </StepShell>
              )}

              {step === 2 && (
                <StepShell
                  title={t("onboarding.s3.title")}
                  desc={t("onboarding.s3.desc")}
                >
                  <ul className="flex flex-col gap-2">
                    {[
                      t("onboarding.s3.example1"),
                      t("onboarding.s3.example2"),
                      t("onboarding.s3.example3"),
                    ].map((ex, i) => (
                      <li
                        key={ex}
                        className={
                          i === 0
                            ? "rounded-[12px] border border-[#0F5132]/35 bg-[#F4F8F5] px-3.5 py-3 font-reading text-[14px] leading-[1.9] text-[#0F5132]"
                            : "rounded-[12px] border border-[#E6EFE9] bg-[#FBF9F4] px-3.5 py-3 font-reading text-[14px] leading-[1.9] text-[#4C5A52]"
                        }
                      >
                        {ex}
                        {i === 0 ? (
                          <span className="mt-1 block text-[12px] font-normal text-[#6B7A70]">
                            {t("onboarding.s3.chipHint")}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </StepShell>
              )}
            </motion.div>
          </AnimatePresence>

          {error ? (
            <p className="mt-3 text-[13px] text-[#B3261E]" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        {/* Bottom bar — one primary CTA; secondary is text-only */}
        <div className="flex items-center justify-between gap-3 border-t border-[#E7E2D6] bg-[#FBF9F4] px-5 py-4">
          {step === 0 ? (
            <button
              type="button"
              disabled={navBusy}
              onClick={() => void skip()}
              className="min-h-12 px-2 text-[14px] font-medium text-[#6B7A70] underline-offset-4 hover:underline disabled:opacity-50"
            >
              {t("onboarding.skip")}
            </button>
          ) : (
            <button
              type="button"
              disabled={navBusy}
              onClick={() => setStep(step - 1)}
              className="min-h-12 px-2 text-[14px] font-medium text-[#6B7A70] underline-offset-4 hover:underline disabled:opacity-50"
            >
              {t("onboarding.back")}
            </button>
          )}

          {step === 0 && (
            <StatefulButton
              onClick={submitIncome}
              loadingLabel={t("onboarding.nextLoading")}
              successLabel={t("onboarding.nextDone")}
              onSuccessSettle={() => setStep(1)}
              className="min-w-[8.5rem] px-6 text-[15px]"
            >
              {t("onboarding.next")}
            </StatefulButton>
          )}
          {step === 1 && (
            <StatefulButton
              onClick={submitBudget}
              loadingLabel={t("onboarding.nextLoading")}
              successLabel={t("onboarding.nextDone")}
              onSuccessSettle={() => setStep(2)}
              className="min-w-[8.5rem] px-6 text-[15px]"
            >
              {t("onboarding.next")}
            </StatefulButton>
          )}
          {step === 2 && (
            <StatefulButton
              onClick={finishToAssistant}
              loadingLabel={t("onboarding.finishLoading")}
              successLabel={t("onboarding.finishDone")}
              className="min-w-[8.5rem] px-6 text-[15px]"
            >
              {t("onboarding.finish")}
            </StatefulButton>
          )}
        </div>
      </div>
    </div>
  );
}

function StepShell({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="mb-1.5 font-[var(--font-noto-nastaliq-urdu)] text-[19px] font-bold leading-[1.8] text-[#14231B]">
        {title}
      </h1>
      <p className="mb-5 text-[13.5px] leading-[1.9] text-[#6B7A70]">{desc}</p>
      {children}
    </div>
  );
}

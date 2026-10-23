"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { useGoals } from "@/hooks/useGoals";
import { useBudgets } from "@/hooks/useBudgets";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useLanguage } from "@/components/LanguageProvider";
import {
  EmptyState,
  StatCardSkeleton,
  CardSkeleton,
  ChartSkeleton,
} from "@/components/shared/DataStates";
import {
  TransactionFormDialog,
  type TransactionFormData,
} from "@/components/transactions/TransactionFormDialog";
import { ProactiveAlerts } from "@/components/dashboard/ProactiveAlerts";
import { HeroStat } from "@/components/dashboard/HeroStat";
import { AskRaqam } from "@/components/dashboard/AskRaqam";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { useMonthlyTrend } from "@/hooks/useMonthlyTrend";
import { BudgetProgressBar } from "@/components/budgets/BudgetProgressBar";
import { formatPKR } from "@/lib/i18n/format";

function pkr(n: string | number) {
  return typeof n === "number" ? formatPKR(n) : `Rs. ${n}`;
}

/**
 * The dashboard paints in stages: the header and proactive alerts render
 * immediately, then each region fills in as its own Convex query resolves
 * (rather than blocking the whole page on the slowest of the three). Phase 15.
 */
export default function DashboardPage() {
  const { summary, loading: summaryLoading } = useFinancialSummary();
  const { goals, loading: goalsLoading } = useGoals();
  const { budgetCategories, loading: budgetLoading } = useBudgets();
  const { createTransaction } = useTransactions();
  const { categories } = useCategories();
  const { trend, loading: trendLoading } = useMonthlyTrend(6);
  const { t, language } = useLanguage();

  const [formOpen, setFormOpen] = React.useState(false);

  const openAddTransaction = React.useCallback(() => {
    setFormOpen(true);
  }, []);

  const handleFormSubmit = React.useCallback(
    async (data: TransactionFormData) => {
      const amount = parseFloat(data.amount);
      const dateMs = new Date(data.date).getTime();
      await createTransaction({
        type: data.type,
        amount,
        categoryId: data.categoryId,
        date: dateMs,
        description: data.description,
        notes: data.notes,
        source: "manual",
      });
    },
    [createTransaction],
  );

  const categorySpending = summary?.categoryBreakdown ?? [];
  const recentTransactions = summary?.recentTransactions ?? [];
  const upcomingBills = summary?.upcomingBills ?? [];

  const anyLoading = summaryLoading || goalsLoading || budgetLoading;
  const isEmpty =
    !anyLoading &&
    !!summary &&
    summary.totalIncome === 0 &&
    summary.totalExpenses === 0 &&
    goals.length === 0 &&
    budgetCategories.length === 0;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-[22px] px-4 pb-12 pt-5 sm:px-10 sm:pt-7">
        {/* AI-first: the assistant is the front door to the dashboard */}
        <AskRaqam
          summary={summary}
          budgets={budgetCategories}
          onAddTransaction={openAddTransaction}
        />

        <ProactiveAlerts />

        {isEmpty ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={t("dashboard.emptyTitle")}
            description={t("dashboard.emptyDesc")}
            actionLabel={t("dashboard.newTransaction")}
            onAction={openAddTransaction}
          />
        ) : (
          <>
            {/* Stat cards — hero savings + income/expense (plan 04) */}
            {summaryLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <HeroStat
                  variant="hero"
                  value={summary?.netSavings ?? 0}
                  label={t("dashboard.savingsThisMonth")}
                  hint={
                    (summary?.netSavings ?? 0) > 0
                      ? t("dashboard.hintSavingsPositive")
                      : (summary?.netSavings ?? 0) < 0
                        ? t("dashboard.hintSavingsNegative")
                        : t("dashboard.hintSavingsZero")
                  }
                />
                <HeroStat
                  value={summary?.totalIncome ?? 0}
                  label={t("dashboard.totalIncome")}
                  hint={t("dashboard.hintIncome")}
                />
                <HeroStat
                  value={summary?.totalExpenses ?? 0}
                  label={t("dashboard.totalExpenses")}
                  hint={t("dashboard.hintExpenses")}
                />
                {/* Demoted savings rate — only when there is income; plain language */}
                {(summary?.totalIncome ?? 0) > 0 ? (
                  <div className="flex min-w-0 flex-col justify-center gap-1 rounded-2xl border border-dashed border-[#CBD9CF] bg-[#F4F8F5] px-5 py-4 sm:col-span-2">
                    <span className="text-[12px] text-[#6B7A70]">
                      {t("dashboard.savingsRate")}
                    </span>
                    <p className="text-[15px] leading-[1.8] text-[#14231B]">
                      {t("dashboard.savingsRatePlainPrefix")}{" "}
                      <span className="font-[var(--font-manrope)] font-bold text-[#0F5132]">
                        {Math.max(
                          0,
                          Math.round(summary?.savingsRate ?? 0),
                        )}
                      </span>{" "}
                      {t("dashboard.savingsRatePlainSuffix")}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Category spending + Trend */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              {summaryLoading || categorySpending.length === 0 ? (
                <ChartSkeleton />
              ) : (
                <div className="flex flex-col gap-[18px] rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[18px] font-bold">
                      {t("dashboard.categorySpending")}
                    </h2>
                    <span className="font-[var(--font-manrope)] text-[12px] text-[#6B7A70]">
                      {pkr(summary?.totalExpenses ?? 0)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3.5">
                    {categorySpending.map((cat) => (
                      <div key={cat.categoryId} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[14px]">
                          <span>{cat.nameUr}</span>
                          <span className="font-[var(--font-manrope)] text-[#4C5A52]">
                            {pkr(cat.amount)}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-[#EDEAE0]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${cat.percentage}%`,
                              background: cat.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trend + Bills */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
                  <h2 className="text-[18px] font-bold">
                    {t("dashboard.sixMonthTrend")}
                  </h2>
                  {trendLoading ? (
                    <div className="h-[150px] animate-pulse rounded-[12px] bg-[#F1EEE4]" />
                  ) : (
                    <TrendChart points={trend} />
                  )}
                </div>

                {!summaryLoading && upcomingBills.length > 0 && (
                  <div className="flex flex-col gap-3.5 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
                    <h2 className="text-[18px] font-bold">
                      {t("dashboard.upcomingBills")}
                    </h2>
                    {upcomingBills.map((bill, i) => (
                      <div
                        key={bill.label}
                        className={`flex justify-between text-[14px] ${i < upcomingBills.length - 1 ? "border-b border-[#F1EEE4] pb-2.5" : ""}`}
                      >
                        <span>{bill.label}</span>
                        <span className="font-[var(--font-manrope)] font-semibold">
                          {pkr(bill.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent transactions + Budget util + Goals */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {summaryLoading ? (
                <ChartSkeleton />
              ) : recentTransactions.length > 0 ? (
                <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[18px] font-bold">
                      {t("dashboard.recentTransactions")}
                    </h2>
                    <Link
                      href="/transactions"
                      className="text-[14px] text-[#0F5132] hover:underline"
                    >
                      {t("dashboard.viewAll")}
                    </Link>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3.5 border-b border-[#F4F1E8] py-[11px] last:border-0"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#E6EFE9] text-[15px]">
                          {tx.icon}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="text-[15px]">{tx.label}</span>
                          <span className="text-[12px] text-[#8A9690]">
                            {tx.meta}
                          </span>
                        </div>
                        <span
                          className={`font-[var(--font-manrope)] text-[15px] font-semibold ${tx.type === "income" ? "text-[#0F5132]" : ""}`}
                        >
                          {tx.type === "income" ? "+" : "−"} {pkr(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
                  <h2 className="text-[18px] font-bold">
                    {t("dashboard.recentTransactions")}
                  </h2>
                  <EmptyState
                    icon={ArrowLeftRight}
                    title={t("dashboard.noTransactions")}
                    description={t("dashboard.noTransactionsDesc")}
                    actionLabel={t("dashboard.noTransactionsAction")}
                    onAction={openAddTransaction}
                  />
                </div>
              )}

              {/* Budget utilization + Savings goals */}
              <div className="flex flex-col gap-4">
                {budgetLoading ? (
                  <CardSkeleton />
                ) : budgetCategories.length > 0 ? (
                  <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[18px] font-bold">
                        {t("dashboard.budgetUtilization")}
                      </h2>
                      <Link
                        href="/budgets"
                        className="text-[14px] text-[#0F5132] hover:underline"
                      >
                        {t("dashboard.detail")}
                      </Link>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {budgetCategories.map((b) => (
                        <BudgetProgressBar
                          key={b.id}
                          compact
                          name={
                            language === "ur"
                              ? b.categoryNameUr
                              : b.categoryName
                          }
                          icon={b.categoryIcon}
                          spent={b.spent}
                          limit={b.limit}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {goalsLoading ? (
                  <CardSkeleton />
                ) : goals.length > 0 ? (
                  <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
                    <h2 className="text-[18px] font-bold">
                      {t("dashboard.savingsGoals")}
                    </h2>
                    {goals.map((g) => {
                      const pct =
                        g.targetAmount > 0
                          ? Math.round((g.currentAmount / g.targetAmount) * 100)
                          : 0;
                      return (
                        <div key={g.id} className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-[14px]">
                            <span>{g.nameUr ?? g.name}</span>
                            <span className="font-[var(--font-manrope)] text-[#4C5A52]">
                              {pkr(g.currentAmount)} / {pkr(g.targetAmount)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#EDEAE0]">
                            <div
                              className="h-full rounded-full bg-[#0F5132]"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

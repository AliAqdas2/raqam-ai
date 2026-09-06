"use client";

import * as React from "react";
import Link from "next/link";
import {
  TriangleAlert,
  CalendarClock,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/shared/Toast";
import {
  useProactiveAlerts,
  type BillReminder,
  type BudgetAlert,
  type UnusualAlert,
} from "@/hooks/useProactiveAlerts";
import { useMonthlySummary } from "@/hooks/useMonthlySummary";
import { useRecurring } from "@/hooks/useRecurring";
import {
  StickyBanner,
  StickyBannerSlot,
  type StickyBannerTone,
} from "@/components/ui/sticky-banner";
import { formatPKR } from "@/lib/i18n/format";

// Priority: budget 100% → budget 80% → unusual → bill → monthly summary
// Show one at a time; "اگلی خبر" cycles the rest.

type QueuedItem =
  | {
      kind: "budget";
      priority: number;
      key: string;
      alert: BudgetAlert;
    }
  | {
      kind: "unusual";
      priority: number;
      key: string;
      alert: UnusualAlert;
    }
  | {
      kind: "bill";
      priority: number;
      key: string;
      alert: BillReminder;
    }
  | {
      kind: "summary";
      priority: number;
      key: string;
    };

const ctaClass =
  "inline-flex min-h-11 items-center justify-center rounded-[12px] bg-[#0F5132] px-4 text-[14px] font-medium text-white outline-none transition-colors hover:bg-[#14231B] focus-visible:ring-2 focus-visible:ring-[#E8B931] focus-visible:ring-offset-2";

const ghostCtaClass =
  "inline-flex min-h-11 items-center justify-center rounded-[12px] border border-[#DCD6C8] bg-white/70 px-4 text-[14px] font-medium text-[#4C5A52] outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-[#0F5132] focus-visible:ring-offset-2";

export function ProactiveAlerts() {
  const { t, language } = useLanguage();
  const { addToast } = useToast();
  const { budgetAlerts, unusualAlerts, billReminders, dismiss, loading } =
    useProactiveAlerts();
  const { show: showSummary, summary, dismiss: dismissSummary } =
    useMonthlySummary();
  const { markPaid } = useRecurring();

  const [hiddenKeys, setHiddenKeys] = React.useState<Set<string>>(new Set());
  const [summaryHidden, setSummaryHidden] = React.useState(false);
  const [cursor, setCursor] = React.useState(0);
  const [logExpense, setLogExpense] = React.useState(true);

  const hide = React.useCallback(
    (alertKey: string, periodKey: string) => {
      setHiddenKeys((prev) => new Set(prev).add(alertKey));
      dismiss(alertKey, periodKey).catch(() => {
        setHiddenKeys((prev) => {
          const next = new Set(prev);
          next.delete(alertKey);
          return next;
        });
      });
    },
    [dismiss],
  );

  const queue = React.useMemo((): QueuedItem[] => {
    const items: QueuedItem[] = [];

    for (const a of budgetAlerts) {
      if (hiddenKeys.has(a.alertKey)) continue;
      items.push({
        kind: "budget",
        // over (100%) before warning (80%)
        priority: a.severity === "over" ? 0 : 1,
        key: a.alertKey,
        alert: a,
      });
    }
    for (const a of unusualAlerts) {
      if (hiddenKeys.has(a.alertKey)) continue;
      items.push({
        kind: "unusual",
        priority: 2,
        key: a.alertKey,
        alert: a,
      });
    }
    for (const a of billReminders) {
      if (hiddenKeys.has(a.alertKey)) continue;
      items.push({
        kind: "bill",
        priority: a.overdue ? 2.5 : 3,
        key: a.alertKey,
        alert: a,
      });
    }
    if (showSummary && summary && !summaryHidden) {
      items.push({ kind: "summary", priority: 4, key: "monthly-summary" });
    }

    return items.sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key));
  }, [
    budgetAlerts,
    unusualAlerts,
    billReminders,
    hiddenKeys,
    showSummary,
    summary,
    summaryHidden,
  ]);

  React.useEffect(() => {
    if (cursor >= queue.length) setCursor(0);
  }, [cursor, queue.length]);

  if (loading || queue.length === 0) return null;

  const current = queue[Math.min(cursor, queue.length - 1)]!;
  const hasMore = queue.length > 1;
  const remaining = queue.length - 1;

  const goNext = () => {
    setCursor((c) => (c + 1) % queue.length);
  };

  const catName = (ur: string, en: string) =>
    language === "ur" ? ur : en;

  let tone: StickyBannerTone = "warn";
  let icon: React.ReactNode = <TriangleAlert className="h-5 w-5" />;
  let title = "";
  let body = "";
  let primaryAction: React.ReactNode = null;
  let secondaryAction: React.ReactNode = null;
  let onDismiss = () => {};

  if (current.kind === "budget") {
    const a = current.alert;
    const over = a.severity === "over";
    tone = over ? "danger" : "warn";
    icon = <TriangleAlert className="h-5 w-5" />;
    title = over
      ? t("proactive.budgetOverTitle")
      : t("proactive.budgetWarnTitle");
    body = t("proactive.budgetBody")
      .replace("{category}", catName(a.categoryNameUr, a.categoryName))
      .replace("{pct}", String(a.pct))
      .replace("{spent}", formatPKR(a.spent))
      .replace("{limit}", formatPKR(a.limit));
    primaryAction = (
      <Link href="/budgets" className={ctaClass}>
        {t("proactive.viewBudget")}
      </Link>
    );
    onDismiss = () => hide(a.alertKey, a.periodKey);
  } else if (current.kind === "unusual") {
    const a = current.alert;
    tone = "info";
    icon = <TrendingUp className="h-5 w-5" />;
    title = t("proactive.unusualTitle");
    body = t("proactive.unusualBody")
      .replace("{category}", catName(a.categoryNameUr, a.categoryName))
      .replace("{pct}", String(a.deviationPercent))
      .replace("{amount}", formatPKR(a.currentSpend));
    primaryAction = (
      <Link href="/transactions" className={ctaClass}>
        {t("proactive.viewTxns")}
      </Link>
    );
    onDismiss = () => hide(a.alertKey, a.periodKey);
  } else if (current.kind === "bill") {
    const bill = current.alert;
    tone = bill.overdue ? "danger" : "warn";
    icon = <CalendarClock className="h-5 w-5" />;
    title = t("proactive.billDueTitle");
    const due =
      bill.overdue
        ? t("proactive.billOverdue").replace(
            "{days}",
            String(Math.max(1, -bill.daysUntilDue)),
          )
        : bill.daysUntilDue <= 0
          ? t("proactive.billDueToday")
          : bill.daysUntilDue === 1
            ? t("proactive.billDueTomorrow")
            : t("proactive.billDueInDays").replace(
                "{days}",
                String(bill.daysUntilDue),
              );
    body = t("proactive.billBody")
      .replace("{description}", bill.description)
      .replace("{amount}", formatPKR(bill.amount))
      .replace("{due}", due);
    primaryAction = (
      <button
        type="button"
        className={ctaClass}
        onClick={async () => {
          hide(bill.alertKey, bill.periodKey);
          try {
            await markPaid(bill.recurringId, logExpense);
            addToast({ type: "success", title: t("recurring.toast.paid") });
          } catch {
            addToast({ type: "error", title: t("recurring.toast.error") });
          }
        }}
      >
        {t("proactive.billMarkPaid")}
      </button>
    );
    secondaryAction = (
      <>
        <Link href="/budgets" className={ghostCtaClass}>
          {t("proactive.viewBudget")}
        </Link>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 px-1 text-[13px] text-[#4C5A52]">
          <input
            type="checkbox"
            checked={logExpense}
            onChange={(e) => setLogExpense(e.target.checked)}
            className="h-4 w-4 accent-[#0F5132]"
          />
          {t("proactive.billLogExpense")}
        </label>
      </>
    );
    onDismiss = () => hide(bill.alertKey, bill.periodKey);
  } else {
    // summary
    tone = "gold";
    icon = <Sparkles className="h-5 w-5" />;
    title = t("summary.title");
    const monthLabel = summary
      ? new Date(summary.month).toLocaleDateString(
          language === "ur" ? "ur-PK" : "en-PK",
          { month: "long", year: "numeric" },
        )
      : "";
    body = t("proactive.summaryBody")
      .replace("{month}", monthLabel)
      .replace("{net}", formatPKR(summary?.net ?? 0))
      .replace("{rate}", String(summary?.savingsRate ?? 0));
    primaryAction = null;
    secondaryAction = (
      <span className="text-[13px] text-[#6B7A70]">
        {t("summary.income")}: {formatPKR(summary?.income ?? 0)} ·{" "}
        {t("summary.expenses")}: {formatPKR(summary?.expenses ?? 0)}
      </span>
    );
    onDismiss = () => {
      setSummaryHidden(true);
      dismissSummary().catch(() => setSummaryHidden(false));
    };
  }

  return (
    <section aria-label={t("proactive.regionLabel")} className="flex flex-col gap-2">
      <StickyBannerSlot>
        <StickyBanner
          key={current.key}
          id={current.key}
          tone={tone}
          icon={icon}
          title={title}
          body={body}
          primaryAction={primaryAction}
          secondaryAction={secondaryAction}
          dismissLabel={
            current.kind === "summary"
              ? t("summary.dismiss")
              : t("proactive.dismiss")
          }
          onDismiss={onDismiss}
        />
      </StickyBannerSlot>

      {hasMore ? (
        <div className="flex items-center justify-between gap-3 px-1">
          <span className="text-[13px] text-[#6B7A70]">
            {t("proactive.moreCount").replace("{n}", String(remaining))}
          </span>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex min-h-11 items-center justify-center rounded-[12px] px-3 text-[14px] font-medium text-[#0F5132] underline-offset-4 hover:underline"
          >
            {t("proactive.nextAlert")}
          </button>
        </div>
      ) : null}
    </section>
  );
}

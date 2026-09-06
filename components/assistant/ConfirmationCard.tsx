"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n/ur";
import type { ActionType } from "@/lib/ai/action-schemas";
import { ACTION_TYPE_LABELS } from "@/lib/ai/action-schemas";
import { formatPKR } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { StatefulButton } from "@/components/ui/stateful-button";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface PendingAction {
  id: string;
  actionType: ActionType;
  parameters: string; // JSON-encoded
  userFacingMessage: string;
  status: "pending" | "confirmed" | "rejected" | "executed" | "failed";
  resultMessage?: string;
}

interface ConfirmationCardProps {
  action: PendingAction;
  onConfirm: (actionId: string) => Promise<void>;
  onReject: (actionId: string) => Promise<void>;
  disabled?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function parseParams(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function heroAmount(
  actionType: ActionType,
  params: Record<string, unknown>,
): number | null {
  if (actionType === "createTransaction" && typeof params.amount === "number") {
    return params.amount;
  }
  if (actionType === "deleteTransaction" && typeof params.amount === "number") {
    return params.amount;
  }
  if (
    actionType === "createSavingsGoal" &&
    typeof params.targetAmount === "number"
  ) {
    return params.targetAmount;
  }
  return null;
}

function useIsMobile(breakpoint = 640): boolean {
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpoint]);
  return mobile;
}

// ─── Component ──────────────────────────────────────────────────────────────────

/**
 * ConfirmationCard — Phase 9 confirmation gate.
 * Amount-first hierarchy; no mutation without explicit Confirm.
 */
export function ConfirmationCard({
  action,
  onConfirm,
  onReject,
  disabled = false,
}: ConfirmationCardProps) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const [confirming, setConfirming] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const label =
    ACTION_TYPE_LABELS[action.actionType]?.[language] ?? action.actionType;
  const params = React.useMemo(
    () => parseParams(action.parameters),
    [action.parameters],
  );
  const amount = heroAmount(action.actionType, params);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm(action.id);
    } catch {
      setConfirming(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await onReject(action.id);
    } catch {
      setRejecting(false);
    }
  };

  if (action.status !== "pending") {
    return <ResolvedCard action={action} language={language} t={t} />;
  }

  const busy = disabled || confirming || rejecting;
  const body = (
    <GateBody
      t={t}
      language={language}
      label={label}
      message={action.userFacingMessage}
      actionType={action.actionType}
      params={params}
      amount={amount}
      confirming={confirming}
      rejecting={rejecting}
      busy={busy}
      onConfirm={handleConfirm}
      onReject={handleReject}
      stackedButtons
    />
  );

  const enter = reduceMotion
    ? undefined
    : { initial: { opacity: 0, y: 10, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 } };

  // Mobile: bottom sheet over dimmed chat (amount still hero)
  if (isMobile && mounted) {
    return (
      <>
        {/* In-stream anchor so scroll position / history stay clear */}
        <div className="mt-2 w-full max-w-[78%] self-end rounded-[14px] border border-[#E8B931]/50 bg-[#FDF8EC] px-4 py-3 text-[13px] text-[#6B5B2E]">
          <span className="font-medium">{t("assistant.actionNeedsConfirm")}</span>
          {amount != null ? (
            <span className="ms-2 font-[var(--font-manrope)] font-bold">
              {formatPKR(amount)}
            </span>
          ) : null}
        </div>
        {createPortal(
          <div className="fixed inset-0 z-[70] lg:hidden" role="presentation">
            <div
              className="absolute inset-0 bg-[#14231B]/35 backdrop-blur-[2px]"
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t("assistant.actionNeedsConfirm")}
              className="absolute inset-x-0 bottom-0 max-h-[min(85vh,36rem)] overflow-y-auto rounded-t-[20px] border border-[#E7E2D6] bg-[#FDF8EC] shadow-[0_-12px_40px_rgba(20,35,27,0.18)] pb-[max(1rem,env(safe-area-inset-bottom))]"
              {...(enter ?? {})}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex justify-center pt-3" aria-hidden>
                <span className="h-1 w-10 rounded-full bg-[#DCD6C8]" />
              </div>
              <div className="px-5 pb-4 pt-2">{body}</div>
            </motion.div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  // Desktop / tablet: in-stream card
  return (
    <motion.div
      className="mt-2 flex w-full max-w-[min(100%,28rem)] flex-col gap-2 self-end sm:max-w-[78%]"
      {...(enter ?? {})}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="rounded-[16px_16px_4px_16px] border-2 border-[#E8B931] bg-[#FDF8EC] px-5 py-4">
        {body}
      </div>
    </motion.div>
  );
}

// ─── Gate body ──────────────────────────────────────────────────────────────────

function GateBody({
  t,
  language,
  label,
  message,
  actionType,
  params,
  amount,
  confirming,
  rejecting,
  busy,
  onConfirm,
  onReject,
  stackedButtons,
}: {
  t: (key: TranslationKey) => string;
  language: "ur" | "en";
  label: string;
  message: string;
  actionType: ActionType;
  params: Record<string, unknown>;
  amount: number | null;
  confirming: boolean;
  rejecting: boolean;
  busy: boolean;
  onConfirm: () => void | Promise<void>;
  onReject: () => void | Promise<void>;
  stackedButtons: boolean;
}) {
  const typeLabel =
    params.type === "income"
      ? t("transactions.income")
      : params.type === "expense"
        ? t("transactions.expense")
        : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Status — Urdu, not English tracking */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#FDF3D8] px-3 py-1 text-[13px] font-semibold text-[#6B5B2E]">
          {t("assistant.actionNeedsConfirm")}
        </span>
        <span className="text-[13px] text-[#8A6B2E]">{label}</span>
      </div>

      {/* Amount hero */}
      {amount != null ? (
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-[#6B5B2E]">
            {t("assistant.actionAmount")}
          </span>
          <p className="font-[var(--font-manrope)] text-[clamp(32px,8vw,44px)] font-extrabold leading-none tracking-[-.02em] text-[#0F5132]">
            {formatPKR(amount)}
          </p>
          {typeLabel ? (
            <span
              className={cn(
                "mt-1 w-fit rounded-full px-2.5 py-0.5 text-[13px] font-medium",
                params.type === "income"
                  ? "bg-[#E6EFE9] text-[#0F5132]"
                  : "bg-[#F6E6E4] text-[#8A2E26]",
              )}
            >
              {typeLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Detail rows — not tiny technical chips */}
      <DetailRows
        t={t}
        language={language}
        actionType={actionType}
        params={params}
      />

      {/* AI message in reading font */}
      {message ? (
        <p className="text-[15px] font-reading leading-[2] text-[#4C5A52]">
          {message}
        </p>
      ) : null}

      {/* Confirm on top when stacked (mobile); equal full width */}
      <div
        className={cn(
          "flex gap-2.5",
          stackedButtons ? "flex-col" : "flex-row flex-wrap",
        )}
      >
        <StatefulButton
          type="button"
          status={confirming ? "loading" : "idle"}
          loadingLabel={t("assistant.actionConfirming")}
          successLabel={t("assistant.actionConfirmed")}
          disabled={busy && !confirming}
          onClick={onConfirm}
          className="w-full flex-1"
        >
          {t("assistant.actionConfirm")}
        </StatefulButton>
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className="inline-flex min-h-12 w-full flex-1 items-center justify-center rounded-[12px] border border-[#DCD6C8] bg-white px-5 text-[15px] font-medium text-[#6B7A70] outline-none transition-colors hover:bg-[#F7F4EC] focus-visible:ring-2 focus-visible:ring-[#0F5132] focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {rejecting
            ? t("assistant.actionRejecting")
            : t("assistant.actionReject")}
        </button>
      </div>
    </div>
  );
}

function DetailRows({
  t,
  language,
  actionType,
  params,
}: {
  t: (key: TranslationKey) => string;
  language: "ur" | "en";
  actionType: ActionType;
  params: Record<string, unknown>;
}) {
  const rows: { label: string; value: string }[] = [];

  if (actionType === "createTransaction") {
    if (params.categoryName) {
      rows.push({
        label: t("assistant.actionCategory"),
        value: String(params.categoryName),
      });
    }
    if (params.date) {
      rows.push({
        label: t("assistant.actionDate"),
        value: String(params.date),
      });
    }
    if (params.description) {
      rows.push({
        label: t("assistant.actionDescription"),
        value: String(params.description),
      });
    }
  }

  if (actionType === "deleteTransaction") {
    if (params.description) {
      rows.push({
        label: t("assistant.actionDescription"),
        value: String(params.description),
      });
    }
  }

  if (actionType === "createSavingsGoal") {
    if (params.name) {
      rows.push({
        label: t("assistant.actionGoalName"),
        value: String(params.name),
      });
    }
    if (params.targetDate) {
      rows.push({
        label: t("assistant.actionDate"),
        value: String(params.targetDate),
      });
    }
  }

  if (rows.length === 0) return null;

  return (
    <dl className="flex flex-col gap-2 rounded-[12px] border border-[#E8CE86]/60 bg-white/70 px-3.5 py-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-3 text-[14px] leading-[1.7]"
        >
          <dt className="shrink-0 text-[#8A9690]">{row.label}</dt>
          <dd
            className={cn(
              "min-w-0 text-end font-medium text-[#14231B]",
              language === "ur" ? "font-reading" : "",
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ─── Resolved receipt ───────────────────────────────────────────────────────────

function ResolvedCard({
  action,
  language,
  t,
}: {
  action: PendingAction;
  language: string;
  t: (key: TranslationKey) => string;
}) {
  const isExecuted = action.status === "executed";
  const isRejected = action.status === "rejected";
  const isFailed = action.status === "failed";

  const statusColor = isExecuted
    ? "border-[#22B07D] bg-[#F0FDF4]"
    : isRejected
      ? "border-[#DCD6C8] bg-[#F7F4EC]"
      : isFailed
        ? "border-[#E7D6D4] bg-[#FEF2F2]"
        : "border-[#DCD6C8] bg-[#F7F4EC]";

  const statusLabel = isExecuted
    ? t("assistant.actionExecuted")
    : isRejected
      ? t("assistant.actionRejected")
      : isFailed
        ? t("assistant.actionFailed")
        : action.status;

  const label =
    ACTION_TYPE_LABELS[action.actionType]?.[language as "ur" | "en"] ??
    action.actionType;

  const params = parseParams(action.parameters);
  const amount = heroAmount(action.actionType, params);

  return (
    <div className="mt-2 flex w-full max-w-[min(100%,28rem)] flex-col gap-2 self-end sm:max-w-[78%]">
      <div
        className={cn(
          "rounded-[16px_16px_4px_16px] border-2 px-5 py-4",
          statusColor,
        )}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[12px] font-medium text-[#4C5A52]">
            {statusLabel}
          </span>
          <span className="text-[12px] text-[#8A9690]">{label}</span>
        </div>
        {amount != null ? (
          <p className="mb-1 font-[var(--font-manrope)] text-[22px] font-bold text-[#14231B]">
            {formatPKR(amount)}
          </p>
        ) : null}
        <p className="text-[14px] font-reading leading-[2] text-[#4C5A52]">
          {isExecuted && action.resultMessage
            ? action.resultMessage
            : action.userFacingMessage}
        </p>
        {isFailed && action.resultMessage ? (
          <p className="mt-1 text-[13px] text-[#B3261E]">{action.resultMessage}</p>
        ) : null}
      </div>
    </div>
  );
}

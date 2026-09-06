"use client";

import * as React from "react";
import { useGoals } from "@/hooks/useGoals";
import { useToast } from "@/components/shared/Toast";
import { useLanguage } from "@/components/LanguageProvider";
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/DataStates";
import { GoalCard } from "@/components/goals/GoalCard";
import { StatefulButton } from "@/components/ui/stateful-button";
import { formatPKR } from "@/lib/i18n/format";
import { Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inputCls =
  "h-11 rounded-[12px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-2.5 text-[14px] placeholder:text-[#9BA79F] focus-visible:border-[#0F5132] focus-visible:ring-2 focus-visible:ring-[#0F5132]/20";
const labelCls = "text-[13px] font-medium text-[#4C5A52] mb-1.5";
const errorCls = "text-[12px] text-[#B3261E] mt-1";

export default function GoalsPage() {
  const {
    goals,
    loading,
    error,
    createGoal,
    updateGoal,
    contributeToGoal,
    deleteGoal,
  } = useGoals();
  const { addToast } = useToast();
  const { t, language } = useLanguage();

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const dateLocale = language === "ur" ? "ur-PK" : "en-PK";

  const [goalDialogOpen, setGoalDialogOpen] = React.useState(false);
  const [editingGoalId, setEditingGoalId] = React.useState<string | null>(null);
  const [goalName, setGoalName] = React.useState("");
  const [goalTarget, setGoalTarget] = React.useState("");
  const [goalDate, setGoalDate] = React.useState("");
  const [goalSubmitting, setGoalSubmitting] = React.useState(false);
  const [goalErrors, setGoalErrors] = React.useState<Record<string, string>>(
    {},
  );

  const [celebrateId, setCelebrateId] = React.useState<string | null>(null);

  const openCreateGoal = () => {
    setEditingGoalId(null);
    setGoalName("");
    setGoalTarget("");
    setGoalDate("");
    setGoalErrors({});
    setGoalDialogOpen(true);
  };

  const openEditGoal = (g: {
    id: string;
    name: string;
    nameUr?: string;
    targetAmount: number;
    targetDate?: number;
  }) => {
    setEditingGoalId(g.id);
    setGoalName(g.nameUr ?? g.name);
    setGoalTarget(String(g.targetAmount));
    setGoalDate(
      g.targetDate ? new Date(g.targetDate).toISOString().slice(0, 10) : "",
    );
    setGoalErrors({});
    setGoalDialogOpen(true);
  };

  const handleSaveGoal = async () => {
    const errs: Record<string, string> = {};
    if (!goalName.trim()) errs.name = t("goals.dialog.errorName");
    const parsed = parseFloat(goalTarget);
    if (!goalTarget || isNaN(parsed) || parsed <= 0)
      errs.target = t("goals.dialog.errorAmount");
    if (Object.keys(errs).length > 0) {
      setGoalErrors(errs);
      throw new Error("goal validation failed");
    }
    setGoalSubmitting(true);
    try {
      const targetDate = goalDate ? new Date(goalDate).getTime() : undefined;
      if (editingGoalId) {
        await updateGoal({
          id: editingGoalId,
          name: goalName.trim(),
          nameUr: goalName.trim(),
          targetAmount: parsed,
          targetDate,
        });
        addToast({ type: "success", title: t("goals.toast.updated") });
      } else {
        await createGoal({
          name: goalName.trim(),
          nameUr: goalName.trim(),
          targetAmount: parsed,
          targetDate,
        });
        addToast({ type: "success", title: t("goals.toast.created") });
      }
      setGoalDialogOpen(false);
    } catch {
      addToast({ type: "error", title: t("goals.toast.error") });
    } finally {
      setGoalSubmitting(false);
    }
  };

  const [deleteGoalOpen, setDeleteGoalOpen] = React.useState(false);
  const [deleteGoalTarget, setDeleteGoalTarget] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleDeleteGoal = async () => {
    if (!deleteGoalTarget) return;
    try {
      await deleteGoal(deleteGoalTarget.id);
      addToast({ type: "success", title: t("goals.toast.deleted") });
    } catch {
      addToast({ type: "error", title: t("goals.toast.errorGeneric") });
    }
    setDeleteGoalOpen(false);
    setDeleteGoalTarget(null);
  };

  const [contributeOpen, setContributeOpen] = React.useState(false);
  const [activeGoal, setActiveGoal] = React.useState<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
  } | null>(null);
  const [amount, setAmount] = React.useState("");
  const [contributeError, setContributeError] = React.useState("");

  const openContributeDialog = (goal: {
    id: string;
    name: string;
    nameUr?: string;
    targetAmount: number;
    currentAmount: number;
  }) => {
    setActiveGoal({
      id: goal.id,
      name: goal.nameUr ?? goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
    });
    setAmount("");
    setContributeError("");
    setContributeOpen(true);
  };

  const handleContributeSubmit = async () => {
    if (!activeGoal) return;
    const parsed = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(parsed) || parsed <= 0) {
      setContributeError(t("goals.contribute.error"));
      throw new Error("invalid amount");
    }
    setContributeError("");
    try {
      await contributeToGoal(activeGoal.id, parsed);
      setContributeOpen(false);
      setCelebrateId(activeGoal.id);
      window.setTimeout(() => setCelebrateId(null), 1600);
      addToast({ type: "success", title: t("goals.toast.contributed") });
    } catch {
      setContributeError(t("goals.toast.error"));
      throw new Error("contribute failed");
    }
  };

  return (
    <div className="flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-[1.7]">
            {t("goals.title")}
          </h1>
          <p className="text-[14px] text-[#6B7A70]">
            {goals.length > 0
              ? `${goals.filter((g) => !g.isCompleted).length} ${t("goals.active")} · ${t("goals.totalSaved")} ${formatPKR(totalSaved)}`
              : t("goals.noGoalSet")}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateGoal}
          className="inline-flex min-h-11 items-center rounded-[12px] bg-[#0F5132] px-5 text-[14px] font-medium text-white hover:bg-[#14231B]"
        >
          {t("goals.add")}
        </button>
      </header>

      <div className="flex flex-col gap-[18px] px-6 pb-12 pt-6 sm:px-10">
        {loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {error && <ErrorState />}

        {!loading && !error && goals.length === 0 && (
          <EmptyState
            icon={Target}
            title={t("goals.emptyTitle")}
            description={t("goals.emptyDesc")}
            actionLabel={t("goals.add")}
            onAction={openCreateGoal}
          />
        )}

        {!loading && !error && goals.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                dateLocale={dateLocale}
                celebrate={celebrateId === g.id}
                onContribute={() => openContributeDialog(g)}
                onEdit={() => openEditGoal(g)}
                onDelete={() => {
                  setDeleteGoalTarget({
                    id: g.id,
                    name: g.nameUr ?? g.name,
                  });
                  setDeleteGoalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="border-[#E7E2D6] bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px]">
              {editingGoalId
                ? t("goals.dialog.editTitle")
                : t("goals.dialog.newTitle")}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-[#6B7A70]">
              {editingGoalId
                ? t("goals.dialog.editDesc")
                : t("goals.dialog.newDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label className={labelCls}>{t("goals.dialog.name")}</Label>
              <Input
                type="text"
                placeholder={t("goals.dialog.namePlaceholder")}
                value={goalName}
                onChange={(e) => {
                  setGoalName(e.target.value);
                  setGoalErrors((err) => {
                    const copy = { ...err };
                    delete copy.name;
                    return copy;
                  });
                }}
                className={`${inputCls} ${goalErrors.name ? "border-[#B3261E]" : ""}`}
              />
              {goalErrors.name && (
                <span className={errorCls}>{goalErrors.name}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className={labelCls}>
                {t("goals.dialog.targetAmount")}
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder={t("goals.dialog.targetPlaceholder")}
                value={goalTarget}
                onChange={(e) => {
                  setGoalTarget(e.target.value);
                  setGoalErrors((err) => {
                    const copy = { ...err };
                    delete copy.target;
                    return copy;
                  });
                }}
                className={`${inputCls} font-[var(--font-manrope)] text-[16px] font-semibold ${goalErrors.target ? "border-[#B3261E]" : ""}`}
                dir="ltr"
              />
              {goalErrors.target && (
                <span className={errorCls}>{goalErrors.target}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className={labelCls}>
                {t("goals.dialog.targetDate")}{" "}
                <span className="font-normal text-[#9BA79F]">
                  ({t("goals.dialog.optional")})
                </span>
              </Label>
              <Input
                type="date"
                value={goalDate}
                onChange={(e) => setGoalDate(e.target.value)}
                className={inputCls}
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2.5 pt-3">
            <Button
              variant="outline"
              onClick={() => setGoalDialogOpen(false)}
              className="min-h-11 rounded-[12px] border-[#DCD6C8] bg-white text-[14px]"
            >
              {t("goals.dialog.cancel")}
            </Button>
            <StatefulButton
              onClick={handleSaveGoal}
              status={goalSubmitting ? "loading" : "idle"}
              loadingLabel={t("goals.dialog.saving")}
              className="min-w-[7rem] px-5 text-[14px]"
            >
              {editingGoalId
                ? t("goals.dialog.saveChanges")
                : t("goals.dialog.save")}
            </StatefulButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteGoalOpen} onOpenChange={setDeleteGoalOpen}>
        <AlertDialogContent className="border-[#E7E2D6] bg-white sm:max-w-sm">
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle className="text-[18px] font-bold text-[#14231B]">
              {t("goals.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] leading-[2] text-[#6B7A70]">
              {deleteGoalTarget && (
                <span className="block font-medium text-[#14231B]">
                  {deleteGoalTarget.name}
                </span>
              )}
              {t("goals.delete.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2.5">
            <AlertDialogCancel
              onClick={() => setDeleteGoalOpen(false)}
              className="min-h-11 rounded-[12px] border-[#DCD6C8] bg-white text-[14px] hover:bg-[#FBF9F4]"
            >
              {t("goals.delete.keep")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGoal}
              className="min-h-11 rounded-[12px] border-0 bg-[#B3261E] text-[14px] text-white hover:bg-[#8C1E18]"
            >
              {t("goals.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={contributeOpen} onOpenChange={setContributeOpen}>
        <DialogContent className="border-[#E7E2D6] bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px]">
              {t("goals.contribute.title")}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-[#6B7A70]">
              {activeGoal?.name} — {t("goals.contribute.current")}:{" "}
              {formatPKR(activeGoal?.currentAmount ?? 0)} /{" "}
              {formatPKR(activeGoal?.targetAmount ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <label className="text-[13px] font-medium text-[#4C5A52]">
              {t("goals.contribute.amountLabel")}
            </label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder={t("goals.contribute.placeholder")}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setContributeError("");
              }}
              className="h-12 border-[#DCD6C8] bg-[#FBF9F4] px-3.5 font-[var(--font-manrope)] text-[18px] font-semibold"
              dir="ltr"
              autoFocus
            />
            {contributeError && (
              <span className="text-[13px] text-[#B3261E]">
                {contributeError}
              </span>
            )}
          </div>
          <DialogFooter className="flex-row gap-2.5 pt-3">
            <Button
              onClick={() => setContributeOpen(false)}
              variant="outline"
              className="min-h-12 flex-1 rounded-[12px] border-[#DCD6C8] text-[14px]"
            >
              {t("goals.contribute.cancel")}
            </Button>
            <StatefulButton
              onClick={handleContributeSubmit}
              disabled={!amount.trim()}
              loadingLabel={t("goals.contribute.submitting")}
              successLabel={t("goals.contribute.done")}
              className="min-h-12 flex-1 text-[14px]"
            >
              {t("goals.contribute.submit")}
            </StatefulButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

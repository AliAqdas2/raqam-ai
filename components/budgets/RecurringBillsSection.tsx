"use client";

import * as React from "react";
import { Repeat2, Pencil, Trash2 } from "lucide-react";
import {
  useRecurring,
  type Frequency,
  type RecurringExpense,
} from "@/hooks/useRecurring";
import { useCategories } from "@/hooks/useCategories";
import { useToast } from "@/components/shared/Toast";
import { useLanguage } from "@/components/LanguageProvider";
import { ListSkeleton, EmptyState } from "@/components/shared/DataStates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

const inputCls =
  "h-10 rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-2.5 text-[14px] placeholder:text-[#9BA79F] focus-visible:border-[#0F5132] focus-visible:ring-2 focus-visible:ring-[#0F5132]/20";
const labelCls = "text-[13px] font-medium text-[#4C5A52] mb-1.5";
const errorCls = "text-[12px] text-[#B3261E] mt-1";

function pkr(n: number) {
  return `Rs. ${n.toLocaleString()}`;
}

function toDateInput(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function fromDateInput(value: string): number {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
}

interface DraftState {
  id: string | null;
  description: string;
  amount: string;
  categoryId: string;
  frequency: Frequency;
  nextDue: string;
}

const emptyDraft = (): DraftState => ({
  id: null,
  description: "",
  amount: "",
  categoryId: "",
  frequency: "monthly",
  nextDue: toDateInput(Date.now()),
});

export function RecurringBillsSection() {
  const { t, language } = useLanguage();
  const { items, loading, create, update, remove } = useRecurring();
  const { categories } = useCategories();
  const { addToast } = useToast();

  const freqLabel: Record<Frequency, string> = {
    daily: t("recurring.freqDaily"),
    weekly: t("recurring.freqWeekly"),
    monthly: t("recurring.freqMonthly"),
    yearly: t("recurring.freqYearly"),
  };

  const expenseCategories = categories.filter(
    (c) => c.type === "expense" || c.type === "both",
  );

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DraftState>(emptyDraft());
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  const [deleteTarget, setDeleteTarget] =
    React.useState<RecurringExpense | null>(null);

  const openAdd = () => {
    setDraft(emptyDraft());
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (item: RecurringExpense) => {
    setDraft({
      id: item.id,
      description: item.description,
      amount: String(item.amount),
      categoryId: item.categoryId,
      frequency: item.frequency,
      nextDue: toDateInput(item.nextDueDate),
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!draft.description.trim()) errs.description = t("recurring.toast.invalid");
    const amount = parseFloat(draft.amount);
    if (!draft.amount || isNaN(amount) || amount <= 0)
      errs.amount = t("recurring.toast.invalid");
    if (!draft.categoryId) errs.categoryId = t("budgets.errorSelectCategory");
    if (!draft.nextDue) errs.nextDue = t("recurring.toast.invalid");
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        description: draft.description.trim(),
        amount,
        categoryId: draft.categoryId,
        frequency: draft.frequency,
        nextDueDate: fromDateInput(draft.nextDue),
      };
      if (draft.id) {
        await update({ id: draft.id, ...payload });
        addToast({ type: "success", title: t("recurring.toast.updated") });
      } else {
        await create(payload);
        addToast({ type: "success", title: t("recurring.toast.created") });
      }
      setDialogOpen(false);
    } catch {
      addToast({ type: "error", title: t("recurring.toast.error") });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      addToast({ type: "success", title: t("recurring.toast.deleted") });
    } catch {
      addToast({ type: "error", title: t("recurring.toast.error") });
    }
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-[19px] font-bold">
            <Repeat2 className="h-4 w-4 text-[#0F5132]" />
            {t("recurring.title")}
          </h2>
          <p className="text-[13px] text-[#6B7A70]">{t("recurring.subtitle")}</p>
        </div>
        <button
          onClick={openAdd}
          className="shrink-0 rounded-[10px] border-0 bg-[#0F5132] px-4 py-2.5 text-[13px] text-white hover:bg-[#14231B]"
        >
          {t("recurring.add")}
        </button>
      </div>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Repeat2}
          title={t("recurring.empty")}
          description={t("recurring.emptyDesc")}
          actionLabel={t("recurring.add")}
          onAction={openAdd}
        />
      ) : (
        <div className="flex flex-col divide-y divide-[#F4F1E8]">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-3 first:pt-0"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#E6EFE9] text-[15px]">
                {item.categoryIcon}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px]">{item.description}</span>
                <span className="text-[12px] text-[#8A9690]">
                  {freqLabel[item.frequency]} ·{" "}
                  {t("recurring.colNextDue")}:{" "}
                  {new Date(item.nextDueDate).toLocaleDateString(
                    language === "ur" ? "ur-PK" : "en-PK",
                    { day: "numeric", month: "short" },
                  )}
                </span>
              </div>
              <span className="shrink-0 font-[var(--font-manrope)] text-[14px] font-semibold">
                {pkr(item.amount)}
              </span>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => openEdit(item)}
                  aria-label={t("common.edit")}
                  title={t("common.edit")}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-[#E7E2D6] text-[#0F5132] transition-colors hover:border-[#0F5132] hover:bg-[#E6EFE9]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(item)}
                  aria-label={t("common.delete")}
                  title={t("common.delete")}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-[#E7E2D6] text-[#B3261E] transition-colors hover:border-[#B3261E] hover:bg-[#FDE8E8]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md border-[#E7E2D6] bg-white">
          <DialogHeader>
            <DialogTitle className="text-[18px]">
              {draft.id
                ? t("recurring.dialogEditTitle")
                : t("recurring.dialogAddTitle")}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-[#6B7A70]">
              {t("recurring.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label className={labelCls}>
                {t("recurring.fieldDescription")}
              </Label>
              <Input
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                className={`${inputCls} ${errors.description ? "border-[#B3261E]" : ""}`}
                placeholder="مثلاً: بجلی کا بل"
              />
              {errors.description && (
                <span className={errorCls}>{errors.description}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className={labelCls}>{t("recurring.fieldAmount")}</Label>
              <Input
                type="number"
                inputMode="decimal"
                dir="ltr"
                value={draft.amount}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, amount: e.target.value }))
                }
                className={`${inputCls} ${errors.amount ? "border-[#B3261E]" : ""}`}
                placeholder="e.g. 3,500"
              />
              {errors.amount && <span className={errorCls}>{errors.amount}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className={labelCls}>{t("recurring.fieldCategory")}</Label>
              <Select
                value={draft.categoryId}
                onValueChange={(val) => {
                  if (val) setDraft((d) => ({ ...d, categoryId: val }));
                  setErrors((e) => {
                    const c = { ...e };
                    delete c.categoryId;
                    return c;
                  });
                }}
              >
                <SelectTrigger
                  className={`h-10 w-full rounded-[10px] border bg-[#FBF9F4] px-3.5 text-[14px] ${errors.categoryId ? "border-[#B3261E]" : "border-[#DCD6C8]"}`}
                >
                  <SelectValue
                    placeholder={t("transactions.form.categoryPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>
                          {language === "ur" ? cat.nameUr : cat.name}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <span className={errorCls}>{errors.categoryId}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className={labelCls}>{t("recurring.fieldFrequency")}</Label>
              <Select
                value={draft.frequency}
                onValueChange={(val) => {
                  if (val)
                    setDraft((d) => ({ ...d, frequency: val as Frequency }));
                }}
              >
                <SelectTrigger className="h-10 w-full rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {(
                    ["daily", "weekly", "monthly", "yearly"] as Frequency[]
                  ).map((f) => (
                    <SelectItem key={f} value={f}>
                      {freqLabel[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className={labelCls}>{t("recurring.fieldNextDue")}</Label>
              <Input
                type="date"
                dir="ltr"
                value={draft.nextDue}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, nextDue: e.target.value }))
                }
                className={inputCls}
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2.5 pt-3">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-[10px] border-[#DCD6C8] bg-white text-[14px]"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-[10px] border-0 bg-[#0F5132] px-6 text-[14px] text-white hover:bg-[#14231B]"
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="border-[#E7E2D6] bg-white sm:max-w-sm">
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle className="text-[18px] font-bold text-[#14231B]">
              {t("recurring.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] leading-[2] text-[#6B7A70]">
              {deleteTarget && (
                <span className="block font-medium text-[#14231B]">
                  {deleteTarget.description}
                </span>
              )}
              {t("recurring.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2.5">
            <AlertDialogCancel
              onClick={() => setDeleteTarget(null)}
              className="rounded-[10px] border-[#DCD6C8] bg-white text-[14px] hover:bg-[#FBF9F4]"
            >
              {t("transactions.delete.keep")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-[10px] border-0 bg-[#B3261E] text-[14px] text-white hover:bg-[#8C1E18]"
            >
              {t("transactions.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

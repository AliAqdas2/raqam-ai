"use client";

import * as React from "react";
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
import { StatefulButton } from "@/components/ui/stateful-button";
import type { Category } from "@/hooks/useCategories";
import { useLanguage } from "@/components/LanguageProvider";

/* ── Types ── */
export interface TransactionFormData {
  type: "income" | "expense";
  amount: string;
  categoryId: string;
  date: string;
  description: string;
  notes: string;
}

const EMPTY: TransactionFormData = {
  type: "expense",
  amount: "",
  categoryId: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  notes: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  initialData?: Partial<TransactionFormData>;
  onSubmit: (data: TransactionFormData) => void | Promise<void>;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  categories,
  initialData,
  onSubmit,
}: Props) {
  const isEdit = !!initialData?.amount;
  const [formKey, setFormKey] = React.useState(0);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) setFormKey((k) => k + 1);
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[min(90vh,calc(100dvh-2rem))] flex flex-col gap-0 overflow-hidden border-[#E7E2D6] bg-white p-0 shadow-lg">
        {open && (
          <TransactionFormInner
            key={formKey}
            isEdit={isEdit}
            categories={categories}
            initialData={initialData}
            onSubmit={onSubmit}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Inner form (remounts on each open via key) ── */
function TransactionFormInner({
  isEdit,
  categories: allCategories,
  initialData,
  onSubmit,
  onClose,
}: {
  isEdit: boolean;
  categories: Category[];
  initialData?: Partial<TransactionFormData>;
  onSubmit: (data: TransactionFormData) => void | Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [form, setForm] = React.useState<TransactionFormData>({
    ...EMPTY,
    ...initialData,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = React.useState<
    "idle" | "loading" | "success"
  >("idle");

  const set = <K extends keyof TransactionFormData>(
    key: K,
    val: TransactionFormData[K],
  ) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => {
      const copy = { ...e };
      delete copy[key];
      return copy;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0)
      errs.amount = t("transactions.form.errorAmount");
    if (!form.categoryId)
      errs.categoryId = t("transactions.form.errorCategory");
    if (!form.date) errs.date = t("transactions.form.errorDate");
    if (!form.description.trim())
      errs.description = t("transactions.form.errorDescription");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitStatus === "loading" || submitStatus === "success") return;
    if (!validate()) return;
    setSubmitStatus("loading");
    try {
      await Promise.resolve(onSubmit(form));
      setSubmitStatus("success");
      window.setTimeout(() => onClose(), 450);
    } catch {
      setSubmitStatus("idle");
    }
  };

  const categories = allCategories.filter(
    (c) => c.type === form.type || c.type === "both",
  );

  const inputCls =
    "h-10 rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-2.5 text-[14px] placeholder:text-[#9BA79F] focus-visible:border-[#0F5132] focus-visible:ring-2 focus-visible:ring-[#0F5132]/20";
  const errorCls = "text-[12px] text-[#B3261E] mt-1";
  const labelCls = "text-[13px] font-medium text-[#4C5A52] mb-1.5";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {/* Header */}
      <DialogHeader className="shrink-0 border-b border-[#E7E2D6] bg-[#FBF9F4] px-6 py-4">
        <DialogTitle className="text-[20px] font-bold text-[#14231B]">
          {isEdit
            ? t("transactions.form.editTitle")
            : t("transactions.form.newTitle")}
        </DialogTitle>
        <DialogDescription className="text-[13px] text-[#6B7A70]">
          {isEdit
            ? t("transactions.form.editDesc")
            : t("transactions.form.newDesc")}
        </DialogDescription>
      </DialogHeader>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
        {/* Amount first */}
        <div className="flex flex-col gap-1.5">
          <Label className={labelCls}>{t("transactions.form.amount")}</Label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder={t("transactions.form.amountPlaceholder")}
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            className={`${inputCls} font-[var(--font-manrope)] text-[16px] font-semibold ${errors.amount ? "border-[#B3261E]" : ""}`}
            dir="ltr"
            autoFocus={!isEdit}
          />
          {errors.amount && <span className={errorCls}>{errors.amount}</span>}
        </div>

        {/* Type toggle */}
        <div className="flex flex-col gap-1.5">
          <Label className={labelCls}>{t("transactions.form.type")}</Label>
          <div className="flex overflow-hidden rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4]">
            <button
              type="button"
              onClick={() => set("type", "expense")}
              className={`flex-1 px-3.5 py-2.5 text-[14px] transition-colors ${
                form.type === "expense"
                  ? "bg-[#B3261E] text-white"
                  : "hover:bg-[#F1EEE4]"
              }`}
            >
              {t("transactions.expense")}
            </button>
            <button
              type="button"
              onClick={() => set("type", "income")}
              className={`flex-1 border-r border-[#DCD6C8] px-3.5 py-2.5 text-[14px] transition-colors ${
                form.type === "income"
                  ? "bg-[#0F5132] text-white"
                  : "hover:bg-[#F1EEE4]"
              }`}
            >
              {t("transactions.income")}
            </button>
          </div>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <Label className={labelCls}>{t("transactions.form.category")}</Label>
          <Select
            value={form.categoryId}
            onValueChange={(val) => set("categoryId", val as string)}
          >
            <SelectTrigger
              className={`h-10 w-full rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 text-[14px] ${errors.categoryId ? "border-[#B3261E]" : ""}`}
            >
              <SelectValue
                placeholder={t("transactions.form.categoryPlaceholder")}
              >
                {(() => {
                  if (!form.categoryId) return undefined;
                  const selected = allCategories.find(
                    (c) => c.id === form.categoryId,
                  );
                  if (!selected) return form.categoryId;
                  return (
                    <span className="flex items-center gap-2">
                      <span>{selected.icon}</span>
                      <span>{selected.nameUr}</span>
                    </span>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white">
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span>{cat.nameUr}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && (
            <span className={errorCls}>{errors.categoryId}</span>
          )}
        </div>

        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <Label className={labelCls}>{t("transactions.form.date")}</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className={`${inputCls} ${errors.date ? "border-[#B3261E]" : ""}`}
            dir="ltr"
          />
          {errors.date && <span className={errorCls}>{errors.date}</span>}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <Label className={labelCls}>
            {t("transactions.form.description")}
          </Label>
          <Input
            type="text"
            placeholder={t("transactions.form.descriptionPlaceholder")}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={`${inputCls} ${errors.description ? "border-[#B3261E]" : ""}`}
          />
          {errors.description && (
            <span className={errorCls}>{errors.description}</span>
          )}
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <Label className={labelCls}>
            {t("transactions.form.notes")}{" "}
            <span className="text-[#9BA79F] font-normal">
              ({t("transactions.form.notesOptional")})
            </span>
          </Label>
          <textarea
            placeholder={t("transactions.form.notesPlaceholder")}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            className="w-full resize-none rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-2.5 text-[14px] placeholder:text-[#9BA79F] focus-visible:border-[#0F5132] focus-visible:ring-2 focus-visible:ring-[#0F5132]/20 focus-visible:outline-none"
          />
        </div>
      </div>

      {/* Footer */}
      <DialogFooter className="mx-0 mb-0 shrink-0 flex-row gap-2.5 border-t border-[#E7E2D6] bg-[#FBF9F4] px-6 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={submitStatus === "loading" || submitStatus === "success"}
          className="min-h-12 rounded-[12px] border-[#DCD6C8] bg-white px-5 text-[14px] hover:bg-[#FBF9F4]"
        >
          {t("transactions.form.cancel")}
        </Button>
        <StatefulButton
          type="submit"
          status={submitStatus}
          loadingLabel={t("transactions.form.saving")}
          successLabel={t("transactions.form.saved")}
          className="flex-1 sm:flex-none"
        >
          {isEdit
            ? t("transactions.form.saveChanges")
            : t("transactions.form.save")}
        </StatefulButton>
      </DialogFooter>
    </form>
  );
}

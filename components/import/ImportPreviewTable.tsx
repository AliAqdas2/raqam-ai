"use client";

import * as React from "react";
import { useLanguage } from "@/components/LanguageProvider";
import type { Category } from "@/hooks/useCategories";
import { formatPKR } from "@/lib/i18n/format";
import { inputValueToDate } from "@/lib/finance/import/normalizer";
import type {
  ImportPreviewRow,
  ImportRowEdits,
  ImportBusy,
} from "@/hooks/useImports";
import { Loader2 } from "lucide-react";
import { StatefulButton } from "@/components/ui/stateful-button";
import { cn } from "@/lib/utils";

// components/import/ImportPreviewTable.tsx — Phase 12 preview
//
// Summary cards first, then editable rows. Mobile uses amount-hero cards
// (no sideways scroll). Desktop keeps a compact table. Confirm is atomic.

interface RowEdit {
  rowId: string;
  selected: boolean;
  type: "income" | "expense";
  amount: string;
  description: string;
  dateInput: string;
  categoryId: string;
}

interface ImportPreviewTableProps {
  fileName: string;
  rowCount: number | null;
  duplicateCount: number | null;
  skippedCount: number | null;
  rows: ImportPreviewRow[];
  categories: Category[];
  categoriesLoading: boolean;
  busy: ImportBusy;
  onConfirm: (edits: ImportRowEdits[]) => void | Promise<void>;
  onCancel: () => void;
}

function buildEdits(rows: ImportPreviewRow[]): RowEdit[] {
  return rows.map((r) => ({
    rowId: r.id,
    selected: !r.isDuplicate,
    type: r.type,
    amount: String(r.amount),
    description: r.description,
    dateInput: r.dateInput,
    categoryId: r.suggestedCategoryId ?? "",
  }));
}

function parseAmountInput(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, "").trim());
  return isFinite(n) ? n : 0;
}

const PAGE_SIZE = 100;

const inputClass =
  "w-full rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-2.5 py-2 text-[14px] focus:border-[#0F5132] focus:outline-none";
const invalidClass = "border-[#B3261E] bg-[#FDE8E8]";

export function ImportPreviewTable({
  fileName,
  rowCount,
  duplicateCount,
  skippedCount,
  rows,
  categories,
  categoriesLoading,
  busy,
  onConfirm,
  onCancel,
}: ImportPreviewTableProps) {
  const { t, language } = useLanguage();
  const [displayLimit, setDisplayLimit] = React.useState(PAGE_SIZE);
  const [edits, setEdits] = React.useState<RowEdit[]>(() => buildEdits(rows));

  const updateEdit = React.useCallback(
    (rowId: string, patch: Partial<RowEdit>) => {
      setEdits((prev) =>
        prev.map((e) => (e.rowId === rowId ? { ...e, ...patch } : e)),
      );
    },
    [],
  );

  const categoriesForType = React.useCallback(
    (type: "income" | "expense") =>
      categories.filter((c) => c.type === "both" || c.type === type),
    [categories],
  );

  const invalidCount = React.useMemo(() => {
    return edits.filter((e) => {
      if (!e.selected) return false;
      const valid =
        parseAmountInput(e.amount) > 0 &&
        inputValueToDate(e.dateInput) !== null &&
        e.categoryId !== "" &&
        categories.some((c) => c.id === e.categoryId);
      return !valid;
    }).length;
  }, [edits, categories]);

  const selectedSummary = React.useMemo(() => {
    let count = 0;
    let income = 0;
    let expense = 0;
    for (const e of edits) {
      if (!e.selected) continue;
      count++;
      const amount = parseAmountInput(e.amount);
      if (e.type === "income") income += amount;
      else expense += amount;
    }
    return { count, income, expense };
  }, [edits]);

  const handleTypeChange = React.useCallback(
    (rowId: string, type: "income" | "expense") => {
      setEdits((prev) =>
        prev.map((e) => {
          if (e.rowId !== rowId) return e;
          const stillValid = categories.some(
            (c) =>
              c.id === e.categoryId && (c.type === "both" || c.type === type),
          );
          const fallback =
            categories.find((c) => c.type === "both" || c.type === type)?.id ??
            "";
          return {
            ...e,
            type,
            categoryId: stillValid ? e.categoryId : fallback,
          };
        }),
      );
    },
    [categories],
  );

  const handleConfirm = React.useCallback((): void | Promise<void> => {
    if (invalidCount > 0 || busy || categoriesLoading) return;
    const payload: ImportRowEdits[] = edits.map((e) => ({
      rowId: e.rowId,
      type: e.type,
      amount: parseAmountInput(e.amount),
      description: e.description,
      dateMs: inputValueToDate(e.dateInput) ?? 0,
      categoryId: e.categoryId,
      selected: e.selected,
    }));
    return Promise.resolve(onConfirm(payload));
  }, [invalidCount, busy, categoriesLoading, edits, onConfirm]);

  const confirmDisabled =
    busy !== null || categoriesLoading || invalidCount > 0;

  const duplicateRowIds = React.useMemo(
    () => new Set(rows.filter((r) => r.isDuplicate).map((r) => r.id)),
    [rows],
  );

  const totalRows = rowCount ?? rows.length;
  const dupes = duplicateCount ?? 0;
  const skipped = skippedCount ?? 0;

  const visible = edits.slice(0, displayLimit);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-[#E7E2D6] bg-white">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-[#F4F1E8] px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[18px] font-bold">{t("import.previewTitle")}</h3>
          <span className="max-w-full truncate rounded-full bg-[#F1EEE4] px-3 py-1 text-[13px] text-[#4C5A52]">
            {fileName}
          </span>
        </div>
        {dupes > 0 && (
          <p className="text-[13px] leading-[1.8] text-[#6B7A70]">
            {t("import.duplicateHint")}
          </p>
        )}
      </div>

      {/* Summary first — counts before any write */}
      <div className="grid grid-cols-2 gap-2.5 px-5 sm:grid-cols-4">
        <SummaryCard
          label={t("import.summary.rows")}
          value={String(totalRows)}
        />
        <SummaryCard
          label={t("import.summary.duplicates")}
          value={String(dupes)}
          tone={dupes > 0 ? "warn" : "default"}
        />
        <SummaryCard
          label={t("import.summary.skipped")}
          value={String(skipped)}
        />
        <SummaryCard
          label={
            invalidCount > 0
              ? t("import.summary.fix")
              : t("import.summary.selected")
          }
          value={
            invalidCount > 0
              ? String(invalidCount)
              : String(selectedSummary.count)
          }
          tone={invalidCount > 0 ? "danger" : "ok"}
        />
      </div>

      <p className="px-5 text-[13px] font-medium text-[#4C5A52]">
        {t("import.reviewRows")}
      </p>

      {/* Mobile cards — no horizontal scroll */}
      <div className="flex flex-col gap-3 px-4 md:hidden">
        {visible.map((e) => {
          const amountInvalid =
            e.selected && parseAmountInput(e.amount) <= 0;
          const dateInvalid =
            e.selected && inputValueToDate(e.dateInput) === null;
          const categoryInvalid =
            e.selected &&
            (e.categoryId === "" ||
              !categories.some((c) => c.id === e.categoryId));
          const isDuplicate = duplicateRowIds.has(e.rowId);
          const amountNum = parseAmountInput(e.amount);

          return (
            <article
              key={e.rowId}
              className={cn(
                "flex flex-col gap-3 rounded-[14px] border px-4 py-4",
                isDuplicate
                  ? "border-[#E8C96A]/50 bg-[#FDF6E3]"
                  : "border-[#E7E2D6] bg-[#FBF9F4]",
                !e.selected && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "font-[var(--font-manrope)] text-[26px] font-extrabold leading-none tracking-[-.02em]",
                      e.type === "income" ? "text-[#0F5132]" : "text-[#8A2E26]",
                    )}
                  >
                    {amountNum > 0 ? formatPKR(amountNum) : "—"}
                  </p>
                  {isDuplicate ? (
                    <span className="mt-2 inline-block rounded-full bg-[#FDF3D8] px-2.5 py-0.5 text-[12px] font-medium text-[#B07D2A]">
                      {t("import.duplicate")}
                    </span>
                  ) : null}
                </div>
                <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border border-[#DCD6C8] bg-white px-3 text-[13px] font-medium text-[#4C5A52]">
                  <input
                    type="checkbox"
                    checked={e.selected}
                    onChange={(ev) =>
                      updateEdit(e.rowId, { selected: ev.target.checked })
                    }
                    className="h-5 w-5 accent-[#0F5132]"
                    aria-label={t("import.includeRow")}
                  />
                  {t("import.includeRow")}
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] text-[#6B7A70]">
                  {t("import.colDescription")}
                </span>
                <input
                  type="text"
                  value={e.description}
                  onChange={(ev) =>
                    updateEdit(e.rowId, { description: ev.target.value })
                  }
                  dir="auto"
                  className={inputClass}
                />
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#6B7A70]">
                    {t("import.colAmount")}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={e.amount}
                    onChange={(ev) =>
                      updateEdit(e.rowId, { amount: ev.target.value })
                    }
                    dir="ltr"
                    className={cn(inputClass, amountInvalid && invalidClass)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#6B7A70]">
                    {t("import.colDate")}
                  </span>
                  <input
                    type="date"
                    value={e.dateInput}
                    onChange={(ev) =>
                      updateEdit(e.rowId, { dateInput: ev.target.value })
                    }
                    dir="ltr"
                    className={cn(inputClass, dateInvalid && invalidClass)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#6B7A70]">
                    {t("import.colType")}
                  </span>
                  <select
                    value={e.type}
                    onChange={(ev) =>
                      handleTypeChange(
                        e.rowId,
                        ev.target.value as "income" | "expense",
                      )
                    }
                    className={cn(
                      inputClass,
                      e.type === "income"
                        ? "text-[#1B7A4B]"
                        : "text-[#B3261E]",
                    )}
                  >
                    <option value="expense">{t("transactions.expense")}</option>
                    <option value="income">{t("transactions.income")}</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#6B7A70]">
                    {t("import.colCategory")}
                  </span>
                  <select
                    value={e.categoryId}
                    onChange={(ev) =>
                      updateEdit(e.rowId, { categoryId: ev.target.value })
                    }
                    className={cn(inputClass, categoryInvalid && invalidClass)}
                  >
                    <option value="">
                      {categoriesLoading
                        ? t("common.loading")
                        : t("import.pickCategory")}
                    </option>
                    {categoriesForType(e.type).map((c) => (
                      <option key={c.id} value={c.id}>
                        {language === "ur" ? c.nameUr : c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </article>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto px-2 md:block">
        <table className="w-full min-w-[680px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#E7E2D6] text-[12px] text-[#6B7A70]">
              <th className="w-10 px-2 py-2 text-start font-medium">
                <span className="sr-only">{t("import.selectRow")}</span>✓
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("import.colDate")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("import.colDescription")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("import.colAmount")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("import.colType")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("import.colCategory")}
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => {
              const amountInvalid =
                e.selected && parseAmountInput(e.amount) <= 0;
              const dateInvalid =
                e.selected && inputValueToDate(e.dateInput) === null;
              const categoryInvalid =
                e.selected &&
                (e.categoryId === "" ||
                  !categories.some((c) => c.id === e.categoryId));
              const isDuplicate = duplicateRowIds.has(e.rowId);

              return (
                <tr
                  key={e.rowId}
                  className={`border-b border-[#F4F1E8] ${
                    isDuplicate ? "bg-[#FDF6E3]" : ""
                  }`}
                >
                  <td className="px-2 py-2 align-middle">
                    <input
                      type="checkbox"
                      checked={e.selected}
                      onChange={(ev) =>
                        updateEdit(e.rowId, { selected: ev.target.checked })
                      }
                      className="h-4 w-4 cursor-pointer accent-[#0F5132]"
                      aria-label={t("import.selectRow")}
                    />
                    {isDuplicate && (
                      <span className="mt-1 block text-center text-[10px] leading-tight text-[#B07D2A]">
                        {t("import.duplicate")}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <input
                      type="date"
                      value={e.dateInput}
                      onChange={(ev) =>
                        updateEdit(e.rowId, { dateInput: ev.target.value })
                      }
                      dir="ltr"
                      className={`${inputClass} min-w-[130px] ${
                        dateInvalid ? invalidClass : ""
                      }`}
                    />
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <input
                      type="text"
                      value={e.description}
                      onChange={(ev) =>
                        updateEdit(e.rowId, { description: ev.target.value })
                      }
                      dir="auto"
                      className={`${inputClass} min-w-[160px]`}
                    />
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={e.amount}
                      onChange={(ev) =>
                        updateEdit(e.rowId, { amount: ev.target.value })
                      }
                      dir="ltr"
                      className={`${inputClass} min-w-[100px] ${
                        amountInvalid ? invalidClass : ""
                      }`}
                    />
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <select
                      value={e.type}
                      onChange={(ev) =>
                        handleTypeChange(
                          e.rowId,
                          ev.target.value as "income" | "expense",
                        )
                      }
                      className={`${inputClass} min-w-[96px] ${
                        e.type === "income"
                          ? "text-[#1B7A4B]"
                          : "text-[#B3261E]"
                      }`}
                    >
                      <option value="expense">
                        {t("transactions.expense")}
                      </option>
                      <option value="income">{t("transactions.income")}</option>
                    </select>
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <select
                      value={e.categoryId}
                      onChange={(ev) =>
                        updateEdit(e.rowId, { categoryId: ev.target.value })
                      }
                      className={`${inputClass} min-w-[130px] ${
                        categoryInvalid ? invalidClass : ""
                      }`}
                    >
                      <option value="">
                        {categoriesLoading
                          ? t("common.loading")
                          : t("import.pickCategory")}
                      </option>
                      {categoriesForType(e.type).map((c) => (
                        <option key={c.id} value={c.id}>
                          {language === "ur" ? c.nameUr : c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {edits.length > displayLimit && (
        <div className="px-5">
          <button
            type="button"
            onClick={() => setDisplayLimit((n) => n + PAGE_SIZE)}
            className="min-h-11 rounded-[10px] bg-[#F1EEE4] px-4 py-2 text-[13px] text-[#4C5A52] hover:bg-[#E9E4D5]"
          >
            {t("import.showMore")} ({edits.length - displayLimit})
          </button>
        </div>
      )}

      {/* Footer — step 3 mental model: save */}
      <div className="flex flex-col gap-3 border-t border-[#F4F1E8] px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#4C5A52]">
          <span className="font-semibold">
            {t("import.selectedPrefix")}
            {selectedSummary.count}
            {t("import.selectedSuffix")}
            {edits.length}
          </span>
          {selectedSummary.income > 0 && (
            <span className="text-[#1B7A4B]">
              {t("transactions.income")}: {formatPKR(selectedSummary.income)}
            </span>
          )}
          {selectedSummary.expense > 0 && (
            <span className="text-[#B3261E]">
              {t("transactions.expense")}: {formatPKR(selectedSummary.expense)}
            </span>
          )}
        </div>

        {invalidCount > 0 && (
          <p className="text-[13px] text-[#B3261E]" role="alert">
            {t("import.fixRowsPrefix")}
            {invalidCount}
            {t("import.fixRowsSuffix")}
          </p>
        )}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy !== null}
            className="min-h-12 flex-1 rounded-[12px] bg-[#F1EEE4] px-4 text-[14px] text-[#6B7A70] hover:bg-[#E9E4D5] disabled:opacity-50"
          >
            {busy === "cancelling" ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              t("import.cancelImport")
            )}
          </button>
          <StatefulButton
            onClick={handleConfirm}
            disabled={confirmDisabled || selectedSummary.count === 0}
            loadingLabel={t("import.confirming")}
            successLabel={t("import.confirmed")}
            className="flex-1 rounded-[12px] px-4 text-[14px]"
          >
            {`${t("import.confirmImport")} (${selectedSummary.count})`}
          </StatefulButton>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "danger" | "ok";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-[14px] border px-3.5 py-3",
        tone === "warn" && "border-[#E8C96A]/40 bg-[#FDF6E3]",
        tone === "danger" && "border-[#B3261E]/25 bg-[#FDE8E8]",
        tone === "ok" && "border-[#0F5132]/20 bg-[#F4F8F5]",
        tone === "default" && "border-[#E7E2D6] bg-[#FBF9F4]",
      )}
    >
      <span className="text-[12px] text-[#6B7A70]">{label}</span>
      <span className="font-[var(--font-manrope)] text-[22px] font-bold tabular-nums text-[#14231B]">
        {value}
      </span>
    </div>
  );
}

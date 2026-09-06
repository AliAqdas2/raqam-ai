"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Filter, X } from "lucide-react";
import {
  TransactionFormDialog,
  type TransactionFormData,
} from "@/components/transactions/TransactionFormDialog";
import { DeleteConfirmDialog } from "@/components/transactions/DeleteConfirmDialog";
import { TransactionCard } from "@/components/transactions/TransactionCard";
import {
  useTransactions,
  type Transaction,
  type TransactionType,
  type TransactionFilters,
} from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBudgets } from "@/hooks/useBudgets";
import { useToast } from "@/components/shared/Toast";
import { useLanguage } from "@/components/LanguageProvider";
import {
  ListSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/DataStates";
import { ArrowLeftRight } from "lucide-react";
import { budgetThresholdSeverity } from "@/lib/finance/calculations";
import { formatPKR } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

function formatDateLocal(ms: number, locale: "ur" | "en"): string {
  const d = new Date(ms);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (locale === "ur") {
    if (diffDays === 0) return "آج";
    if (diffDays === 1) return "کل";
    return d.toLocaleDateString("ur-PK", { day: "numeric", month: "short" });
  }
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

export default function TransactionsPage() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | TransactionType>(
    "all",
  );
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
    [],
  );
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);

  const { t, language } = useLanguage();

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = React.useMemo<TransactionFilters>(() => {
    const f: TransactionFilters = {};
    if (debouncedSearch) f.search = debouncedSearch;
    if (typeFilter !== "all") f.type = typeFilter;
    if (selectedCategories.length > 0) f.categoryIds = selectedCategories;
    if (dateFrom) f.dateFrom = new Date(dateFrom).getTime();
    if (dateTo) f.dateTo = new Date(dateTo).getTime() + 86_400_000;
    return f;
  }, [debouncedSearch, typeFilter, selectedCategories, dateFrom, dateTo]);

  const filterKey = `${debouncedSearch}|${typeFilter}|${selectedCategories.join(",")}|${dateFrom}|${dateTo}`;
  const [prevFilterKey, setPrevFilterKey] = React.useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  const {
    transactions,
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions(filters);
  const { categories } = useCategories();
  const { budgetCategories } = useBudgets();
  const { addToast } = useToast();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editData, setEditData] =
    React.useState<Partial<TransactionFormData>>();
  const [editId, setEditId] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{
    id: string;
    desc: string;
    amount: string;
  } | null>(null);

  const getCategory = (catId: string) =>
    categories.find((c) => c.id === catId || c.name === catId);

  const getSourceLabel = (source: string): string => {
    switch (source) {
      case "manual":
        return t("transactions.sourceManual");
      case "conversational":
        return t("transactions.sourceConversational");
      case "voice":
        return t("transactions.sourceVoice");
      case "receipt":
        return t("transactions.sourceReceipt");
      default:
        return t("transactions.sourceImport");
    }
  };

  const hasActiveFilters =
    typeFilter !== "all" ||
    selectedCategories.length > 0 ||
    !!debouncedSearch ||
    !!dateFrom ||
    !!dateTo;

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("all");
    setSelectedCategories([]);
    setDateFrom("");
    setDateTo("");
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId],
    );
  };

  const visibleTransactions = transactions.slice(0, visibleCount);
  const hasMore = transactions.length > visibleCount;

  const handleAdd = () => {
    setEditData(undefined);
    setEditId(null);
    setFormOpen(true);
  };

  const handleEdit = (tx: Transaction) => {
    setEditId(tx.id);
    setEditData({
      type: tx.type,
      amount: String(tx.amount),
      categoryId: tx.categoryId,
      description: tx.descriptionUr ?? tx.description ?? "",
      date: new Date(tx.date).toISOString().slice(0, 10),
      notes: tx.notes ?? "",
    });
    setFormOpen(true);
  };

  const handleDelete = (tx: Transaction) => {
    setDeleteTarget({
      id: tx.id,
      desc: tx.descriptionUr ?? tx.description ?? "",
      amount: formatPKR(tx.amount),
    });
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (data: TransactionFormData) => {
    const amount = parseFloat(data.amount);
    const dateMs = new Date(data.date).getTime();
    if (editId) {
      await updateTransaction({
        id: editId,
        type: data.type,
        amount,
        categoryId: data.categoryId,
        date: dateMs,
        description: data.description,
        notes: data.notes,
        source: "manual",
      });
    } else {
      await createTransaction({
        type: data.type,
        amount,
        categoryId: data.categoryId,
        date: dateMs,
        description: data.description,
        notes: data.notes,
        source: "manual",
      });
    }

    if (data.type === "expense") {
      const bc = budgetCategories.find((b) => b.categoryId === data.categoryId);
      if (bc && bc.limit > 0) {
        const projectedSpent = bc.spent + amount;
        const pct = Math.round((projectedSpent / bc.limit) * 100);
        const severity = budgetThresholdSeverity(projectedSpent, bc.limit);
        const catName =
          categories.find((c) => c.id === data.categoryId)?.nameUr ?? "زمرہ";
        if (severity === "over") {
          addToast({
            type: "error",
            title: `${catName} ${t("transactions.budgetExceeded")}`,
            description: `${formatPKR(projectedSpent)} / ${formatPKR(bc.limit)} (${pct}%)`,
          });
        } else if (severity === "warning") {
          addToast({
            type: "warning",
            title: `${catName} ${t("transactions.budgetWarning")}`,
            description: `${formatPKR(projectedSpent)} / ${formatPKR(bc.limit)} (${pct}%)`,
          });
        }
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteTransaction(deleteTarget.id);
    }
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-[1.7]">
            {t("transactions.title")}
          </h1>
          <p className="text-[14px] text-[#6B7A70]">
            {transactions.length > 0
              ? `${transactions.length} ${t("transactions.entries")}${hasMore ? ` · ${visibleCount} ${t("transactions.showing")}` : ""}`
              : t("transactions.noEntries")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/import"
            className="hidden min-h-11 items-center rounded-[12px] border border-[#DCD6C8] bg-white px-4 text-[14px] hover:bg-[#FBF9F4] sm:inline-flex"
          >
            {t("transactions.importStatement")}
          </Link>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex min-h-11 items-center rounded-[12px] bg-[#0F5132] px-5 text-[14px] font-medium text-white hover:bg-[#14231B]"
          >
            {t("transactions.add")}
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-6 pb-12 pt-6 sm:px-10">
        {/* Compact toolbar — filters behind sheet */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-[12px] border px-4 text-[14px] font-medium",
              hasActiveFilters
                ? "border-[#0F5132] bg-[#E6EFE9] text-[#0F5132]"
                : "border-[#DCD6C8] bg-white text-[#4C5A52]",
            )}
          >
            <Filter className="h-4 w-4" aria-hidden />
            {hasActiveFilters
              ? t("transactions.filtersActive")
              : t("transactions.filter")}
          </button>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 px-2 text-[14px] text-[#B3261E] underline-offset-4 hover:underline"
            >
              {t("transactions.removeFilters")}
            </button>
          ) : null}
        </div>

        {loading && <ListSkeleton rows={6} />}
        {error && <ErrorState />}

        {!loading && !error && transactions.length === 0 && (
          <EmptyState
            icon={ArrowLeftRight}
            title={
              hasActiveFilters
                ? t("transactions.noResults")
                : t("transactions.emptyTitle")
            }
            description={
              hasActiveFilters
                ? t("transactions.noResultsDesc")
                : t("transactions.emptyDesc")
            }
            actionLabel={
              hasActiveFilters
                ? t("transactions.removeFilters")
                : t("transactions.add")
            }
            onAction={hasActiveFilters ? clearFilters : handleAdd}
          />
        )}

        {!loading && !error && transactions.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {visibleTransactions.map((tx, i) => {
              const cat = getCategory(tx.categoryId);
              return (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  categoryName={cat?.nameUr ?? tx.categoryId}
                  categoryIcon={cat?.icon}
                  sourceLabel={getSourceLabel(tx.source)}
                  dateLabel={formatDateLocal(tx.date, language)}
                  index={i}
                  onEdit={() => handleEdit(tx)}
                  onDelete={() => handleDelete(tx)}
                />
              );
            })}

            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="mt-2 min-h-12 rounded-[12px] border border-[#DCD6C8] bg-white text-[14px] text-[#0F5132] hover:bg-[#FBF9F4]"
              >
                {t("transactions.loadMore")} (
                {transactions.length - visibleCount}{" "}
                {t("transactions.remaining")})
              </button>
            )}
          </div>
        )}
      </div>

      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        onClearCategories={() => setSelectedCategories([])}
        categories={categories}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearFilters}
      />

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        initialData={editData}
        onSubmit={handleFormSubmit}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        transactionDescription={deleteTarget?.desc}
        transactionAmount={deleteTarget?.amount}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

// ─── Filter sheet ─────────────────────────────────────────────────────────────

function FilterSheet({
  open,
  onOpenChange,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  selectedCategories,
  onToggleCategory,
  onClearCategories,
  categories,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  hasActiveFilters,
  onClearAll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (v: string) => void;
  typeFilter: "all" | TransactionType;
  onTypeFilterChange: (v: "all" | TransactionType) => void;
  selectedCategories: string[];
  onToggleCategory: (id: string) => void;
  onClearCategories: () => void;
  categories: ReturnType<typeof useCategories>["categories"];
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
}) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal>
      <button
        type="button"
        aria-label={t("common.dismiss")}
        className="absolute inset-0 bg-[#14231B]/40"
        onClick={() => onOpenChange(false)}
      />
      <motion.div
        initial={reduceMotion ? false : { y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[20px] border border-[#E7E2D6] bg-white shadow-xl sm:inset-x-auto sm:end-4 sm:bottom-4 sm:top-4 sm:w-[min(100%,400px)] sm:max-h-none sm:rounded-[16px]"
      >
        <div className="flex items-center justify-between border-b border-[#E7E2D6] px-4 py-3">
          <h2 className="text-[16px] font-bold text-[#14231B]">
            {t("transactions.filterTitle")}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] text-[#6B7A70] hover:bg-[#F1EEE4]"
            aria-label={t("common.dismiss")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[#4C5A52]">
              {t("transactions.searchPlaceholder")}
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("transactions.searchPlaceholder")}
              className="min-h-11 rounded-[12px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 text-[15px] focus:border-[#0F5132] focus:outline-none"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[#4C5A52]">
              {t("transactions.form.type")}
            </span>
            <div className="flex overflow-hidden rounded-[12px] border border-[#DCD6C8]">
              {(
                [
                  ["all", t("transactions.all")],
                  ["expense", t("transactions.expense")],
                  ["income", t("transactions.income")],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onTypeFilterChange(key)}
                  className={cn(
                    "min-h-11 flex-1 px-2 text-[14px]",
                    typeFilter === key
                      ? key === "expense"
                        ? "bg-[#B3261E] text-white"
                        : "bg-[#0F5132] text-white"
                      : "bg-[#FBF9F4] text-[#4C5A52]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[#4C5A52]">
              {t("transactions.category")}
            </span>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-[12px] border border-[#E7E2D6] p-2">
              {categories
                .filter(
                  (c) =>
                    !c.isSystem || c.type === "expense" || c.type === "both",
                )
                .map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onToggleCategory(cat.id)}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-start text-[14px]",
                      selectedCategories.includes(cat.id)
                        ? "bg-[#E6EFE9] text-[#0F5132]"
                        : "hover:bg-[#FBF9F4]",
                    )}
                  >
                    <span>{cat.icon}</span>
                    <span className="flex-1">{cat.nameUr}</span>
                    {selectedCategories.includes(cat.id) ? "✓" : null}
                  </button>
                ))}
            </div>
            {selectedCategories.length > 0 ? (
              <button
                type="button"
                onClick={onClearCategories}
                className="self-start text-[13px] text-[#B3261E]"
              >
                {t("transactions.clearAll")}
              </button>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[#4C5A52]">
              {t("transactions.dateLabel")}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="min-h-11 flex-1 rounded-[12px] border border-[#DCD6C8] bg-[#FBF9F4] px-3 text-[14px]"
                dir="ltr"
              />
              <span className="text-[13px] text-[#8A9690]">
                {t("transactions.dateFrom")}
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="min-h-11 flex-1 rounded-[12px] border border-[#DCD6C8] bg-[#FBF9F4] px-3 text-[14px]"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-[#E7E2D6] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearAll}
              className="min-h-12 flex-1 rounded-[12px] bg-[#F1EEE4] text-[14px] text-[#6B7A70]"
            >
              {t("transactions.removeFilters")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="min-h-12 flex-1 rounded-[12px] bg-[#0F5132] text-[14px] font-medium text-white"
          >
            {t("transactions.filterDone")}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

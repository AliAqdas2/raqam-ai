"use client";

import * as React from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/shared/Toast";
import {
  useImports,
  ImportError,
  type ImportErrorCode,
  type ImportRecord,
  type ImportRowEdits,
} from "@/hooks/useImports";
import { useCategories } from "@/hooks/useCategories";
import { ImportPreviewTable } from "@/components/import/ImportPreviewTable";
import { ImportUploader } from "@/components/import/ImportUploader";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { EmptyState, ListSkeleton } from "@/components/shared/DataStates";
import { formatDate } from "@/lib/i18n/format";
import type { TranslationKey } from "@/lib/i18n/ur";
import { FileUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// app/(app)/import/page.tsx — Bank statement import (Phase 12)
// Mental model: Upload → Review → Save. Nothing persists before confirm.

const ERROR_KEYS: Record<ImportErrorCode, TranslationKey> = {
  unsupportedType: "import.error.unsupportedType",
  fileTooLarge: "import.error.fileTooLarge",
  tooManyRows: "import.error.tooManyRows",
  csvEmpty: "import.error.csvEmpty",
  csvEncoding: "import.error.csvEncoding",
  csvNoHeaders: "import.error.csvNoHeaders",
  csvNoRows: "import.error.csvNoRows",
  csvMalformed: "import.error.csvMalformed",
  missingColumns: "import.error.missingColumns",
  noValidRows: "import.error.noValidRows",
  server: "import.error.server",
};

const STATUS_STYLES: Record<string, string> = {
  preview: "bg-[#FDF3D8] text-[#6B5B2E] border-[#D8A72A]/40",
  confirmed: "bg-[#E6EFE9] text-[#0F5132] border-[#22B07D]/35",
  failed: "bg-[#FDE8E8] text-[#B3261E] border-[#B3261E]/25",
};

function StatusBadge({ status }: { status: ImportRecord["status"] }) {
  const { t } = useLanguage();
  const label =
    status === "preview"
      ? t("import.status.preview")
      : status === "confirmed"
        ? t("import.status.confirmed")
        : status === "failed"
          ? t("import.status.failed")
          : status;
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-[13px] font-semibold",
        STATUS_STYLES[status] ??
          "border-[#E7E2D6] bg-[#F1EEE4] text-[#6B7A70]",
      )}
    >
      {label}
    </span>
  );
}

export default function ImportPage() {
  const { t, language } = useLanguage();
  const { addToast } = useToast();

  const {
    imports,
    importsLoading,
    preview,
    previewLoading,
    openPreview,
    busy,
    uploadFile,
    confirm,
    cancel,
  } = useImports();
  const { categories, loading: categoriesLoading } = useCategories();

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const showError = React.useCallback(
    (err: unknown) => {
      if (err instanceof ImportError) {
        addToast({
          type: "error",
          title: t("common.errorTitle"),
          description: t(ERROR_KEYS[err.code]),
        });
      } else {
        addToast({
          type: "error",
          title: t("common.errorTitle"),
          description: t("import.error.server"),
        });
      }
    },
    [addToast, t],
  );

  const handleFile = React.useCallback(
    async (file: File) => {
      try {
        await uploadFile(file);
      } catch (err) {
        showError(err);
      }
    },
    [uploadFile, showError],
  );

  const handleConfirm = async (edits: ImportRowEdits[]) => {
    try {
      const count = await confirm(edits);
      addToast({
        type: "success",
        title: t("import.successTitle"),
        description: `${t("import.successDescPrefix")}${count}${t("import.successDescSuffix")}`,
      });
    } catch (err) {
      showError(err);
      throw err;
    }
  };

  const handleCancel = async (importId?: string) => {
    try {
      await cancel(importId);
      addToast({
        type: "info",
        title: t("import.cancelled"),
      });
    } catch (err) {
      showError(err);
    }
  };

  const locale = language === "ur" ? "ur" : "en";
  const flowStep =
    busy === "confirming" ? 2 : preview || previewLoading ? 1 : 0;
  const progressLabel =
    flowStep === 0
      ? t("import.step.1")
      : flowStep === 1
        ? t("import.step.2")
        : t("import.step.3");

  return (
    <div>
      <header className="sticky top-0 z-[5] flex flex-col gap-4 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-[1.7]">
            {t("import.title")}
          </h1>
          <p className="text-[14px] text-[#6B7A70]">{t("import.subtitle")}</p>
        </div>
      </header>

      <div className="flex flex-col gap-8 px-6 py-7 sm:px-10">
        <StepHeader
          step={flowStep}
          totalSteps={3}
          progressLabel={progressLabel}
        />

        {previewLoading && !preview ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-[#E7E2D6] bg-white px-6 py-16">
            <Loader2 className="h-5 w-5 animate-spin text-[#0F5132]" />
            <span className="text-[14px] text-[#6B7A70]">
              {t("common.loading")}
            </span>
          </div>
        ) : preview ? (
          <ImportPreviewTable
            key={preview.import.id}
            fileName={preview.import.fileName}
            rowCount={preview.import.rowCount}
            duplicateCount={preview.import.duplicateCount}
            skippedCount={preview.import.skippedCount}
            rows={preview.rows}
            categories={categories}
            categoriesLoading={categoriesLoading}
            busy={busy}
            onConfirm={handleConfirm}
            onCancel={() => handleCancel()}
          />
        ) : (
          <ImportUploader
            busy={busy === "uploading"}
            onFile={handleFile}
            inputRef={fileInputRef}
          />
        )}

        <section className="flex flex-col gap-4">
          <h2 className="text-[18px] font-bold">{t("import.historyTitle")}</h2>
          {importsLoading ? (
            <ListSkeleton rows={3} />
          ) : imports.length === 0 ? (
            <EmptyState
              icon={FileUp}
              title={t("import.historyEmptyTitle")}
              description={t("import.historyEmptyDesc")}
              actionLabel={t("import.historyEmptyAction")}
              onAction={() => fileInputRef.current?.click()}
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {imports.map((imp) => (
                <div
                  key={imp.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E7E2D6] bg-white px-4 py-3.5"
                >
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">
                        {imp.fileName}
                      </span>
                      <StatusBadge status={imp.status} />
                    </div>
                    <span className="text-[13px] text-[#6B7A70]">
                      {formatDate(imp.createdAt, locale)}
                      {imp.rowCount != null &&
                        ` · ${t("import.rowsLabel")}: ${imp.rowCount}`}
                      {imp.importedCount != null &&
                        ` · ${t("import.importedLabel")}: ${imp.importedCount}`}
                      {imp.duplicateCount != null &&
                        imp.duplicateCount > 0 &&
                        ` · ${t("import.duplicate")}: ${imp.duplicateCount}`}
                    </span>
                  </div>
                  {imp.status === "preview" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openPreview(imp.id)}
                        disabled={busy !== null}
                        className="min-h-11 rounded-[10px] bg-[#0F5132] px-4 text-[14px] text-white hover:bg-[#14231B] disabled:opacity-50"
                      >
                        {t("import.resume")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancel(imp.id)}
                        disabled={busy !== null}
                        className="min-h-11 rounded-[10px] bg-[#F1EEE4] px-4 text-[14px] text-[#6B7A70] hover:bg-[#E9E4D5] disabled:opacity-50"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

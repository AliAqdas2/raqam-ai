"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FileUp, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

export interface ImportUploaderProps {
  busy: boolean;
  onFile: (file: File) => void | Promise<void>;
  /** Optional ref so parent empty-state can trigger browse */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * Warm-ledger CSV drop zone — tap-to-browse is primary; drag is optional.
 */
export function ImportUploader({ busy, onFile, inputRef }: ImportUploaderProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const localRef = React.useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const [dragging, setDragging] = React.useState(false);
  const [pulse, setPulse] = React.useState(false);

  const triggerPulse = React.useCallback(() => {
    if (reduceMotion) return;
    setPulse(true);
    window.setTimeout(() => setPulse(false), 450);
  }, [reduceMotion]);

  const acceptFile = React.useCallback(
    async (file: File | undefined) => {
      if (!file || busy) return;
      triggerPulse();
      await onFile(file);
    },
    [busy, onFile, triggerPulse],
  );

  const openPicker = () => {
    if (!busy) ref.current?.click();
  };

  return (
    <motion.div
      animate={
        pulse
          ? { scale: [1, 1.015, 1], borderColor: ["#CBD9CF", "#0F5132", "#CBD9CF"] }
          : undefined
      }
      transition={{ duration: 0.4 }}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void acceptFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "relative flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed bg-[#F7F4EC] px-6 py-10 text-center transition-colors",
        dragging
          ? "border-[#0F5132] bg-[#F4F8F5]"
          : "border-[#CBD9CF]",
        busy && "cursor-wait opacity-80",
      )}
    >
      {/* Soft warm grid — not tech-dark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.45]"
        style={{
          backgroundImage:
            "linear-gradient(#E7E2D6 1px, transparent 1px), linear-gradient(90deg, #E7E2D6 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 75%)",
        }}
      />

      <div className="relative z-[1] flex flex-col items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#0F5132] shadow-sm ring-1 ring-[#E7E2D6]">
          {busy ? (
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
          ) : (
            <FileUp className="h-7 w-7" aria-hidden />
          )}
        </span>

        <div className="flex max-w-md flex-col gap-1.5">
          <h3 className="font-[var(--font-noto-nastaliq-urdu)] text-[20px] font-bold leading-[1.8] text-[#14231B]">
            {t("import.uploadTitle")}
          </h3>
          <p className="text-[14px] leading-[1.9] text-[#6B7A70]">
            {t("import.uploadDesc")}
          </p>
          <p className="text-[13px] text-[#8A9690]">{t("import.uploadSizeHint")}</p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-[#0F5132] px-6 text-[15px] font-medium text-white outline-none transition-colors hover:bg-[#14231B] focus-visible:ring-2 focus-visible:ring-[#E8B931] focus-visible:ring-offset-2 disabled:opacity-70"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t("import.uploading")}
            </>
          ) : (
            <>
              <FileUp className="h-4 w-4" aria-hidden />
              {t("import.selectFile")}
            </>
          )}
        </button>

        <p className="text-[12px] text-[#9BA79F]">{t("import.uploadDragHint")}</p>
      </div>

      <input
        ref={ref}
        type="file"
        accept=".csv,text/csv,application/csv"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          void acceptFile(file);
          e.target.value = "";
        }}
      />
    </motion.div>
  );
}

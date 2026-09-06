"use client";

import * as React from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatefulButtonStatus = "idle" | "loading" | "success";

export interface StatefulButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  children: React.ReactNode;
  /** Shown while pending (default: children + ellipsis feel via spinner) */
  loadingLabel?: React.ReactNode;
  /** Shown briefly on success (checkmark + label) */
  successLabel?: React.ReactNode;
  /**
   * Controlled status. When omitted, the button drives loading/success from
   * an async `onClick` promise (reverts to idle on throw).
   */
  status?: StatefulButtonStatus;
  onClick?: (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void | Promise<void>;
  /** How long to keep the success check before calling onSuccessSettle */
  successDurationMs?: number;
  /** Fires after the success flash (controlled or uncontrolled) */
  onSuccessSettle?: () => void;
}

/**
 * Primary CTA with idle → loading → success feedback.
 * Raqam green, min 48px tall. Inspired by Aceternity Stateful Button —
 * no shimmer/magnetic effects.
 */
export function StatefulButton({
  children,
  loadingLabel,
  successLabel,
  status: controlledStatus,
  onClick,
  disabled,
  className,
  type = "button",
  successDurationMs = 500,
  onSuccessSettle,
  ...rest
}: StatefulButtonProps) {
  const reduceMotion = useReducedMotion();
  const [internal, setInternal] =
    React.useState<StatefulButtonStatus>("idle");
  const status = controlledStatus ?? internal;
  const pendingRef = React.useRef(false);

  const runSuccessFlash = React.useCallback(() => {
    if (controlledStatus !== undefined) {
      onSuccessSettle?.();
      return;
    }
    setInternal("success");
    window.setTimeout(() => {
      setInternal("idle");
      onSuccessSettle?.();
    }, successDurationMs);
  }, [controlledStatus, onSuccessSettle, successDurationMs]);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || status === "loading" || status === "success") {
      e.preventDefault();
      return;
    }
    if (!onClick) return;

    const result = onClick(e);
    if (result && typeof (result as Promise<void>).then === "function") {
      if (controlledStatus === undefined) {
        if (pendingRef.current) return;
        pendingRef.current = true;
        setInternal("loading");
      }
      try {
        await result;
        if (controlledStatus === undefined) {
          runSuccessFlash();
        } else {
          onSuccessSettle?.();
        }
      } catch {
        if (controlledStatus === undefined) setInternal("idle");
      } finally {
        pendingRef.current = false;
      }
    }
  };

  const isBusy = status === "loading" || status === "success";
  const label =
    status === "loading"
      ? (loadingLabel ?? children)
      : status === "success"
        ? (successLabel ?? children)
        : children;

  return (
    <button
      type={type}
      disabled={disabled || isBusy}
      onClick={handleClick}
      aria-busy={status === "loading"}
      className={cn(
        "relative inline-flex min-h-12 min-w-[8rem] items-center justify-center gap-2 overflow-hidden rounded-[12px] bg-[#0F5132] px-6 text-[15px] font-medium text-white outline-none transition-colors",
        "hover:bg-[#14231B] focus-visible:ring-2 focus-visible:ring-[#E8B931] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-70",
        className,
      )}
      {...rest}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          className="inline-flex items-center justify-center gap-2"
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : null}
          {status === "success" ? (
            <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          ) : null}
          <span>{label}</span>
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

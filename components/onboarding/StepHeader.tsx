"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_NUMBERS = ["۱", "۲", "۳"] as const;

export interface StepHeaderProps {
  /** 0-based current step */
  step: number;
  totalSteps: number;
  /** Full progress line, e.g. "قدم ۱ از ۳ — آمدنی" */
  progressLabel: string;
}

/**
 * Numbered Urdu stepper: circles (done = check, active = green fill)
 * plus an explicit “قدم N از M — …” label.
 */
export function StepHeader({
  step,
  totalSteps,
  progressLabel,
}: StepHeaderProps) {
  return (
    <div className="mb-5 flex flex-col items-center gap-3">
      <p
        className="font-[var(--font-noto-nastaliq-urdu)] text-[15px] font-semibold leading-[1.9] text-[#0F5132]"
        aria-live="polite"
      >
        {progressLabel}
      </p>

      <ol className="flex items-center gap-0" aria-label={progressLabel}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={i} className="flex items-center">
              {i > 0 ? (
                <span
                  aria-hidden
                  className={cn(
                    "mx-1.5 h-0.5 w-8 rounded-full sm:w-10",
                    i <= step ? "bg-[#0F5132]" : "bg-[#DCD6C8]",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full text-[15px] font-semibold transition-colors",
                  done && "bg-[#0F5132] text-white",
                  active &&
                    "bg-[#0F5132] text-white ring-4 ring-[#0F5132]/20",
                  !done &&
                    !active &&
                    "border-2 border-[#DCD6C8] bg-white text-[#6B7A70]",
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? (
                  <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                ) : (
                  <span className="font-[var(--font-noto-nastaliq-urdu)] leading-none">
                    {STEP_NUMBERS[i] ?? String(i + 1)}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

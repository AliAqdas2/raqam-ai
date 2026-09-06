"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, Upload, Settings, type LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type MoreLink = {
  href: string;
  labelKey: "nav.goals" | "nav.import" | "nav.settings";
  icon: LucideIcon;
};

const MORE_LINKS: MoreLink[] = [
  { href: "/goals", labelKey: "nav.goals", icon: Target },
  { href: "/import", labelKey: "nav.import", icon: Upload },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

/** Routes that live under the mobile "More" sheet (not in the 5-tab bar). */
export const MOBILE_MORE_HREFS = MORE_LINKS.map((l) => l.href);

export function isMobileMoreRoute(pathname: string): boolean {
  return MORE_LINKS.some((l) => isActive(pathname, l.href));
}

interface MobileMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Bottom sheet for phone users: Goals, Import, Settings.
 * Large icon+Urdu rows — no English chrome.
 */
export function MobileMoreSheet({ open, onOpenChange }: MobileMoreSheetProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Bottom sheet (override centered dialog defaults)
          "top-auto bottom-0 start-1/2 z-[60] max-h-[min(70vh,28rem)] w-full max-w-full translate-x-[-50%] translate-y-0 gap-0 rounded-t-[20px] rounded-b-none border border-[#E7E2D6] bg-[#F7F4EC] p-0 shadow-[0_-8px_32px_rgba(20,35,27,0.12)] ring-0",
          "rtl:translate-x-[50%]",
          "data-open:slide-in-from-bottom-4 data-closed:slide-out-to-bottom-4 data-open:zoom-in-100 data-closed:zoom-out-100",
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="flex justify-center pt-3 pb-1" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-[#DCD6C8]" />
        </div>

        <DialogHeader className="gap-1 px-5 pb-3 pt-1 text-start">
          <DialogTitle className="text-[18px] font-bold leading-[1.7] text-[#14231B]">
            {t("nav.moreTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("nav.moreTitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5 px-3 pb-3">
          {MORE_LINKS.map(({ href, labelKey, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => onOpenChange(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-[14px] px-4 py-3 text-[16px] leading-[1.7] outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-[#0F5132] focus-visible:ring-offset-2",
                  active
                    ? "bg-[#0F5132] font-semibold text-white"
                    : "bg-white text-[#14231B] hover:bg-[#E6EFE9]",
                )}
              >
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-[12px]",
                    active ? "bg-white/15 text-[#E8B931]" : "bg-[#E6EFE9] text-[#0F5132]",
                  )}
                >
                  <Icon className="h-[22px] w-[22px]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">{t(labelKey)}</span>
              </Link>
            );
          })}
        </div>

        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex min-h-12 w-full items-center justify-center rounded-[12px] border border-[#DCD6C8] bg-white text-[15px] font-medium text-[#6B7A70] outline-none transition-colors hover:bg-[#F1EEE4] focus-visible:ring-2 focus-visible:ring-[#0F5132] focus-visible:ring-offset-2"
          >
            {t("nav.moreClose")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

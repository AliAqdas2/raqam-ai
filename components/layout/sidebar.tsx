"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  MessageSquare,
  Settings,
  Upload,
  LogOut,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import {
  MobileMoreSheet,
  isMobileMoreRoute,
} from "@/components/layout/MobileMoreSheet";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Literacy-bridge entry — stronger visual weight */
  featured?: boolean;
};

function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  featured,
}: NavLink & { active: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        // Logical padding — icons stay on the inline-start side in RTL/LTR
        "relative flex items-center gap-3 rounded-[12px] ps-3 pe-3 py-2.5 leading-[1.7] outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-[#E8B931] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B3B26]",
        featured ? "min-h-12 text-[16px]" : "min-h-11 text-[15px]",
        active
          ? "bg-[#E8B931] font-semibold text-[#0B3B26] shadow-[0_1px_0_rgba(0,0,0,0.12)]"
          : featured
            ? "bg-[#E8B931]/16 font-medium text-[#F7ECC0] hover:bg-[#E8B931]/25"
            : "bg-transparent text-[#C4D6C9] hover:bg-white/[0.09]",
      )}
    >
      {active && !reduceMotion ? (
        <motion.span
          layoutId="sidebar-active-pill"
          className="pointer-events-none absolute inset-0 rounded-[12px] bg-[#E8B931]"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          aria-hidden
        />
      ) : null}
      <Icon
        className={cn(
          "relative z-[1] shrink-0",
          featured ? "h-6 w-6" : "h-[22px] w-[22px]",
          active
            ? "text-[#0B3B26]"
            : featured
              ? "text-[#E8B931]"
              : "text-[#8FB49E]",
        )}
        aria-hidden
      />
      <span className="relative z-[1] min-w-0 flex-1 overflow-visible whitespace-nowrap">
        {label}
      </span>
    </Link>
  );
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavLink[];
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="px-3 pb-1.5 text-[12px] leading-[1.7] text-[#5F8C74]">
        {title}
      </span>
      {items.map((item) => (
        <NavItem
          key={item.href}
          {...item}
          active={isNavActive(pathname, item.href)}
        />
      ))}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();

  const displayName = user?.name || user?.username || t("nav.userFallback");
  const displayContact = user?.email || user?.phone || user?.username || "";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 1)
    .toUpperCase();

  // 1) Primary — dashboard, assistant (literacy bridge), transactions
  const mainNav: NavLink[] = [
    {
      href: "/dashboard",
      label: t("nav.dashboard"),
      icon: LayoutDashboard,
    },
    {
      href: "/assistant",
      label: t("nav.assistant"),
      icon: MessageSquare,
      featured: true,
    },
    {
      href: "/transactions",
      label: t("nav.transactions"),
      icon: ArrowLeftRight,
    },
  ];

  // 2) Money — budgets + goals (second of max two section labels)
  const moneyNav: NavLink[] = [
    { href: "/budgets", label: t("nav.budgets"), icon: Wallet },
    { href: "/goals", label: t("nav.goals"), icon: Target },
  ];

  // 3) Tools — no third section title (plan: max 2 labels); Settings last
  const toolsNav: NavLink[] = [
    { href: "/import", label: t("nav.import"), icon: Upload },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 flex-col gap-7 overflow-y-auto bg-[#0B3B26] px-5 py-[26px] text-[#DCE7DF] lg:flex">
      {/* Brand — Nastaliq mark + رقم always visible (no hover gate) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-[#E8B931] pb-1 font-[var(--font-noto-nastaliq-urdu)] text-[19px] font-bold leading-none text-[#0B3B26]">
            ر
          </div>
          <div className="flex flex-col">
            <span className="font-[var(--font-noto-nastaliq-urdu)] text-[20px] font-bold leading-[1.7] text-white">
              رقم
            </span>
            <span className="font-[var(--font-manrope)] text-[10px] tracking-[.22em] text-[#8FB49E]">
              RAQAM&nbsp;AI
            </span>
          </div>
        </div>
        <p className="mt-2 text-[13px] leading-[1.9] text-[#8FB49E]">
          {t("nav.tagline")}
        </p>
      </div>

      <nav
        className="flex flex-1 flex-col gap-6 overflow-y-auto overflow-x-visible"
        aria-label={t("nav.sectionMain")}
      >
        <NavSection
          title={t("nav.sectionMain")}
          items={mainNav}
          pathname={pathname}
        />
        <NavSection
          title={t("nav.sectionMoney")}
          items={moneyNav}
          pathname={pathname}
        />
        {/* Tools: untitled group under a soft divider — keeps section labels ≤ 2 */}
        <div className="flex flex-col gap-1 border-t border-white/[0.1] pt-4">
          {toolsNav.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={isNavActive(pathname, item.href)}
            />
          ))}
        </div>
      </nav>

      {/* User + sign-out — ≥44px hit targets */}
      <div className="flex items-center justify-between gap-2 border-t border-white/[.12] pt-4">
        <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1E5B3E] text-[14px] text-[#DCE7DF]">
            {initials || "؟"}
          </div>
          <div className="flex min-w-0 flex-col leading-[1.6]">
            <span className="truncate text-[14px] text-white">{displayName}</span>
            {displayContact ? (
              <span className="truncate font-[var(--font-manrope)] text-[11px] text-[#8FB49E]">
                {displayContact}
              </span>
            ) : null}
          </div>
        </div>
        <SignOutButton redirectUrl="/login">
          <button
            type="button"
            aria-label={t("nav.signOut")}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[#8FB49E] outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#E8B931] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B3B26]"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [moreOpen, setMoreOpen] = React.useState(false);

  // گھر · لین دین · معاون (center) · بجٹ · مزید
  const sideTabs: {
    id: string;
    href?: string;
    label: string;
    icon: LucideIcon;
    more?: boolean;
  }[] = [
    {
      id: "home",
      href: "/dashboard",
      label: t("nav.home"),
      icon: LayoutDashboard,
    },
    {
      id: "txns",
      href: "/transactions",
      label: t("nav.transactions"),
      icon: ArrowLeftRight,
    },
    {
      id: "budgets",
      href: "/budgets",
      label: t("nav.budgets"),
      icon: Wallet,
    },
    {
      id: "more",
      label: t("nav.more"),
      icon: Menu,
      more: true,
    },
  ];

  // Split around center assistant: [home, txns] | assistant | [budgets, more]
  const leftTabs = sideTabs.slice(0, 2);
  const rightTabs = sideTabs.slice(2);
  const assistantActive = isNavActive(pathname, "/assistant");
  const moreActive = isMobileMoreRoute(pathname);

  return (
    <>
      <nav
        aria-label={t("nav.sectionMain")}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E7E2D6] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="relative flex h-[3.75rem] items-stretch justify-around px-1">
          {leftTabs.map((item) => (
            <MobileTab
              key={item.id}
              href={item.href!}
              label={item.label}
              icon={item.icon}
              active={isNavActive(pathname, item.href!)}
              reduceMotion={!!reduceMotion}
            />
          ))}

          {/* Center hero — Assistant (literacy bridge) */}
          <Link
            href="/assistant"
            aria-current={assistantActive ? "page" : undefined}
            className="relative flex w-[4.75rem] shrink-0 flex-col items-center justify-end rounded-[12px] pb-1 outline-none focus-visible:ring-2 focus-visible:ring-[#E8B931] focus-visible:ring-offset-2"
          >
            <span
              className={cn(
                "absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full transition-transform",
                assistantActive
                  ? "bg-[#E8B931] text-[#0B3B26] shadow-[0_6px_16px_rgba(232,185,49,0.45)]"
                  : "bg-[#0F5132] text-[#E8B931] shadow-[0_6px_16px_rgba(15,81,50,0.35)] active:scale-95",
              )}
            >
              <MessageSquare className="h-6 w-6" aria-hidden />
            </span>
            <span
              className={cn(
                "mt-[1.85rem] max-w-full truncate text-[12px] leading-[1.3]",
                assistantActive
                  ? "font-semibold text-[#0F5132]"
                  : "font-medium text-[#0F5132]",
              )}
            >
              {t("nav.assistant")}
            </span>
          </Link>

          {rightTabs.map((item) =>
            item.more ? (
              <button
                key={item.id}
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-expanded={moreOpen}
                aria-haspopup="dialog"
                className={cn(
                  "relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[12px] leading-[1.3] outline-none",
                  "focus-visible:ring-2 focus-visible:ring-[#0F5132] focus-visible:ring-offset-2",
                  moreActive || moreOpen
                    ? "font-semibold text-[#0F5132]"
                    : "text-[#6B7A70]",
                )}
              >
                {(moreActive || moreOpen) && !reduceMotion ? (
                  <motion.span
                    layoutId="mobile-tab"
                    className="pointer-events-none absolute inset-x-1 inset-y-1 rounded-[12px] bg-[#E6EFE9]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    aria-hidden
                  />
                ) : (moreActive || moreOpen) && reduceMotion ? (
                  <span
                    className="pointer-events-none absolute inset-x-1 inset-y-1 rounded-[12px] bg-[#E6EFE9]"
                    aria-hidden
                  />
                ) : null}
                <Menu
                  className="relative z-[1] h-[22px] w-[22px]"
                  aria-hidden
                />
                <span className="relative z-[1] max-w-full truncate">
                  {item.label}
                </span>
              </button>
            ) : (
              <MobileTab
                key={item.id}
                href={item.href!}
                label={item.label}
                icon={item.icon}
                active={isNavActive(pathname, item.href!)}
                reduceMotion={!!reduceMotion}
              />
            ),
          )}
        </div>
      </nav>

      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}

function MobileTab({
  href,
  label,
  icon: Icon,
  active,
  reduceMotion,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  reduceMotion: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[12px] leading-[1.3] outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#0F5132] focus-visible:ring-offset-2",
        active ? "font-semibold text-[#0F5132]" : "text-[#6B7A70]",
      )}
    >
      {active && !reduceMotion ? (
        <motion.span
          layoutId="mobile-tab"
          className="pointer-events-none absolute inset-x-1 inset-y-1 rounded-[12px] bg-[#E6EFE9]"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          aria-hidden
        />
      ) : active && reduceMotion ? (
        <span
          className="pointer-events-none absolute inset-x-1 inset-y-1 rounded-[12px] bg-[#E6EFE9]"
          aria-hidden
        />
      ) : null}
      <Icon className="relative z-[1] h-[22px] w-[22px]" aria-hidden />
      <span className="relative z-[1] max-w-full truncate">{label}</span>
    </Link>
  );
}

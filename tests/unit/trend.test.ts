import { describe, it, expect } from "vitest";
import {
  buildMonthlyTrend,
  expenseChangePct,
  lastMonthStarts,
  type TrendTxn,
} from "@/lib/finance/trend";

const d = (y: number, m: number, day: number) =>
  new Date(y, m - 1, day).getTime();

describe("lastMonthStarts", () => {
  it("returns oldest-first month starts, crossing a year boundary", () => {
    const starts = lastMonthStarts(new Date(2026, 1, 15), 4); // Feb 2026
    expect(starts).toEqual([
      d(2025, 11, 1),
      d(2025, 12, 1),
      d(2026, 1, 1),
      d(2026, 2, 1),
    ]);
  });
});

describe("buildMonthlyTrend", () => {
  const months = [d(2026, 8, 1), d(2026, 9, 1), d(2026, 10, 1)];

  it("sums income and expenses per month and computes net", () => {
    const txns: TrendTxn[] = [
      { type: "income", amount: 80_000, date: d(2026, 8, 1) },
      { type: "expense", amount: 12_000, date: d(2026, 8, 31) },
      { type: "expense", amount: 5_000, date: d(2026, 9, 10) },
      { type: "income", amount: 80_000, date: d(2026, 10, 1) },
      { type: "expense", amount: 1_500, date: d(2026, 10, 22) },
    ];
    expect(buildMonthlyTrend(txns, months)).toEqual([
      { month: months[0], income: 80_000, expenses: 12_000, net: 68_000 },
      { month: months[1], income: 0, expenses: 5_000, net: -5_000 },
      { month: months[2], income: 80_000, expenses: 1_500, net: 78_500 },
    ]);
  });

  it("ignores transactions outside the window", () => {
    const txns: TrendTxn[] = [
      { type: "expense", amount: 999, date: d(2026, 7, 31) },
      { type: "expense", amount: 999, date: d(2026, 11, 1) },
    ];
    const res = buildMonthlyTrend(txns, months);
    expect(res.every((p) => p.expenses === 0)).toBe(true);
  });

  it("excludes unconfirmed (pendingConfirmation) transactions", () => {
    const txns: TrendTxn[] = [
      { type: "expense", amount: 700, date: d(2026, 9, 5), pendingConfirmation: true },
      { type: "expense", amount: 300, date: d(2026, 9, 6) },
    ];
    expect(buildMonthlyTrend(txns, months)[1].expenses).toBe(300);
  });

  it("returns zeroed months for no data and [] for no months", () => {
    expect(buildMonthlyTrend([], months).map((p) => p.net)).toEqual([0, 0, 0]);
    expect(buildMonthlyTrend([], [])).toEqual([]);
  });
});

describe("expenseChangePct", () => {
  const pt = (expenses: number) => ({ month: 0, income: 0, expenses, net: 0 });

  it("computes the change from the previous month", () => {
    expect(expenseChangePct([pt(10_000), pt(12_500)])).toBe(25);
    expect(expenseChangePct([pt(10_000), pt(8_000)])).toBe(-20);
  });

  it("is null without a comparable previous month", () => {
    expect(expenseChangePct([pt(500)])).toBeNull();
    expect(expenseChangePct([pt(0), pt(500)])).toBeNull();
  });
});

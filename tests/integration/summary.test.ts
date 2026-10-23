// @vitest-environment edge-runtime
//
// convex/summary.ts — getFinancialSummary + getIntelligenceData. Calculation
// correctness (AGENTS.md §12) and per-user scoping.

import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import { modules, seedUser, addTxn, midMonth, SUBJECT_A, SUBJECT_B } from "./_helpers";

describe("summary.getFinancialSummary", () => {
  test("computes month totals, savings rate and category breakdown from real rows", async () => {
    const t = convexTest(schema, modules);
    const { userId, cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    await addTxn(t, userId, cat("salary"), "income", 100_000, midMonth(0));
    await addTxn(t, userId, cat("food"), "expense", 30_000, midMonth(0));
    await addTxn(t, userId, cat("transportation"), "expense", 10_000, midMonth(0));
    await addTxn(t, userId, cat("food"), "expense", 5_000, midMonth(-1)); // prior month

    const s = await asUser.query(api.summary.getFinancialSummary, {});
    expect(s.totalIncome).toBe(100_000);
    expect(s.totalExpenses).toBe(40_000);
    expect(s.netSavings).toBe(60_000);
    expect(s.savingsRate).toBeCloseTo(60);

    const food = s.categoryBreakdown.find((c) => c.name === "food");
    expect(food?.amount).toBe(30_000);
    expect(food?.percentage).toBeCloseTo(75);
    const pctSum = s.categoryBreakdown.reduce((n, c) => n + c.percentage, 0);
    expect(pctSum).toBeCloseTo(100);

    expect(s.recentTransactions.length).toBeLessThanOrEqual(5);
  });

  test("savings rate is 0 when there is no income", async () => {
    const t = convexTest(schema, modules);
    const { userId, cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });
    await addTxn(t, userId, cat("food"), "expense", 1_000, midMonth(0));

    const s = await asUser.query(api.summary.getFinancialSummary, {});
    expect(s.savingsRate).toBe(0);
    expect(s.netSavings).toBe(-1_000);
  });

  test("only the caller's data is summarized", async () => {
    const t = convexTest(schema, modules);
    const a = await seedUser(t, SUBJECT_A);
    await seedUser(t, SUBJECT_B);
    await addTxn(t, a.userId, a.cat("salary"), "income", 100_000, midMonth(0));

    const asB = t.withIdentity({ subject: SUBJECT_B });
    const s = await asB.query(api.summary.getFinancialSummary, {});
    expect(s.totalIncome).toBe(0);
    expect(s.totalExpenses).toBe(0);
  });
});

describe("summary.getIntelligenceData", () => {
  test("returns 3 historical months and per-category rolling averages", async () => {
    const t = convexTest(schema, modules);
    const { userId, cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    await addTxn(t, userId, cat("food"), "expense", 5_000, midMonth(-3));
    await addTxn(t, userId, cat("food"), "expense", 5_000, midMonth(-2));
    await addTxn(t, userId, cat("food"), "expense", 5_000, midMonth(-1));
    await addTxn(t, userId, cat("food"), "expense", 7_000, midMonth(0));

    const d = await asUser.query(api.summary.getIntelligenceData, {});
    expect(d.historicalMonths).toHaveLength(3);

    const food = d.categoryRollingAverages.find((c) => c.name === "food");
    expect(food?.average).toBeCloseTo(5_000);
    expect(food?.currentSpend).toBe(7_000);
    expect(food?.monthsWithSpend).toBe(3);

    expect(d.currentMonth.totalDaysInMonth).toBeGreaterThanOrEqual(28);
    expect(d.currentMonth.daysElapsed).toBeGreaterThanOrEqual(1);
  });
});

describe("summary.getMonthlyTrend", () => {
  test("returns 6 oldest-first months summed from real rows, caller only", async () => {
    const t = convexTest(schema, modules);
    const a = await seedUser(t, SUBJECT_A);
    const b = await seedUser(t, SUBJECT_B);

    await addTxn(t, a.userId, a.cat("salary"), "income", 90_000, midMonth(0));
    await addTxn(t, a.userId, a.cat("food"), "expense", 20_000, midMonth(0));
    await addTxn(t, a.userId, a.cat("food"), "expense", 15_000, midMonth(-2));
    await addTxn(t, a.userId, a.cat("food"), "expense", 7_000, midMonth(-7)); // outside window
    await addTxn(t, b.userId, b.cat("food"), "expense", 99_999, midMonth(0)); // other user

    const trend = await t
      .withIdentity({ subject: SUBJECT_A })
      .query(api.summary.getMonthlyTrend, {});

    expect(trend).toHaveLength(6);
    expect(trend.map((p) => p.month)).toEqual(
      [...trend.map((p) => p.month)].sort((x, y) => x - y),
    );
    expect(trend[5]).toMatchObject({ income: 90_000, expenses: 20_000, net: 70_000 });
    expect(trend[3].expenses).toBe(15_000);
    expect(trend.reduce((n, p) => n + p.expenses, 0)).toBe(35_000);
  });

  test("rejects unauthenticated callers", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.summary.getMonthlyTrend, {})).rejects.toThrow();
  });
});

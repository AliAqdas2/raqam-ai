import { query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";
import type { Id } from "./_generated/dataModel";
import { buildMonthlyTrend, lastMonthStarts } from "@/lib/finance/trend";

// ─── Arg types ──────────────────────────────────────────────────────────────────

type SummaryArgs = { month?: number };

// ─── Queries ────────────────────────────────────────────────────────────────────

/**
 * Computes a financial summary for the authenticated user's current month.
 * Includes: total income, total expenses, net savings, savings rate,
 * category spending breakdown, recent transactions, and upcoming bills.
 */
export const getFinancialSummary = query({
  args: { month: v.optional(v.number()) },
  handler: async (ctx: QueryCtx, args: SummaryArgs) => {
    const user = await requireUser(ctx);
    const month = args.month ?? getFirstOfMonth();

    // Compute month boundaries
    const monthEnd = new Date(month);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const monthEndMs = monthEnd.getTime();

    // Fetch all transactions for this month
    const allTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", user._id).gte("date", month).lt("date", monthEndMs),
      )
      .collect();

    // Compute totals
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of allTransactions) {
      if (t.type === "income") totalIncome += t.amount;
      else totalExpenses += t.amount;
    }

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Category breakdown for expenses
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const categoryMap = new Map<Id<"categories">, (typeof categories)[number]>(
      categories.map((c) => [c._id, c]),
    );

    const expenseByCategory = new Map<string, number>();
    for (const t of allTransactions) {
      if (t.type === "expense") {
        expenseByCategory.set(
          t.categoryId,
          (expenseByCategory.get(t.categoryId) ?? 0) + t.amount,
        );
      }
    }

    const categoryBreakdown = Array.from(expenseByCategory.entries()).map(
      ([catId, amount]) => {
        const cat = categoryMap.get(catId as Id<"categories">);
        return {
          categoryId: catId,
          name: cat?.name ?? "Unknown",
          nameUr: cat?.nameUr ?? "نامعلوم",
          icon: cat?.icon ?? "📦",
          color: cat?.color ?? "#6b7280",
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        };
      },
    );

    // Recent transactions (last 5 of this month, newest first)
    const sortedMonthTx = [...allTransactions].sort(
      (a, b) => b.createdAt - a.createdAt,
    );
    const recentTx = sortedMonthTx.slice(0, 5);

    const recentTransactions = recentTx.map((t) => {
      const cat = categoryMap.get(t.categoryId);
      const date = new Date(t.date);
      const formattedDate = date.toLocaleDateString("ur-PK", {
        month: "short",
        day: "numeric",
      });
      return {
        id: t._id,
        icon: cat?.icon ?? "📦",
        label: t.description ?? t.descriptionUr ?? cat?.nameUr ?? "لین دین",
        meta: formattedDate,
        amount: t.amount,
        type: t.type as "income" | "expense",
      };
    });

    // Upcoming bills (active recurring expenses due within 7 days)
    const now = Date.now();
    const sevenDays = now + 7 * 24 * 60 * 60 * 1000;

    const recurring = await ctx.db
      .query("recurringExpenses")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.gte(q.field("nextDueDate"), now),
          q.lte(q.field("nextDueDate"), sevenDays),
        ),
      )
      .collect();

    // Group by category and sum
    const billsMap = new Map<string, number>();
    for (const r of recurring) {
      const cat = categoryMap.get(r.categoryId);
      const label = r.description || cat?.nameUr || "بل";
      billsMap.set(label, (billsMap.get(label) ?? 0) + r.amount);
    }

    const upcomingBills = Array.from(billsMap.entries()).map(
      ([label, amount]) => ({
        label,
        amount: amount.toString(),
      }),
    );

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      categoryBreakdown,
      recentTransactions,
      upcomingBills,
    };
  },
});

// ─── Intelligence data ─────────────────────────────────────────────────────────

/**
 * Returns 3 months of financial data for AI intelligence computations.
 * Used by the context builder to feed projections, anomaly detection,
 * and what-if analysis into pure calculation functions.
 */
export const getIntelligenceData = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const user = await requireUser(ctx);
    const now = new Date();
    const currentMonthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).getTime();

    // 3 months back from current month start
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const threeMonthsAgoMs = threeMonthsAgo.getTime();

    // Fetch all transactions for the last 3 months
    const allTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_userId_date", (q) =>
        q
          .eq("userId", user._id)
          .gte("date", threeMonthsAgoMs)
          .lt("date", currentMonthStart + 32 * 24 * 60 * 60 * 1000),
      )
      .collect();

    // Fetch categories once
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const categoryMap = new Map<Id<"categories">, (typeof categories)[number]>(
      categories.map((c) => [c._id, c]),
    );

    // Split transactions into monthly buckets
    type MonthBucket = {
      income: number;
      expenses: number;
      categorySpending: Map<string, number>;
    };
    const monthlyData: Map<number, MonthBucket> = new Map();

    for (const t of allTransactions) {
      const tDate = new Date(t.date);
      const monthStart = new Date(
        tDate.getFullYear(),
        tDate.getMonth(),
        1,
      ).getTime();

      if (!monthlyData.has(monthStart)) {
        monthlyData.set(monthStart, {
          income: 0,
          expenses: 0,
          categorySpending: new Map(),
        });
      }
      const bucket = monthlyData.get(monthStart)!;
      if (t.type === "income") bucket.income += t.amount;
      else {
        bucket.expenses += t.amount;
        bucket.categorySpending.set(
          t.categoryId,
          (bucket.categorySpending.get(t.categoryId) ?? 0) + t.amount,
        );
      }
    }

    // Build monthly summaries for previous months
    const historicalMonths: Array<{
      month: number;
      income: number;
      expenses: number;
      netSavings: number;
      savingsRate: number;
    }> = [];

    for (let i = 3; i >= 1; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthMs = monthDate.getTime();
      const data = monthlyData.get(monthMs);
      const income = data?.income ?? 0;
      const expenses = data?.expenses ?? 0;
      historicalMonths.push({
        month: monthMs,
        income,
        expenses,
        netSavings: income - expenses,
        savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
      });
    }

    // Current month data
    const currentData = monthlyData.get(currentMonthStart) ?? {
      income: 0,
      expenses: 0,
      categorySpending: new Map(),
    };

    // Current month category spending
    const currentCategorySpending: Array<{
      categoryId: string;
      name: string;
      nameUr: string;
      amount: number;
    }> = [];

    for (const [catId, amount] of currentData.categorySpending) {
      const cat = categoryMap.get(catId as Id<"categories">);
      currentCategorySpending.push({
        categoryId: catId,
        name: cat?.name ?? "Unknown",
        nameUr: cat?.nameUr ?? "نامعلوم",
        amount,
      });
    }

    // Compute 3-month rolling average per category
    const categoryRollingAverages: Array<{
      categoryId: string;
      name: string;
      nameUr: string;
      average: number;
      currentSpend: number;
      monthsWithSpend: number;
    }> = [];

    const allCategoryIds = new Set<string>();
    for (const [, data] of monthlyData) {
      for (const catId of data.categorySpending.keys()) {
        allCategoryIds.add(catId);
      }
    }

    for (const catId of allCategoryIds) {
      let total = 0;
      let count = 0;
      let monthsWithSpend = 0;
      for (let i = 1; i <= 3; i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthMs = monthDate.getTime();
        const data = monthlyData.get(monthMs);
        const monthSpend = data?.categorySpending?.get(catId) ?? 0;
        total += monthSpend;
        if (monthSpend > 0) monthsWithSpend++;
        count++;
      }
      const average = total / count;
      const currentSpend = currentData.categorySpending.get(catId) ?? 0;
      const cat = categoryMap.get(catId as Id<"categories">);

      categoryRollingAverages.push({
        categoryId: catId,
        name: cat?.name ?? "Unknown",
        nameUr: cat?.nameUr ?? "نامعلوم",
        average,
        currentSpend,
        monthsWithSpend,
      });
    }

    // Days elapsed and total in current month
    const dayOfMonth = now.getDate();
    const totalDaysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();

    return {
      currentMonth: {
        income: currentData.income,
        expenses: currentData.expenses,
        daysElapsed: dayOfMonth,
        totalDaysInMonth,
      },
      historicalMonths,
      currentCategorySpending,
      categoryRollingAverages,
    };
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getFirstOfMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

/**
 * Income / expense totals for the last `months` months (default 6, max 12),
 * oldest first — the dashboard's month-over-month trend chart.
 */
export const getMonthlyTrend = query({
  args: { months: v.optional(v.number()) },
  handler: async (ctx: QueryCtx, args: { months?: number }) => {
    const user = await requireUser(ctx);
    const count = Math.max(1, Math.min(12, Math.floor(args.months ?? 6)));
    const starts = lastMonthStarts(new Date(), count);
    const last = new Date(starts[starts.length - 1]);
    const end = new Date(last.getFullYear(), last.getMonth() + 1, 1).getTime();

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", user._id).gte("date", starts[0]).lt("date", end),
      )
      .collect();

    return buildMonthlyTrend(transactions, starts);
  },
});

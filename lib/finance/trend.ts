// lib/finance/trend.ts — Month-over-month income / expense trend (pure functions)
//
// Feeds the dashboard trend chart (AGENTS.md §9.3: "Month-over-month expense
// trend (last 3-6 months)"). Every figure is summed from real transactions;
// unconfirmed (pendingConfirmation) transactions are excluded (§6).

export interface TrendTxn {
  type: "income" | "expense";
  amount: number;
  /** Unix ms. */
  date: number;
  pendingConfirmation?: boolean;
}

export interface TrendPoint {
  /** Unix ms of the first of the month (local time). */
  month: number;
  income: number;
  expenses: number;
  net: number;
}

/**
 * First-of-month timestamps for the `count` months ending with `now`'s month,
 * oldest first.
 */
export function lastMonthStarts(now: Date, count: number): number[] {
  const starts: number[] = [];
  for (let i = count - 1; i >= 0; i--) {
    starts.push(new Date(now.getFullYear(), now.getMonth() - i, 1).getTime());
  }
  return starts;
}

/**
 * Sum transactions into the given month buckets. `monthStarts` must be sorted
 * ascending; transactions outside [first start, start after last) are ignored.
 */
export function buildMonthlyTrend(
  transactions: TrendTxn[],
  monthStarts: number[],
): TrendPoint[] {
  if (monthStarts.length === 0) return [];
  const last = new Date(monthStarts[monthStarts.length - 1]);
  const end = new Date(last.getFullYear(), last.getMonth() + 1, 1).getTime();

  const points = monthStarts.map((month) => ({
    month,
    income: 0,
    expenses: 0,
    net: 0,
  }));

  for (const t of transactions) {
    if (t.pendingConfirmation) continue;
    if (t.date < monthStarts[0] || t.date >= end) continue;
    // Index of the last month start <= date.
    let idx = monthStarts.length - 1;
    while (idx > 0 && monthStarts[idx] > t.date) idx--;
    if (t.type === "income") points[idx].income += t.amount;
    else points[idx].expenses += t.amount;
  }

  for (const p of points) p.net = p.income - p.expenses;
  return points;
}

/**
 * Percentage change in expenses from the previous month to the latest one.
 * Null when there is no previous spending to compare with.
 */
export function expenseChangePct(points: TrendPoint[]): number | null {
  if (points.length < 2) return null;
  const prev = points[points.length - 2].expenses;
  const curr = points[points.length - 1].expenses;
  if (prev <= 0) return null;
  return ((curr - prev) / prev) * 100;
}

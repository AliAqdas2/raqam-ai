"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { TrendPoint } from "@/lib/finance/trend";

export interface UseMonthlyTrendReturn {
  trend: TrendPoint[];
  loading: boolean;
}

/** Last `months` months of income / expenses, oldest first. */
export function useMonthlyTrend(months = 6): UseMonthlyTrendReturn {
  const raw = useQuery(api.summary.getMonthlyTrend, { months }) as
    | TrendPoint[]
    | undefined;
  return { trend: raw ?? [], loading: raw === undefined };
}

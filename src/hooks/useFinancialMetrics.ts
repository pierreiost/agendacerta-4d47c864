import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVenue } from "@/contexts/VenueContext";

export interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  revenueChange: number;
  expenseChange: number;
  pendingExpenses: number;
  monthlyData: {
    month: string;
    revenue: number;
    expenses: number;
  }[];
}

export function useFinancialMetrics(period: "month" | "year" = "month") {
  const { currentVenue } = useVenue();

  return useQuery({
    queryKey: ["financial-metrics", currentVenue?.id, period],
    queryFn: async (): Promise<FinancialMetrics> => {
      if (!currentVenue?.id) {
        return {
          totalRevenue: 0,
          totalExpenses: 0,
          balance: 0,
          revenueChange: 0,
          expenseChange: 0,
          pendingExpenses: 0,
          monthlyData: [],
        };
      }

      // Use the optimized RPC that consolidates all queries into one
      const { data, error } = await supabase
        .rpc("get_financial_metrics", {
          p_venue_id: currentVenue.id,
          p_period: period,
        })
        .single();

      if (error) {
        console.error("Error fetching financial metrics:", error);
        return {
          totalRevenue: 0,
          totalExpenses: 0,
          balance: 0,
          revenueChange: 0,
          expenseChange: 0,
          pendingExpenses: 0,
          monthlyData: [],
        };
      }

      // Parse monthly_data from JSONB
      const monthlyData = (data.monthly_data as { month: string; revenue: number; expenses: number }[]) || [];

      return {
        totalRevenue: Number(data.total_revenue) || 0,
        totalExpenses: Number(data.total_expenses) || 0,
        balance: Number(data.balance) || 0,
        revenueChange: Number(data.revenue_change) || 0,
        expenseChange: Number(data.expense_change) || 0,
        pendingExpenses: Number(data.pending_expenses) || 0,
        monthlyData: monthlyData.map(m => ({
          month: m.month,
          revenue: Number(m.revenue) || 0,
          expenses: Number(m.expenses) || 0,
        })),
      };
    },
    enabled: !!currentVenue?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

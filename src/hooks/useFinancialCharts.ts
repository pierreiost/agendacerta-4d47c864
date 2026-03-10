import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVenue } from "@/contexts/VenueContext";

export interface WaterfallItem {
  name: string;
  value: number;
  type: "positive" | "negative";
}

export interface CashProjectionPoint {
  day: string;
  projected_balance: number;
}

export interface RevenueProfessional {
  name: string;
  revenue: number;
  cost: number;
}

export interface DelinquencyWeek {
  week_label: string;
  count: number;
  total_value: number;
}

export interface FinancialChartsData {
  waterfall: WaterfallItem[];
  cashProjection: CashProjectionPoint[];
  revenueByProfessional: RevenueProfessional[] | null;
  delinquency: DelinquencyWeek[];
}

export function useFinancialCharts() {
  const { currentVenue } = useVenue();
  const segment = currentVenue?.segment || "sports";

  return useQuery({
    queryKey: ["financial-charts", currentVenue?.id, segment],
    queryFn: async (): Promise<FinancialChartsData> => {
      if (!currentVenue?.id) {
        return { waterfall: [], cashProjection: [], revenueByProfessional: null, delinquency: [] };
      }

      const { data, error } = await supabase
        .rpc("get_financial_charts", {
          p_venue_id: currentVenue.id,
          p_segment: segment,
        })
        .single();

      if (error) {
        console.error("Error fetching financial charts:", error);
        return { waterfall: [], cashProjection: [], revenueByProfessional: null, delinquency: [] };
      }

      return {
        waterfall: (data.waterfall_data as WaterfallItem[]) || [],
        cashProjection: (data.cash_projection as CashProjectionPoint[]) || [],
        revenueByProfessional: data.revenue_by_professional as RevenueProfessional[] | null,
        delinquency: (data.delinquency_data as DelinquencyWeek[]) || [],
      };
    },
    enabled: !!currentVenue?.id,
    staleTime: 1000 * 60 * 5,
  });
}

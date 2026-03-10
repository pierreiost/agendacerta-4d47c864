import { useVenue } from "@/contexts/VenueContext";
import { useFinancialCharts } from "@/hooks/useFinancialCharts";
import { WaterfallChart } from "./WaterfallChart";
import { CashProjectionChart } from "./CashProjectionChart";
import { RevenueByCostChart } from "./RevenueByCostChart";
import { DelinquencyHeatmap } from "./DelinquencyHeatmap";
import { cn } from "@/lib/utils";

export function FinancialChartsGrid() {
  const { currentVenue } = useVenue();
  const segment = currentVenue?.segment || "sports";
  const { data, isLoading } = useFinancialCharts();

  const showProfessionalChart = segment === "beauty" || segment === "health";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Análise Financeira</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WaterfallChart
          data={data?.waterfall || []}
          segment={segment}
          isLoading={isLoading}
        />
        <CashProjectionChart
          data={data?.cashProjection || []}
          segment={segment}
          isLoading={isLoading}
        />
        {showProfessionalChart && (
          <RevenueByCostChart
            data={data?.revenueByProfessional || []}
            segment={segment}
            isLoading={isLoading}
          />
        )}
        <div className={cn(!showProfessionalChart && "md:col-span-2")}>
          <DelinquencyHeatmap
            data={data?.delinquency || []}
            segment={segment}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

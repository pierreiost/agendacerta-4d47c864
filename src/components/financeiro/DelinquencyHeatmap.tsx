import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DelinquencyWeek } from "@/hooks/useFinancialCharts";

interface Props {
  data: DelinquencyWeek[];
  segment: string;
  isLoading?: boolean;
}

const SEGMENT_CONFIG: Record<string, { title: string; description: string }> = {
  sports: { title: "Reservas não pagas", description: "Reservas passadas sem finalização" },
  beauty: { title: "Comandas abertas", description: "Atendimentos realizados sem fechamento" },
  health: { title: "Consultas não finalizadas", description: "Atendimentos passados sem encerramento" },
  custom: { title: "OS / Orçamentos atrasados", description: "Ordens de serviço e orçamentos pendentes há mais de 7 dias" },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

function getIntensity(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-muted/40";
  const ratio = value / max;
  if (ratio > 0.75) return "bg-destructive/90";
  if (ratio > 0.5) return "bg-destructive/70";
  if (ratio > 0.25) return "bg-destructive/50";
  return "bg-destructive/30";
}

export function DelinquencyHeatmap({ data, segment, isLoading }: Props) {
  const config = SEGMENT_CONFIG[segment] || SEGMENT_CONFIG.sports;

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-[220px] w-full" /></CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.total_value), 1);
  const totalTrapped = data.reduce((sum, d) => sum + d.total_value, 0);
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{config.title}</CardTitle>
            <CardDescription className="text-xs">{config.description}</CardDescription>
          </div>
          {totalTrapped > 0 && (
            <div className="text-right">
              <p className="text-lg font-bold text-destructive">{formatCurrency(totalTrapped)}</p>
              <p className="text-xs text-muted-foreground">{totalCount} {totalCount === 1 ? "item" : "itens"}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {data.map((week) => (
            <div key={week.week_label} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-full aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-colors",
                  getIntensity(week.total_value, maxValue),
                  week.total_value > 0 ? "text-destructive-foreground" : "text-muted-foreground"
                )}
                title={`${week.count} itens — ${formatCurrency(week.total_value)}`}
              >
                {week.count > 0 ? week.count : "–"}
              </div>
              <span className="text-[10px] text-muted-foreground">{week.week_label}</span>
            </div>
          ))}
        </div>
        {totalTrapped === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Nenhuma pendência encontrada 🎉
          </p>
        )}
      </CardContent>
    </Card>
  );
}

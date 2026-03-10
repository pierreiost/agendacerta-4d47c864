import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CashProjectionPoint } from "@/hooks/useFinancialCharts";

interface Props {
  data: CashProjectionPoint[];
  segment: string;
  isLoading?: boolean;
}

const SEGMENT_DESC: Record<string, string> = {
  sports: "Reservas futuras vs contas a pagar",
  beauty: "Agendamentos futuros vs contas a pagar",
  health: "Consultas futuras vs contas a pagar",
  custom: "OS em andamento vs contas a pagar",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export function CashProjectionChart({ data, segment, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-[220px] w-full" /></CardContent>
      </Card>
    );
  }

  const hasNegative = data.some((d) => d.projected_balance < 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Previsão de Caixa (30 dias)</CardTitle>
        <CardDescription className="text-xs">{SEGMENT_DESC[segment] || "Projeção financeira"}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="day"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--muted))" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(value: number) => [formatCurrency(value), "Saldo projetado"]}
              />
              {hasNegative && <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Zona de risco", position: "right", fill: "hsl(var(--destructive))", fontSize: 10 }} />}
              <Area
                type="monotone"
                dataKey="projected_balance"
                stroke="hsl(var(--muted-foreground))"
                fill="url(#projGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

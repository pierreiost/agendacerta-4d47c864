import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WaterfallItem } from "@/hooks/useFinancialCharts";

interface Props {
  data: WaterfallItem[];
  segment: string;
  isLoading?: boolean;
}

const SEGMENT_LABELS: Record<string, string> = {
  sports: "Locações",
  beauty: "Serviços",
  health: "Consultas / Procedimentos",
  custom: "Ordens de Serviço",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export function WaterfallChart({ data, segment, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-[220px] w-full" /></CardContent>
      </Card>
    );
  }

  // Build waterfall: each bar has a transparent base + visible portion
  let running = 0;
  const chartData = data.map((item, i) => {
    if (i === 0) {
      running = item.value;
      return { name: item.name, base: 0, value: item.value, type: item.type, total: item.value };
    }
    if (i === data.length - 1) {
      // net profit bar starts from 0
      return { name: item.name, base: item.value < 0 ? item.value : 0, value: Math.abs(item.value), type: item.type, total: item.value };
    }
    const base = running - item.value;
    running = base;
    return { name: item.name, base, value: item.value, type: item.type, total: item.value };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lucratividade</CardTitle>
        <CardDescription className="text-xs">{SEGMENT_LABELS[segment] || "Receita"} → Lucro Líquido</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--muted))" }}
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
                formatter={(value: number, name: string, props: any) => {
                  if (name === "base") return [null, null];
                  return [formatCurrency(props.payload.total), props.payload.name];
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Bar dataKey="base" stackId="a" fill="transparent" />
              <Bar dataKey="value" stackId="a" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.type === "positive" ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

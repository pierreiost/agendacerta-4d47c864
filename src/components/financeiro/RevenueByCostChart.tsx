import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RevenueProfessional } from "@/hooks/useFinancialCharts";

interface Props {
  data: RevenueProfessional[];
  segment: string;
  isLoading?: boolean;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export function RevenueByCostChart({ data, segment, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-[220px] w-full" /></CardContent>
      </Card>
    );
  }

  const label = segment === "health" ? "Profissional de Saúde" : "Profissional";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Receita por {label}</CardTitle>
        <CardDescription className="text-xs">Quanto cada {label.toLowerCase()} fatura vs. custo de comissão</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={formatCurrency}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "revenue" ? "Receita" : "Comissão",
                ]}
              />
              <Legend formatter={(v) => (v === "revenue" ? "Receita" : "Comissão")} />
              <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[0, 3, 3, 0]} name="revenue" />
              <Bar dataKey="cost" fill="hsl(var(--chart-1))" radius={[0, 3, 3, 0]} name="cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

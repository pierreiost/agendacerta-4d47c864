import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CashFlowChartProps {
  data: {
    month: string;
    revenue: number;
    expenses: number;
  }[];
  isLoading?: boolean;
}

export function CashFlowChart({ data, isLoading }: CashFlowChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Receitas vs Despesas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={{ stroke: "hsl(var(--muted))" }}
                axisLine={{ stroke: "hsl(var(--muted))" }}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={{ stroke: "hsl(var(--muted))" }}
                axisLine={{ stroke: "hsl(var(--muted))" }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "revenue" ? "Receitas" : "Despesas",
                ]}
              />
              <Legend
                formatter={(value) => (value === "revenue" ? "Receitas" : "Despesas")}
              />
              <Bar
                dataKey="revenue"
                fill="hsl(var(--chart-2))"
                radius={[4, 4, 0, 0]}
                name="revenue"
              />
              <Bar
                dataKey="expenses"
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
                name="expenses"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

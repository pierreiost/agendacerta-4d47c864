import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FinancialSummaryProps {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  revenueChange: number;
  expenseChange: number;
  pendingExpenses: number;
  isLoading?: boolean;
}

export function FinancialSummary({
  totalRevenue,
  totalExpenses,
  balance,
  revenueChange,
  expenseChange,
  pendingExpenses,
  isLoading,
}: FinancialSummaryProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const formatPercent = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-16 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Receitas",
      value: totalRevenue,
      change: revenueChange,
      icon: TrendingUp,
      positive: true,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "Despesas",
      value: totalExpenses,
      change: expenseChange,
      icon: TrendingDown,
      positive: false,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/30",
    },
    {
      title: "Saldo",
      value: balance,
      icon: DollarSign,
      color: balance >= 0 
        ? "text-emerald-600 dark:text-emerald-400" 
        : "text-rose-600 dark:text-rose-400",
      bgColor: balance >= 0 
        ? "bg-emerald-50 dark:bg-emerald-950/30" 
        : "bg-rose-50 dark:bg-rose-950/30",
    },
    {
      title: "Contas a Pagar",
      value: pendingExpenses,
      icon: AlertCircle,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      isWarning: pendingExpenses > 0,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>
                <div className={cn("p-2 rounded-lg", card.bgColor)}>
                  <Icon className={cn("h-4 w-4", card.color)} />
                </div>
              </div>
              <div className="mt-2">
                <p className={cn("text-2xl font-bold", card.color)}>
                  {formatCurrency(card.value)}
                </p>
                {card.change !== undefined && (
                  <p
                    className={cn(
                      "text-xs mt-1",
                      card.change >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {formatPercent(card.change)} vs. mês anterior
                  </p>
                )}
                {card.isWarning && card.value > 0 && (
                  <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
                    Pendente de pagamento
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

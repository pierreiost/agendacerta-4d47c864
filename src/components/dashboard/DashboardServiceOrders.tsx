import { useMemo, useState } from "react";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServiceOrders } from "@/hooks/useServiceOrders";
import { useServiceOrderMetrics } from "@/hooks/useServiceOrderMetrics";
import { FileText, DollarSign, CheckCircle2, ArrowRight, Plus, AlertTriangle, Calendar } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { DashboardServiceOrdersSkeleton } from "./DashboardServiceOrdersSkeleton";

const STATUS_COLORS: Record<string, string> = {
  open: "#f59e0b", // warning
  finished: "#22c55e", // success
  invoiced: "#6366f1", // primary
  draft: "#9ca3af", // neutral
  approved: "#3b82f6", // blue
  in_progress: "#8b5cf6", // purple
  cancelled: "#ef4444", // error
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberta",
  finished: "Finalizada",
  invoiced: "Faturada",
  draft: "Rascunho",
  approved: "Aprovada",
  in_progress: "Em Andamento",
  cancelled: "Cancelada",
};

type DateRange = "7d" | "30d" | "month" | "last_month" | "all";

const DATE_RANGE_OPTIONS = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "month", label: "Este mês" },
  { value: "last_month", label: "Mês anterior" },
  { value: "all", label: "Todo período" },
];

function getDateRange(range: DateRange): { start: Date | undefined; end: Date | undefined } {
  const today = new Date();
  
  switch (range) {
    case "7d":
      return { start: subDays(today, 7), end: today };
    case "30d":
      return { start: subDays(today, 30), end: today };
    case "month":
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case "last_month":
      const lastMonth = subMonths(today, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case "all":
    default:
      return { start: undefined, end: undefined };
  }
}

export function DashboardServiceOrders() {
  const navigate = useNavigate();
  const { orders, isLoading: ordersLoading } = useServiceOrders();
  const [statusDateRange, setStatusDateRange] = useState<DateRange>("30d");
  const [recentDateRange, setRecentDateRange] = useState<DateRange>("7d");
  
  // Get date ranges for filters
  const statusDates = getDateRange(statusDateRange);
  const recentDates = getDateRange(recentDateRange);
  
  // Use server-side metrics
  const { data: serverMetrics, isLoading: metricsLoading } = useServiceOrderMetrics(
    statusDates.start,
    statusDates.end
  );
  
  // Fallback to client-side calculation if server metrics not available
  const metrics = useMemo(() => {
    if (serverMetrics) {
      return {
        openOrders: serverMetrics.open_orders,
        finishedToday: serverMetrics.finished_today,
        monthRevenue: serverMetrics.month_revenue,
        revenueSparkline: serverMetrics.revenue_sparkline,
        statusDistribution: serverMetrics.status_distribution.map(s => ({
          name: STATUS_LABELS[s.status] || s.status,
          value: s.count,
          color: STATUS_COLORS[s.status] || "#9ca3af",
        })),
      };
    }

    // Fallback client-side calculation
    if (!orders || orders.length === 0) {
      return {
        openOrders: 0,
        finishedToday: 0,
        monthRevenue: 0,
        revenueSparkline: [0, 0, 0, 0, 0, 0, 0],
        statusDistribution: [],
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const openOrders = orders.filter((o) => {
      const status = o.order_type === 'simple' ? o.status_simple : o.status_complete;
      return status === 'open' || status === 'in_progress' || status === 'draft' || status === 'approved';
    }).length;

    const finishedToday = orders.filter((o) => {
      if (!o.finished_at) return false;
      const finishedDate = new Date(o.finished_at);
      return finishedDate >= today && finishedDate < tomorrow;
    }).length;

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthOrders = orders.filter((o) => {
      const createdDate = new Date(o.created_at);
      const status = o.order_type === 'simple' ? o.status_simple : o.status_complete;
      return (
        createdDate.getMonth() === currentMonth && 
        createdDate.getFullYear() === currentYear && 
        (status === 'finished' || status === 'invoiced')
      );
    });

    const monthRevenue = monthOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const revenueSparkline: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayOrders = orders.filter((o) => {
        const finishedDate = o.finished_at ? new Date(o.finished_at) : null;
        const status = o.order_type === 'simple' ? o.status_simple : o.status_complete;
        return (
          finishedDate && 
          finishedDate >= date && 
          finishedDate < nextDate &&
          (status === 'finished' || status === 'invoiced')
        );
      });
      
      const dayRevenue = dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      revenueSparkline.push(dayRevenue);
    }

    const statusCount: Record<string, number> = {};
    orders.forEach((o) => {
      const status = o.order_type === 'simple' ? o.status_simple : o.status_complete;
      if (status) {
        statusCount[status] = (statusCount[status] || 0) + 1;
      }
    });

    const statusDistribution = Object.entries(statusCount).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || "#9ca3af",
    }));

    return {
      openOrders,
      finishedToday,
      monthRevenue,
      revenueSparkline,
      statusDistribution,
    };
  }, [serverMetrics, orders]);

  // Filter recent orders based on date range
  const recentOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const { start, end } = recentDates;

    return [...orders]
      .filter((o) => {
        if (!start || !end) return true;
        const createdDate = new Date(o.created_at);
        return createdDate >= start && createdDate <= end;
      })
      .sort((a, b) => {
        const statusA = a.order_type === 'simple' ? a.status_simple : a.status_complete;
        const statusB = b.order_type === 'simple' ? b.status_simple : b.status_complete;
        const isOpenA = statusA === 'open' || statusA === 'in_progress';
        const isOpenB = statusB === 'open' || statusB === 'in_progress';
        
        if (isOpenA && !isOpenB) return -1;
        if (!isOpenA && isOpenB) return 1;
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 5);
  }, [orders, recentDates]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-neutral-100 text-neutral-800 border-neutral-200";
    const colors: Record<string, string> = {
      open: "bg-warning-100 text-warning-800 border-warning-200",
      finished: "bg-success-100 text-success-800 border-success-200",
      invoiced: "bg-primary-100 text-primary-800 border-primary-200",
      draft: "bg-neutral-100 text-neutral-800 border-neutral-200",
      approved: "bg-info-100 text-info-800 border-info-200",
      in_progress: "bg-accent-100 text-accent-800 border-accent-200",
      cancelled: "bg-error-100 text-error-800 border-error-200",
    };
    return colors[status] || colors.draft;
  };

  // Mostra skeleton apenas se as métricas ainda estão carregando pela primeira vez
  if (metricsLoading && !serverMetrics) {
    return <DashboardServiceOrdersSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Métricas */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="OS em Aberto"
          value={metrics.openOrders}
          icon={AlertTriangle}
          color="orange"
          tooltip="Ordens de serviço aguardando conclusão"
        />
        <MetricCard
          title="Finalizadas Hoje"
          value={metrics.finishedToday}
          icon={CheckCircle2}
          color="green"
          tooltip="Ordens de serviço concluídas hoje"
        />
        <MetricCard
          title="Faturamento Mês"
          value={formatCurrency(metrics.monthRevenue)}
          icon={DollarSign}
          color="blue"
          sparklineData={metrics.revenueSparkline}
          tooltip="Total faturado em OS finalizadas no mês"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Gráfico de Status */}
        <Card className="border-border shadow-soft lg:col-span-1">
          <CardHeader className="border-b bg-muted/30 py-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg font-semibold">Status das OS</CardTitle>
              <Select value={statusDateRange} onValueChange={(v) => setStatusDateRange(v as DateRange)}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {metrics.statusDistribution.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <FileText className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Sem dados no período</p>
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {metrics.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [value, 'Quantidade']}
                    />
                    <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom"
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* OS Recentes */}
        <Card className="border-border shadow-soft lg:col-span-2">
          <CardHeader className="border-b bg-muted/30 py-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg font-semibold">OS Recentes</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={recentDateRange} onValueChange={(v) => setRecentDateRange(v as DateRange)}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => navigate("/ordens-servico")} className="gap-2">
                  Ver todas
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!recentOrders || recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="rounded-full bg-primary-100 p-4 mb-4">
                  <FileText className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma OS no período</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                  Você não tem ordens de serviço neste período.
                </p>
                <Button onClick={() => navigate("/ordens-servico")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova OS
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {recentOrders.map((order) => {
                  const status = order.order_type === 'simple' ? order.status_simple : order.status_complete;
                  const isOpen = status === 'open' || status === 'in_progress';
                  
                  return (
                    <div
                      key={order.id}
                      className={`p-4 hover:bg-muted/30 transition-colors cursor-pointer ${isOpen ? 'bg-warning-50/50 dark:bg-warning-950/20' : ''}`}
                      onClick={() => navigate("/ordens-servico")}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`rounded-lg p-2 ${isOpen ? 'bg-warning-100 dark:bg-warning-900/50' : 'bg-muted'}`}>
                          <FileText className={`h-4 w-4 ${isOpen ? 'text-warning-600 dark:text-warning-400' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              #{order.order_number.toString().padStart(4, '0')}
                            </span>
                            <h4 className="font-medium text-foreground truncate">
                              {order.customer_name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            <span>•</span>
                            <span>{formatCurrency(order.total)}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className={getStatusColor(status)}>
                          {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

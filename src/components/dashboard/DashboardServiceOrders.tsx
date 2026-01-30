import { useMemo } from "react";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useServiceOrders } from "@/hooks/useServiceOrders";
import { FileText, DollarSign, CheckCircle2, Clock, ArrowRight, Plus, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const STATUS_COLORS = {
  open: "#f59e0b", // warning
  finished: "#22c55e", // success
  invoiced: "#6366f1", // primary
  draft: "#9ca3af", // neutral
  approved: "#3b82f6", // blue
  in_progress: "#8b5cf6", // purple
  cancelled: "#ef4444", // error
};

const STATUS_LABELS = {
  open: "Aberta",
  finished: "Finalizada",
  invoiced: "Faturada",
  draft: "Rascunho",
  approved: "Aprovada",
  in_progress: "Em Andamento",
  cancelled: "Cancelada",
};

export function DashboardServiceOrders() {
  const navigate = useNavigate();
  const { orders, isLoading } = useServiceOrders();

  const metrics = useMemo(() => {
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

    // Contar OS abertas (status open ou in_progress)
    const openOrders = orders.filter((o) => {
      const status = o.order_type === 'simple' ? o.status_simple : o.status_complete;
      return status === 'open' || status === 'in_progress' || status === 'draft' || status === 'approved';
    }).length;

    // Finalizadas hoje
    const finishedToday = orders.filter((o) => {
      if (!o.finished_at) return false;
      const finishedDate = new Date(o.finished_at);
      return finishedDate >= today && finishedDate < tomorrow;
    }).length;

    // Faturamento do mês (OS finalizadas ou faturadas)
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

    // Sparkline - últimos 7 dias
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

    // Distribuição de status para o gráfico de pizza
    const statusCount: Record<string, number> = {};
    orders.forEach((o) => {
      const status = o.order_type === 'simple' ? o.status_simple : o.status_complete;
      if (status) {
        statusCount[status] = (statusCount[status] || 0) + 1;
      }
    });

    const statusDistribution = Object.entries(statusCount).map(([status, count]) => ({
      name: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
      value: count,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "#9ca3af",
    }));

    return {
      openOrders,
      finishedToday,
      monthRevenue,
      revenueSparkline,
      statusDistribution,
    };
  }, [orders]);

  // OS recentes priorizando abertas
  const recentOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    return [...orders]
      .sort((a, b) => {
        // Priorizar OS abertas
        const statusA = a.order_type === 'simple' ? a.status_simple : a.status_complete;
        const statusB = b.order_type === 'simple' ? b.status_simple : b.status_complete;
        const isOpenA = statusA === 'open' || statusA === 'in_progress';
        const isOpenB = statusB === 'open' || statusB === 'in_progress';
        
        if (isOpenA && !isOpenB) return -1;
        if (!isOpenA && isOpenB) return 1;
        
        // Ordenar por data de criação
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 5);
  }, [orders]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
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
        {metrics.statusDistribution.length > 0 && (
          <Card className="border-border shadow-soft lg:col-span-1">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg font-semibold">Status das OS</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
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
            </CardContent>
          </Card>
        )}

        {/* OS Recentes */}
        <Card className={`border-border shadow-soft ${metrics.statusDistribution.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Ordens de Serviço Recentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/ordens-servico")} className="gap-2">
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!recentOrders || recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="rounded-full bg-primary-100 p-4 mb-4">
                  <FileText className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma OS registrada</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                  Você ainda não tem ordens de serviço.
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
                      className={`p-4 hover:bg-muted/30 transition-colors cursor-pointer ${isOpen ? 'bg-warning-50/50' : ''}`}
                      onClick={() => navigate("/ordens-servico")}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`rounded-lg p-2 ${isOpen ? 'bg-warning-100' : 'bg-muted'}`}>
                          <FileText className={`h-4 w-4 ${isOpen ? 'text-warning-600' : 'text-muted-foreground'}`} />
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
                            <Clock className="h-3 w-3" />
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

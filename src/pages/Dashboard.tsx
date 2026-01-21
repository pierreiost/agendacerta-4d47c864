// src/pages/Dashboard.tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVenue } from "@/contexts/VenueContext";
import { useBookings } from "@/hooks/useBookings";
import { useSpaces } from "@/hooks/useSpaces";
import { Calendar, DollarSign, TrendingUp, FileText, Clock, MapPin, User, ArrowRight, Plus } from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { currentVenue } = useVenue();
  const navigate = useNavigate();
  const { data: bookings, isLoading: loadingBookings } = useBookings();
  const { data: spaces } = useSpaces(currentVenue?.id);

  // Calcular métricas
  const metrics = useMemo(() => {
    if (!bookings) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reservas de hoje
    const todayBookings = bookings.filter((b) => {
      const bookingDate = new Date(b.start_time);
      return bookingDate >= today && bookingDate < tomorrow;
    });

    // Reservas do mês
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthBookings = bookings.filter((b) => {
      const bookingDate = new Date(b.start_time);
      return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
    });

    // Mês anterior para comparação
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthBookings = bookings.filter((b) => {
      const bookingDate = new Date(b.start_time);
      return bookingDate.getMonth() === lastMonth && bookingDate.getFullYear() === lastMonthYear;
    });

    // Faturamento do mês
    const monthRevenue = monthBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const lastMonthRevenue = lastMonthBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const revenueTrend =
      lastMonthRevenue > 0 ? (((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1) : "0";

    // Taxa de ocupação (simplificada)
    const totalSpaces = spaces?.length || 1;
    const occupiedSlots = todayBookings.length;
    const occupancyRate = Math.round((occupiedSlots / (totalSpaces * 8)) * 100); // 8 slots por dia

    // OS pendentes (simulado - você pode buscar da tabela real)
    const pendingOrders = bookings.filter((b) => b.status === "pending").length;

    return {
      todayBookings: todayBookings.length,
      todayTrend: "+20%", // Você pode calcular comparando com ontem
      monthRevenue,
      revenueTrend: `${parseFloat(revenueTrend) >= 0 ? "+" : ""}${revenueTrend}%`,
      revenueIsPositive: parseFloat(revenueTrend) >= 0,
      occupancyRate: `${occupancyRate}%`,
      occupancyTrend: "+5%",
      pendingOrders,
      ordersTrend: "-2",
    };
  }, [bookings, spaces]);

  // Próximas reservas
  const upcomingBookings = useMemo(() => {
    if (!bookings) return [];
    const now = new Date();
    return bookings
      .filter((b) => new Date(b.start_time) > now && b.status !== "cancelled")
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 5);
  }, [bookings]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-warning-100 text-warning-800 border-warning-200",
      confirmed: "bg-success-100 text-success-800 border-success-200",
      cancelled: "bg-error-100 text-error-800 border-error-200",
      completed: "bg-neutral-100 text-neutral-800 border-neutral-200",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "Pendente",
      confirmed: "Confirmado",
      cancelled: "Cancelado",
      completed: "Concluído",
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (loadingBookings) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Visão geral do seu negócio</p>
          </div>
          <Button onClick={() => navigate("/agenda")} size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Reserva
          </Button>
        </div>

        {/* Métricas - Grid de Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Reservas Hoje"
            value={metrics?.todayBookings || 0}
            icon={Calendar}
            color="blue"
            trend={{
              value: metrics?.todayTrend || "+0%",
              isPositive: true,
            }}
          />

          <MetricCard
            title="Faturamento Mês"
            value={formatCurrency(metrics?.monthRevenue || 0)}
            icon={DollarSign}
            color="green"
            trend={{
              value: metrics?.revenueTrend || "+0%",
              isPositive: metrics?.revenueIsPositive ?? true,
            }}
          />

          <MetricCard
            title="Taxa de Ocupação"
            value={metrics?.occupancyRate || "0%"}
            icon={TrendingUp}
            color="purple"
            trend={{
              value: metrics?.occupancyTrend || "+0%",
              isPositive: true,
            }}
          />

          <MetricCard
            title="OS Pendentes"
            value={metrics?.pendingOrders || 0}
            icon={FileText}
            color="orange"
            trend={{
              value: metrics?.ordersTrend || "0",
              isPositive: false,
            }}
          />
        </div>

        {/* Próximas Reservas */}
        <Card className="border-border shadow-soft">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">Próximas Reservas</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/agenda")} className="gap-2">
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="rounded-full bg-primary-100 p-4 mb-4">
                  <Calendar className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma reserva agendada</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                  Você não tem reservas futuras no momento. Crie uma nova reserva para começar.
                </p>
                <Button onClick={() => navigate("/agenda")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Reserva
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-6 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate("/agenda")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Info Principal */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary-100 p-2 mt-1">
                            <User className="h-4 w-4 text-primary-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground text-lg">{booking.customer_name}</h4>
                            {booking.customer_email && (
                              <p className="text-sm text-muted-foreground mt-1">{booking.customer_email}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(new Date(booking.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>

                          {booking.space && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{booking.space.name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status e Valor */}
                      <div className="flex flex-col items-end gap-3">
                        <Badge variant="outline" className={getStatusColor(booking.status)}>
                          {getStatusLabel(booking.status)}
                        </Badge>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">
                            {formatCurrency(booking.total_amount || 0)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Total</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="border-border shadow-soft hover:shadow-soft-lg transition-all cursor-pointer group"
            onClick={() => navigate("/agenda")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-primary-100 p-3 group-hover:bg-primary-200 transition-colors">
                  <Calendar className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Ver Agenda</h3>
                  <p className="text-sm text-muted-foreground">Calendário completo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-border shadow-soft hover:shadow-soft-lg transition-all cursor-pointer group"
            onClick={() => navigate("/espacos")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-success-100 p-3 group-hover:bg-success-200 transition-colors">
                  <MapPin className="h-6 w-6 text-success-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Espaços</h3>
                  <p className="text-sm text-muted-foreground">Gerenciar locais</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-border shadow-soft hover:shadow-soft-lg transition-all cursor-pointer group"
            onClick={() => navigate("/relatorios")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-accent-100 p-3 group-hover:bg-accent-200 transition-colors">
                  <TrendingUp className="h-6 w-6 text-accent-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Relatórios</h3>
                  <p className="text-sm text-muted-foreground">Analytics completo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

// src/pages/Dashboard.tsx - VERSÃO FINAL CORRIGIDA
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

  const { bookings, isLoading: loadingBookings } = useBookings();
  const { spaces } = useSpaces(); // ✅ SEM parâmetro

  const metrics = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return {
        todayBookings: 0,
        monthRevenue: 0,
        revenueTrend: "+0%",
        revenueIsPositive: true,
        occupancyRate: "0%",
        pendingOrders: 0,
        // Sparkline data - last 7 days
        revenueSparkline: [0, 0, 0, 0, 0, 0, 0],
        occupancySparkline: [0, 0, 0, 0, 0, 0, 0],
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookings = bookings.filter((b) => {
      const bookingDate = new Date(b.start_time);
      return bookingDate >= today && bookingDate < tomorrow;
    });

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthBookings = bookings.filter((b) => {
      const bookingDate = new Date(b.start_time);
      return (
        bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear && b.status !== "CANCELLED"
      );
    });

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthBookings = bookings.filter((b) => {
      const bookingDate = new Date(b.start_time);
      return (
        bookingDate.getMonth() === lastMonth && bookingDate.getFullYear() === lastMonthYear && b.status !== "CANCELLED"
      );
    });

    // Faturamento: apenas reservas FINALIZADAS contam
    const monthRevenue = monthBookings.reduce((sum, b) => {
      if (b.status === 'FINALIZED') {
        return sum + (Number(b.grand_total) || 0);
      }
      return sum;
    }, 0);

    const lastMonthRevenue = lastMonthBookings.reduce((sum, b) => {
      if (b.status === 'FINALIZED') {
        return sum + (Number(b.grand_total) || 0);
      }
      return sum;
    }, 0);

    const revenueTrend =
      lastMonthRevenue > 0 ? (((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1) : "0";

    const totalSpaces = spaces?.length || 1;
    const occupiedSlots = todayBookings.length;
    const occupancyRate = Math.round((occupiedSlots / (totalSpaces * 8)) * 100);

    const pendingOrders = bookings.filter((b) => b.status === "PENDING").length;

    // Generate sparkline data for last 7 days
    const revenueSparkline: number[] = [];
    const occupancySparkline: number[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayBookings = bookings.filter((b) => {
        const bookingDate = new Date(b.start_time);
        return bookingDate >= date && bookingDate < nextDate && b.status !== "CANCELLED";
      });
      
      // Apenas reservas finalizadas contam no faturamento
      const dayRevenue = dayBookings.reduce((sum, b) => {
        if (b.status === 'FINALIZED') {
          return sum + (Number(b.grand_total) || 0);
        }
        return sum;
      }, 0);
      revenueSparkline.push(dayRevenue);
      
      const dayOccupancy = Math.round((dayBookings.length / (totalSpaces * 8)) * 100);
      occupancySparkline.push(dayOccupancy);
    }

    return {
      todayBookings: todayBookings.length,
      monthRevenue,
      revenueTrend: `${parseFloat(revenueTrend) >= 0 ? "+" : ""}${revenueTrend}%`,
      revenueIsPositive: parseFloat(revenueTrend) >= 0,
      occupancyRate: `${occupancyRate}%`,
      pendingOrders,
      revenueSparkline,
      occupancySparkline,
    };
  }, [bookings, spaces]);

  const upcomingBookings = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];

    const now = new Date();
    return bookings
      .filter((b) => {
        const startTime = new Date(b.start_time);
        return startTime > now && b.status !== "CANCELLED";
      })
      .sort((a, b) => {
        const dateA = new Date(a.start_time);
        const dateB = new Date(b.start_time);
        return dateA.getTime() - dateB.getTime();
      })
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
      PENDING: "bg-warning-100 text-warning-800 border-warning-200",
      CONFIRMED: "bg-success-100 text-success-800 border-success-200",
      CANCELLED: "bg-error-100 text-error-800 border-error-200",
      FINALIZED: "bg-neutral-100 text-neutral-800 border-neutral-200",
    };
    return colors[status as keyof typeof colors] || colors.PENDING;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      PENDING: "Pendente",
      CONFIRMED: "Confirmado",
      CANCELLED: "Cancelado",
      FINALIZED: "Finalizado",
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

        <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Reservas Hoje"
            value={metrics.todayBookings}
            icon={Calendar}
            color="blue"
            tooltip="Total de reservas agendadas para hoje, excluindo canceladas"
          />

          <MetricCard
            title="Faturamento Mês"
            value={formatCurrency(metrics.monthRevenue)}
            icon={DollarSign}
            color="green"
            sparklineData={metrics.revenueSparkline}
            tooltip="Soma dos valores de reservas finalizadas no mês atual"
          />

          <MetricCard
            title="Taxa de Ocupação"
            value={metrics.occupancyRate}
            icon={TrendingUp}
            color="purple"
            sparklineData={metrics.occupancySparkline}
            tooltip="Percentual de horários ocupados hoje (reservas / slots disponíveis)"
          />

          <MetricCard
            title="OS Pendentes"
            value={metrics.pendingOrders}
            icon={FileText}
            color="orange"
            tooltip="Reservas aguardando confirmação ou ação"
          />
        </div>

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
            {!upcomingBookings || upcomingBookings.length === 0 ? (
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
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary-100 p-2 mt-1">
                            <User className="h-4 w-4 text-primary-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground text-lg">
                              {booking.customer_name || "Cliente"}
                            </h4>
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

                      <div className="flex flex-col items-end gap-3">
                        <Badge variant="outline" className={getStatusColor(booking.status || "PENDING")}>
                          {getStatusLabel(booking.status || "PENDING")}
                        </Badge>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">
                            {formatCurrency(Number(booking.grand_total) || 0)}
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

import { useMemo } from "react";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBookings } from "@/hooks/useBookings";
import { useSpaces } from "@/hooks/useSpaces";
import { Calendar, DollarSign, TrendingUp, Clock, MapPin, User, ArrowRight, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function DashboardBookings() {
  const navigate = useNavigate();
  const { bookings, isLoading } = useBookings();
  const { spaces } = useSpaces();

  const metrics = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return {
        todayBookings: 0,
        monthRevenue: 0,
        occupancyRate: "0%",
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
        bookingDate.getMonth() === currentMonth && 
        bookingDate.getFullYear() === currentYear && 
        b.status !== "CANCELLED"
      );
    });

    const monthRevenue = monthBookings.reduce((sum, b) => {
      if (b.status === 'FINALIZED') {
        return sum + (Number(b.grand_total) || 0);
      }
      return sum;
    }, 0);

    const totalSpaces = spaces?.length || 1;
    const occupiedSlots = todayBookings.length;
    const occupancyRate = Math.round((occupiedSlots / (totalSpaces * 8)) * 100);

    // Sparkline data - últimos 7 dias
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
      occupancyRate: `${occupancyRate}%`,
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
          title="Reservas Hoje"
          value={metrics.todayBookings}
          icon={Calendar}
          color="blue"
          tooltip="Total de reservas agendadas para hoje"
        />
        <MetricCard
          title="Faturamento Mês"
          value={formatCurrency(metrics.monthRevenue)}
          icon={DollarSign}
          color="green"
          sparklineData={metrics.revenueSparkline}
          tooltip="Soma dos valores de reservas finalizadas no mês"
        />
        <MetricCard
          title="Taxa de Ocupação"
          value={metrics.occupancyRate}
          icon={TrendingUp}
          color="purple"
          sparklineData={metrics.occupancySparkline}
          tooltip="Percentual de horários ocupados hoje"
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
          {!upcomingBookings || upcomingBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="rounded-full bg-primary-100 p-4 mb-4">
                <Calendar className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma reserva agendada</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                Você não tem reservas futuras no momento.
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
                          {booking.space && (
                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {booking.space.name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(new Date(booking.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
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
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

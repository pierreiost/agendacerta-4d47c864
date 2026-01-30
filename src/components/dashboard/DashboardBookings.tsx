import { useMemo, useState } from "react";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useBookings } from "@/hooks/useBookings";
import { useSpaces } from "@/hooks/useSpaces";
import { Calendar, DollarSign, TrendingUp, Clock, MapPin, User, ArrowRight, Plus } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type DateFilter = "today" | "tomorrow";

export function DashboardBookings() {
  const navigate = useNavigate();
  const { bookings, isLoading } = useBookings();
  const { spaces } = useSpaces();
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [showPending, setShowPending] = useState(false);

  const metrics = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return {
        confirmedToday: 0,
        pendingToday: 0,
        totalToday: 0,
        monthRevenue: 0,
        occupancyRate: "0%",
        revenueSparkline: [0, 0, 0, 0, 0, 0, 0],
        occupancySparkline: [0, 0, 0, 0, 0, 0, 0],
      };
    }

    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    const todayBookings = bookings.filter((b) => {
      const bookingDate = startOfDay(new Date(b.start_time));
      return bookingDate.getTime() === today.getTime();
    });

    const confirmedToday = todayBookings.filter(b => b.status === "CONFIRMED").length;
    const pendingToday = todayBookings.filter(b => b.status === "PENDING").length;

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
      const date = startOfDay(addDays(today, -i));
      const nextDate = addDays(date, 1);
      
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
      confirmedToday,
      pendingToday,
      totalToday: todayBookings.length,
      monthRevenue,
      occupancyRate: `${occupancyRate}%`,
      revenueSparkline,
      occupancySparkline,
    };
  }, [bookings, spaces]);

  const filteredBookings = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];

    const today = startOfDay(new Date());
    const targetDate = dateFilter === "today" ? today : addDays(today, 1);
    const nextDate = addDays(targetDate, 1);

    return bookings
      .filter((b) => {
        const startTime = new Date(b.start_time);
        const inDateRange = startTime >= targetDate && startTime < nextDate;
        const notCancelled = b.status !== "CANCELLED";
        const statusFilter = showPending 
          ? (b.status === "CONFIRMED" || b.status === "PENDING")
          : b.status === "CONFIRMED";
        return inDateRange && notCancelled && statusFilter;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [bookings, dateFilter, showPending]);

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

  // Custom value display for today's bookings
  const TodayBookingsValue = () => (
    <div className="flex flex-col">
      <span className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
        {metrics.totalToday}
      </span>
      <div className="flex items-center gap-2 text-xs mt-1">
        <span className="text-success-600 font-medium">{metrics.confirmedToday} confirmadas</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-warning-600 font-medium">{metrics.pendingToday} pendentes</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Métricas */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-3">
        <Card className={cn(
          "relative overflow-hidden border-2 transition-all duration-300",
          "hover:shadow-soft-lg hover:scale-[1.02] hover:-translate-y-0.5",
          "border-primary-200/60 hover:border-primary-300"
        )}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary-100/80 via-primary-50/50 to-transparent opacity-60" />
          <div className="relative p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <p className="text-xs md:text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Reservas Hoje
                </p>
                <TodayBookingsValue />
              </div>
              <div className="rounded-xl p-2.5 md:p-3 shadow-sm bg-primary-100 ring-2 ring-primary-200/50">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary-600" />
              </div>
            </div>
          </div>
        </Card>
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

      {/* Próximas Reservas - Estilo Trello */}
      <Card className="border-border shadow-soft">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-xl font-semibold">Próximas Reservas</CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant={showPending ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPending(!showPending)}
                className="text-xs gap-1.5"
              >
                {showPending ? "Ocultar Pendentes" : "Mostrar Pendentes"}
              </Button>
              <ToggleGroup 
                type="single" 
                value={dateFilter} 
                onValueChange={(value) => value && setDateFilter(value as DateFilter)}
                className="bg-muted/50 rounded-lg p-1"
              >
                <ToggleGroupItem 
                  value="today" 
                  className="text-xs px-3 py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm"
                >
                  Hoje
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="tomorrow" 
                  className="text-xs px-3 py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm"
                >
                  Amanhã
                </ToggleGroupItem>
              </ToggleGroup>
              <Button variant="ghost" size="sm" onClick={() => navigate("/agenda")} className="gap-2">
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {!filteredBookings || filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="rounded-full bg-primary-100 p-4 mb-4">
                <Calendar className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma reserva {dateFilter === "today" ? "para hoje" : "para amanhã"}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                Você não tem reservas agendadas {dateFilter === "today" ? "para hoje" : "para amanhã"}.
              </p>
              <Button onClick={() => navigate("/agenda")} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Reserva
              </Button>
            </div>
          ) : (
            <div 
              className={cn(
                "flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
                filteredBookings.length <= 3 ? "justify-center" : "justify-start"
              )}
            >
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className={cn(
                    "min-w-[250px] max-w-[280px] flex-shrink-0",
                    "p-4 rounded-xl border-2 border-border bg-card",
                    "hover:border-primary-300 hover:shadow-soft transition-all duration-200 cursor-pointer",
                    "group"
                  )}
                  onClick={() => navigate("/agenda")}
                >
                  {/* Header do Card */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary-100 p-1.5 group-hover:bg-primary-200 transition-colors">
                        <User className="h-3.5 w-3.5 text-primary-600" />
                      </div>
                      <h4 className="font-semibold text-foreground text-sm line-clamp-1">
                        {booking.customer_name || "Cliente"}
                      </h4>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px] px-1.5 py-0.5", getStatusColor(booking.status || "PENDING"))}
                    >
                      {getStatusLabel(booking.status || "PENDING")}
                    </Badge>
                  </div>

                  {/* Info do Card */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-medium">
                        {format(new Date(booking.start_time), "HH:mm", { locale: ptBR })}
                        {" - "}
                        {format(new Date(booking.end_time), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {booking.space && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="line-clamp-1">{booking.space.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer com valor */}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-sm font-bold text-foreground">
                      {formatCurrency(Number(booking.grand_total) || 0)}
                    </p>
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
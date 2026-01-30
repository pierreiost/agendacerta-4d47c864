import { useMemo } from "react";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBookings } from "@/hooks/useBookings";
import { useProfessionals } from "@/hooks/useProfessionals";
import { DollarSign, Scissors, Users, Clock, ArrowRight, Plus, Star, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function DashboardAppointments() {
  const navigate = useNavigate();
  const { bookings, isLoading } = useBookings();
  const { professionals } = useProfessionals();

  const metrics = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return {
        todayAppointments: 0,
        monthRevenue: 0,
        avgTicket: 0,
        revenueSparkline: [0, 0, 0, 0, 0, 0, 0],
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filtrar apenas agendamentos de serviço
    const serviceBookings = bookings.filter((b) => b.booking_type === 'service');

    const todayAppointments = serviceBookings.filter((b) => {
      const bookingDate = new Date(b.start_time);
      return bookingDate >= today && bookingDate < tomorrow && b.status !== "CANCELLED";
    });

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthBookings = serviceBookings.filter((b) => {
      const bookingDate = new Date(b.start_time);
      return (
        bookingDate.getMonth() === currentMonth && 
        bookingDate.getFullYear() === currentYear && 
        b.status === "FINALIZED"
      );
    });

    const monthRevenue = monthBookings.reduce((sum, b) => sum + (Number(b.grand_total) || 0), 0);
    const avgTicket = monthBookings.length > 0 ? monthRevenue / monthBookings.length : 0;

    // Sparkline data - últimos 7 dias
    const revenueSparkline: number[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayBookings = serviceBookings.filter((b) => {
        const bookingDate = new Date(b.start_time);
        return bookingDate >= date && bookingDate < nextDate && b.status === "FINALIZED";
      });
      
      const dayRevenue = dayBookings.reduce((sum, b) => sum + (Number(b.grand_total) || 0), 0);
      revenueSparkline.push(dayRevenue);
    }

    return {
      todayAppointments: todayAppointments.length,
      monthRevenue,
      avgTicket,
      revenueSparkline,
    };
  }, [bookings]);

  // Próximos clientes (agendamentos do dia/próximos)
  const upcomingClients = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];

    const now = new Date();
    return bookings
      .filter((b) => {
        const startTime = new Date(b.start_time);
        return startTime > now && b.status !== "CANCELLED" && b.booking_type === 'service';
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 5);
  }, [bookings]);

  // Profissional com mais atendimentos hoje
  const topProfessional = useMemo(() => {
    if (!bookings || !professionals || professionals.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookings = bookings.filter((b) => {
      const bookingDate = new Date(b.start_time);
      return bookingDate >= today && bookingDate < tomorrow && b.status !== "CANCELLED" && b.booking_type === 'service';
    });

    const countByProfessional: Record<string, number> = {};
    todayBookings.forEach((b) => {
      if (b.professional_id) {
        countByProfessional[b.professional_id] = (countByProfessional[b.professional_id] || 0) + 1;
      }
    });

    let maxCount = 0;
    let topProfId: string | null = null;
    Object.entries(countByProfessional).forEach(([profId, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topProfId = profId;
      }
    });

    if (!topProfId) return null;

    const prof = professionals.find((p) => p.id === topProfId);
    return prof ? { ...prof, count: maxCount } : null;
  }, [bookings, professionals]);

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
          title="Atendimentos Hoje"
          value={metrics.todayAppointments}
          icon={Scissors}
          color="purple"
          tooltip="Total de atendimentos agendados para hoje"
        />
        <MetricCard
          title="Faturamento Mês"
          value={formatCurrency(metrics.monthRevenue)}
          icon={DollarSign}
          color="green"
          sparklineData={metrics.revenueSparkline}
          tooltip="Soma dos valores de atendimentos finalizados no mês"
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(metrics.avgTicket)}
          icon={Users}
          color="blue"
          tooltip="Valor médio por atendimento no mês"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Profissional do Dia */}
        {topProfessional && (
          <Card className="border-border shadow-soft lg:col-span-1">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Star className="h-5 w-5 text-warning-500" />
                Destaque do Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary-200">
                  <AvatarImage src={topProfessional.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary-100 text-primary-700 text-lg font-semibold">
                    {(topProfessional.display_name || topProfessional.profile?.full_name || "P")[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground text-lg">
                    {topProfessional.display_name || topProfessional.profile?.full_name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {topProfessional.count} atendimentos hoje
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Próximos Clientes */}
        <Card className={`border-border shadow-soft ${topProfessional ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Próximos Clientes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/agenda")} className="gap-2">
                Ver agenda
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!upcomingClients || upcomingClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="rounded-full bg-primary-100 p-4 mb-4">
                  <Calendar className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum atendimento agendado</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                  Você não tem atendimentos futuros no momento.
                </p>
                <Button onClick={() => navigate("/agenda")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Atendimento
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {upcomingClients.map((booking) => {
                  const professional = professionals?.find((p) => p.id === booking.professional_id);
                  return (
                    <div
                      key={booking.id}
                      className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate("/agenda")}
                    >
                      <div className="flex items-center gap-4">
                        {professional && (
                          <Avatar className="h-10 w-10 border">
                          <AvatarImage src={professional.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary-100 text-primary-700 text-sm">
                              {(professional.display_name || professional.profile?.full_name || "P")[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">
                            {booking.customer_name || "Cliente"}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(new Date(booking.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className={getStatusColor(booking.status || "PENDING")}>
                          {getStatusLabel(booking.status || "PENDING")}
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

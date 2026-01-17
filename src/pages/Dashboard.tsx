import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVenue } from '@/contexts/VenueContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Users, DollarSign, Clock, TrendingUp, MapPin, ChevronRight, Zap, AlertCircle } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, differenceInMinutes, isToday, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BookingOrderSheet } from '@/components/bookings/BookingOrderSheet';
import { Booking } from '@/hooks/useBookings';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  todayBookings: number;
  pendingBookings: number;
  monthRevenue: number;
  totalSpaces: number;
}

type TimeIndicator = 'now' | 'soon' | 'today' | 'past' | null;

export default function Dashboard() {
  const { currentVenue } = useVenue();
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    pendingBookings: 0,
    monthRevenue: 0,
    totalSpaces: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!currentVenue) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const monthStart = startOfMonth(today).toISOString();
      const monthEnd = endOfMonth(today).toISOString();

      try {
        // Today's bookings
        const { count: todayCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('venue_id', currentVenue.id)
          .gte('start_time', todayStart)
          .lte('start_time', todayEnd);

        // Pending bookings
        const { count: pendingCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('venue_id', currentVenue.id)
          .eq('status', 'PENDING');

        // Month revenue (from finalized bookings)
        const { data: revenueData } = await supabase
          .from('bookings')
          .select('grand_total')
          .eq('venue_id', currentVenue.id)
          .eq('status', 'FINALIZED')
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd);

        const monthRevenue = revenueData?.reduce((sum, b) => sum + (b.grand_total || 0), 0) || 0;

        // Total spaces
        const { count: spacesCount } = await supabase
          .from('spaces')
          .select('*', { count: 'exact', head: true })
          .eq('venue_id', currentVenue.id)
          .eq('is_active', true);

        // Recent bookings
        const { data: recent } = await supabase
          .from('bookings')
          .select(`
            *,
            space:spaces(*)
          `)
          .eq('venue_id', currentVenue.id)
          .order('created_at', { ascending: false })
          .limit(6);

        setStats({
          todayBookings: todayCount || 0,
          pendingBookings: pendingCount || 0,
          monthRevenue,
          totalSpaces: spacesCount || 0,
        });

        setRecentBookings(recent || []);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentVenue]);

  const getTimeIndicator = (startTime: string, endTime: string): TimeIndicator => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // Currently happening
    if (start <= now && end > now) {
      return 'now';
    }
    
    // Starting within 2 hours
    const twoHoursFromNow = addHours(now, 2);
    if (start > now && start <= twoHoursFromNow) {
      return 'soon';
    }
    
    // Today but more than 2 hours away
    if (isToday(start) && start > twoHoursFromNow) {
      return 'today';
    }
    
    // Already ended today
    if (isToday(start) && end <= now) {
      return 'past';
    }
    
    return null;
  };

  const getTimeIndicatorBadge = (indicator: TimeIndicator) => {
    switch (indicator) {
      case 'now':
        return (
          <Badge className="bg-success text-success-foreground border-0 animate-pulse gap-1">
            <Zap className="h-3 w-3" />
            Acontecendo agora
          </Badge>
        );
      case 'soon':
        return (
          <Badge className="bg-warning text-warning-foreground border-0 gap-1">
            <AlertCircle className="h-3 w-3" />
            Em breve
          </Badge>
        );
      case 'today':
        return (
          <Badge variant="secondary" className="gap-1">
            <Calendar className="h-3 w-3" />
            Hoje
          </Badge>
        );
      case 'past':
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            <Clock className="h-3 w-3" />
            Encerrado
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCardBorderClass = (indicator: TimeIndicator) => {
    switch (indicator) {
      case 'now':
        return 'border-success/50 ring-2 ring-success/20';
      case 'soon':
        return 'border-warning/50';
      case 'today':
        return 'border-primary/30';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-success/10 text-success border-success/20';
      case 'PENDING':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'CANCELLED':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'FINALIZED':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmado';
      case 'PENDING':
        return 'Pendente';
      case 'CANCELLED':
        return 'Cancelado';
      case 'FINALIZED':
        return 'Finalizado';
      default:
        return status;
    }
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const minutes = differenceInMinutes(new Date(endTime), new Date(startTime));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  const formatCurrency = (value: number | null) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const handleBookingClick = (booking: any) => {
    setSelectedBooking(booking as Booking);
    setSheetOpen(true);
  };

  if (!currentVenue) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Selecione uma unidade para ver o dashboard.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reservas Hoje
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayBookings}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendentes
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingBookings}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Faturamento (Mês)
              </CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.monthRevenue)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Espaços Ativos
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSpaces}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings Cards */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Reservas Recentes</h2>
          </div>
          
          {recentBookings.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Nenhuma reserva encontrada.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentBookings.map((booking) => {
                const timeIndicator = getTimeIndicator(booking.start_time, booking.end_time);
                const indicatorBadge = getTimeIndicatorBadge(timeIndicator);
                const cardBorderClass = getCardBorderClass(timeIndicator);
                
                return (
                  <Card 
                    key={booking.id}
                    className={`shadow-card cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 group ${cardBorderClass}`}
                    onClick={() => handleBookingClick(booking)}
                  >
                    <CardContent className="p-4">
                      {/* Time indicator badge */}
                      {indicatorBadge && (
                        <div className="mb-3">
                          {indicatorBadge}
                        </div>
                      )}
                      
                      {/* Header with status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {booking.customer_name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{booking.space?.name || 'Espaço não encontrado'}</span>
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium border flex-shrink-0 ${getStatusColor(booking.status)}`}>
                          {getStatusLabel(booking.status)}
                        </span>
                      </div>

                      {/* Date and time */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {format(new Date(booking.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        <span className="text-muted-foreground/50">•</span>
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDuration(booking.start_time, booking.end_time)}</span>
                      </div>

                      {/* Footer with value and action hint */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Total: </span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(booking.grand_total)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                          <span>Gerenciar</span>
                          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Booking Order Sheet */}
      <BookingOrderSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        booking={selectedBooking}
      />
    </AppLayout>
  );
}

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVenue } from '@/contexts/VenueContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Users, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  todayBookings: number;
  pendingBookings: number;
  monthRevenue: number;
  totalSpaces: number;
}

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
            spaces(name)
          `)
          .eq('venue_id', currentVenue.id)
          .order('created_at', { ascending: false })
          .limit(5);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-success/10 text-success';
      case 'PENDING':
        return 'bg-warning/10 text-warning';
      case 'CANCELLED':
        return 'bg-destructive/10 text-destructive';
      case 'FINALIZED':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-muted text-muted-foreground';
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
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(stats.monthRevenue)}
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

        {/* Recent Bookings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Reservas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma reserva encontrada.
              </p>
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{booking.customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.spaces?.name} •{' '}
                        {format(new Date(booking.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

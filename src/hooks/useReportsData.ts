import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useBookings } from '@/hooks/useBookings';
import { useCustomers } from '@/hooks/useCustomers';
import { useServiceOrders } from '@/hooks/useServiceOrders';
import { useSpaces } from '@/hooks/useSpaces';
import { useServices } from '@/hooks/useServices';
import { parseISO, getHours, differenceInHours, differenceInDays } from 'date-fns';

export interface ReportsDateRange {
  start: Date;
  end: Date;
}

export function useReportsData(dateRange: ReportsDateRange) {
  const { currentVenue } = useVenue();
  const segment = currentVenue?.segment || 'sports';
  const { bookings, isLoading: bookingsLoading } = useBookings(dateRange.start, dateRange.end);
  const { customers } = useCustomers();
  const { orders } = useServiceOrders();
  const { spaces } = useSpaces();
  const { services } = useServices();

  // Booking services for beauty/health segments
  const { data: bookingServices } = useQuery({
    queryKey: ['report-booking-services', currentVenue?.id, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!currentVenue?.id) return [];
      const bookingIds = bookings.filter(b => b.status === 'FINALIZED').map(b => b.id);
      if (bookingIds.length === 0) return [];

      const { data, error } = await supabase
        .from('booking_services')
        .select('*, service:services(title)')
        .in('booking_id', bookingIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentVenue?.id && (segment === 'beauty' || segment === 'health') && bookings.length > 0,
  });

  // Venue members for professional names
  const { data: venueMembers } = useQuery({
    queryKey: ['report-venue-members', currentVenue?.id],
    queryFn: async () => {
      if (!currentVenue?.id) return [];
      const { data, error } = await supabase
        .from('venue_members')
        .select('id, display_name, user_id')
        .eq('venue_id', currentVenue.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentVenue?.id && (segment === 'beauty' || segment === 'health'),
  });

  // ========== SPORTS STATS ==========
  const sportsStats = useMemo(() => {
    const finalized = bookings.filter(b => b.status === 'FINALIZED');
    const active = bookings.filter(b => b.status !== 'CANCELLED');
    const totalRevenue = finalized.reduce((sum, b) => sum + Number(b.grand_total || 0), 0);
    const totalHours = active.reduce((sum, b) => sum + differenceInHours(parseISO(b.end_time), parseISO(b.start_time)), 0);
    const uniqueCustomers = new Set(active.map(b => b.customer_name.toLowerCase())).size;
    return { totalRevenue, totalBookings: active.length, totalHours, uniqueCustomers };
  }, [bookings]);

  // ========== BEAUTY/HEALTH STATS ==========
  const serviceStats = useMemo(() => {
    const finalized = bookings.filter(b => b.status === 'FINALIZED');
    const active = bookings.filter(b => b.status !== 'CANCELLED');
    const totalRevenue = (bookingServices || []).reduce((sum, bs) => sum + Number(bs.price || 0), 0);
    const totalAppointments = active.length;
    const ticketMedio = finalized.length > 0 ? totalRevenue / finalized.length : 0;
    const uniqueCustomers = new Set(active.map(b => b.customer_name.toLowerCase())).size;
    return { totalRevenue, totalAppointments, ticketMedio, uniqueCustomers };
  }, [bookings, bookingServices]);

  // ========== CUSTOM (OS) STATS ==========
  const osStats = useMemo(() => {
    const filtered = orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= dateRange.start && d <= dateRange.end;
    });
    const total = filtered.length;
    const finalizedOrders = filtered.filter(o =>
      o.status_simple === 'finished' || o.status_simple === 'invoiced' ||
      o.status_complete === 'finished' || o.status_complete === 'invoiced'
    );
    const totalRevenue = finalizedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const openCount = filtered.filter(o =>
      o.status_simple === 'open' || o.status_complete === 'draft' ||
      o.status_complete === 'in_progress' || o.status_complete === 'approved'
    ).length;
    const finishedCount = finalizedOrders.length;
    const ticketMedio = finishedCount > 0 ? totalRevenue / finishedCount : 0;

    let partsTotal = 0;
    let laborTotal = 0;
    finalizedOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const desc = item.description.toLowerCase();
        const isLabor = desc.includes('mão de obra') || desc.includes('serviço') ||
          desc.includes('instalação') || desc.includes('manutenção') ||
          desc.includes('limpeza') || desc.includes('reparo');
        if (isLabor) laborTotal += Number(item.subtotal);
        else partsTotal += Number(item.subtotal);
      });
    });

    // Average completion time
    const completedWithDates = finalizedOrders.filter(o => o.finished_at);
    const avgDays = completedWithDates.length > 0
      ? completedWithDates.reduce((sum, o) => sum + differenceInDays(new Date(o.finished_at!), new Date(o.created_at)), 0) / completedWithDates.length
      : 0;

    return { total, totalRevenue, partsTotal, laborTotal, openCount, finishedCount, ticketMedio, avgCompletionDays: Math.round(avgDays) };
  }, [orders, dateRange]);

  // ========== CHARTS DATA ==========

  // Revenue by space (sports)
  const revenueBySpace = useMemo(() => {
    const data: Record<string, number> = {};
    bookings.filter(b => b.status === 'FINALIZED').forEach(b => {
      const name = b.space?.name || 'Outro';
      data[name] = (data[name] || 0) + Number(b.grand_total || 0);
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [bookings]);

  // Revenue by service (beauty/health)
  const revenueByService = useMemo(() => {
    const data: Record<string, number> = {};
    (bookingServices || []).forEach(bs => {
      const title = (bs.service as any)?.title || 'Outro';
      data[title] = (data[title] || 0) + Number(bs.price || 0);
    });
    return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [bookingServices]);

  // Revenue by professional (beauty/health)
  const revenueByProfessional = useMemo(() => {
    const data: Record<string, number> = {};
    (bookingServices || []).forEach(bs => {
      if (!bs.professional_id) return;
      const member = (venueMembers || []).find(m => m.id === bs.professional_id);
      const name = member?.display_name || 'Sem profissional';
      data[name] = (data[name] || 0) + Number(bs.price || 0);
    });
    return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [bookingServices, venueMembers]);

  // Bookings by hour (sports/beauty/health)
  const bookingsByHour = useMemo(() => {
    const hours = Array.from({ length: 18 }, (_, i) => ({
      hour: `${(i + 6).toString().padStart(2, '0')}:00`,
      count: 0,
    }));
    bookings.filter(b => b.status !== 'CANCELLED').forEach(b => {
      const startHour = getHours(parseISO(b.start_time));
      const endHour = getHours(parseISO(b.end_time));
      for (let h = startHour; h < endHour; h++) {
        if (h >= 6 && h < 24) hours[h - 6].count++;
      }
    });
    return hours;
  }, [bookings]);

  // Top customers (all segments)
  const topCustomers = useMemo(() => {
    if (segment === 'custom') {
      const filtered = orders.filter(o => {
        const d = new Date(o.created_at);
        return d >= dateRange.start && d <= dateRange.end;
      });
      const data: Record<string, { count: number; revenue: number }> = {};
      filtered.filter(o =>
        o.status_simple === 'finished' || o.status_simple === 'invoiced' ||
        o.status_complete === 'finished' || o.status_complete === 'invoiced'
      ).forEach(o => {
        const name = o.customer_name;
        if (!data[name]) data[name] = { count: 0, revenue: 0 };
        data[name].count++;
        data[name].revenue += Number(o.total || 0);
      });
      return Object.entries(data).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    }
    const data: Record<string, { count: number; revenue: number }> = {};
    bookings.filter(b => b.status === 'FINALIZED').forEach(b => {
      const name = b.customer_name;
      if (!data[name]) data[name] = { count: 0, revenue: 0 };
      data[name].count++;
      data[name].revenue += Number(b.grand_total || 0);
    });
    return Object.entries(data).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [bookings, orders, segment, dateRange]);

  // OS by status (custom)
  const osByStatus = useMemo(() => {
    const filtered = orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= dateRange.start && d <= dateRange.end;
    });
    const statusMap: Record<string, string> = {
      open: 'Aberta', finished: 'Finalizada', invoiced: 'Faturada',
      draft: 'Rascunho', approved: 'Aprovada', in_progress: 'Em Andamento', cancelled: 'Cancelada',
    };
    const data: Record<string, number> = {};
    filtered.forEach(o => {
      const status = o.order_type === 'simple'
        ? statusMap[o.status_simple || ''] || 'Outro'
        : statusMap[o.status_complete || ''] || 'Outro';
      data[status] = (data[status] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [orders, dateRange]);

  // Service popularity (beauty/health)
  const servicePopularity = useMemo(() => {
    const data: Record<string, number> = {};
    (bookingServices || []).forEach(bs => {
      const title = (bs.service as any)?.title || 'Outro';
      data[title] = (data[title] || 0) + 1;
    });
    return Object.entries(data).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [bookingServices]);

  // Occupancy rate by space (sports)
  const occupancyBySpace = useMemo(() => {
    if (!spaces.length) return [];
    const daysInPeriod = Math.max(1, differenceInDays(dateRange.end, dateRange.start) + 1);
    const hoursPerDay = 12; // assume 12h operating
    const maxHours = daysInPeriod * hoursPerDay;

    return spaces.filter(s => s.is_active).map(space => {
      const spaceBookings = bookings.filter(b => b.space_id === space.id && b.status !== 'CANCELLED');
      const usedHours = spaceBookings.reduce((sum, b) => sum + differenceInHours(parseISO(b.end_time), parseISO(b.start_time)), 0);
      return {
        name: space.name,
        taxa: Math.round((usedHours / maxHours) * 100),
        horas: usedHours,
      };
    }).sort((a, b) => b.taxa - a.taxa);
  }, [spaces, bookings, dateRange]);

  return {
    segment,
    isLoading: bookingsLoading,
    customers,
    bookings,
    orders,
    // Stats
    sportsStats,
    serviceStats,
    osStats,
    // Charts
    revenueBySpace,
    revenueByService,
    revenueByProfessional,
    bookingsByHour,
    topCustomers,
    osByStatus,
    servicePopularity,
    occupancyBySpace,
    // Raw
    dateRange,
  };
}

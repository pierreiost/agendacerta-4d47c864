import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ClientBooking {
  booking_id: string;
  customer_name: string;
  start_time: string;
  end_time: string;
  status: string;
  grand_total: number | null;
  service_title: string | null;
  professional_name: string | null;
  venue_name: string;
  venue_whatsapp: string | null;
}

export function useClientBookings() {
  const [phone, setPhone] = useState('');
  const [searchPhone, setSearchPhone] = useState<string | null>(null);

  const { data: bookings, isLoading, isError } = useQuery({
    queryKey: ['client-bookings', searchPhone],
    queryFn: async () => {
      if (!searchPhone) return [];
      const cleanPhone = searchPhone.replace(/\D/g, '');
      const { data, error } = await supabase.rpc('get_client_bookings_by_phone', {
        p_phone: cleanPhone,
      });
      if (error) throw error;
      return (data as unknown as ClientBooking[]) ?? [];
    },
    enabled: !!searchPhone,
  });

  const search = () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 8) {
      setSearchPhone(digits);
    }
  };

  const clear = () => {
    setSearchPhone(null);
  };

  return { phone, setPhone, bookings: bookings ?? [], isLoading, isError, search, clear, hasSearched: !!searchPhone };
}

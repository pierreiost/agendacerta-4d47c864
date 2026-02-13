import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface DuplicateCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
}

export function useRegisterCustomer() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRegistering, setIsRegistering] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateCustomer[]>([]);
  const [pendingBooking, setPendingBooking] = useState<{
    id: string;
    customer_name: string;
    customer_email?: string | null;
    customer_phone?: string | null;
    venue_id: string;
  } | null>(null);

  const cleanEmail = (email?: string | null) =>
    email && !email.includes('@agendamento.local') ? email : null;

  const checkDuplicates = async (booking: typeof pendingBooking) => {
    if (!currentVenue?.id || !booking) return [];

    const filters: string[] = [];
    if (booking.customer_name) filters.push(`name.ilike.%${booking.customer_name}%`);
    const phone = booking.customer_phone?.replace(/\D/g, '');
    if (phone && phone.length >= 8) filters.push(`phone.ilike.%${phone.slice(-8)}%`);
    const email = cleanEmail(booking.customer_email);
    if (email) filters.push(`email.ilike.%${email}%`);

    if (filters.length === 0) return [];

    const { data } = await supabase
      .from('customers')
      .select('id, name, email, phone, document')
      .eq('venue_id', currentVenue.id)
      .or(filters.join(','));

    return (data ?? []) as DuplicateCustomer[];
  };

  const registerCustomerFromBooking = async (booking: {
    id: string;
    customer_name: string;
    customer_email?: string | null;
    customer_phone?: string | null;
    venue_id: string;
  }) => {
    if (!currentVenue?.id) return;
    setIsRegistering(true);

    try {
      const found = await checkDuplicates(booking);
      if (found.length > 0) {
        setDuplicates(found);
        setPendingBooking(booking);
        setIsRegistering(false);
        return null; // signal: show dialog
      }

      return await createAndLink(booking);
    } catch (error: any) {
      toast({ title: 'Erro ao cadastrar cliente', description: error.message, variant: 'destructive' });
      setIsRegistering(false);
      return null;
    }
  };

  const linkExistingCustomer = async (customerId: string) => {
    if (!pendingBooking) return;
    setIsRegistering(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ customer_id: customerId })
        .eq('id', pendingBooking.id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['booking'] });
      toast({ title: 'Cliente vinculado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao vincular cliente', description: error.message, variant: 'destructive' });
    } finally {
      setIsRegistering(false);
      setDuplicates([]);
      setPendingBooking(null);
    }
  };

  const forceCreate = async () => {
    if (!pendingBooking) return;
    setIsRegistering(true);
    try {
      await createAndLink(pendingBooking);
    } catch (error: any) {
      toast({ title: 'Erro ao cadastrar cliente', description: error.message, variant: 'destructive' });
    } finally {
      setIsRegistering(false);
      setDuplicates([]);
      setPendingBooking(null);
    }
  };

  const createAndLink = async (booking: NonNullable<typeof pendingBooking>) => {
    const email = cleanEmail(booking.customer_email);

    const { data: customer, error: createError } = await supabase
      .from('customers')
      .insert({
        venue_id: currentVenue!.id,
        name: booking.customer_name,
        email,
        phone: booking.customer_phone || null,
      })
      .select()
      .single();

    if (createError) throw createError;

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ customer_id: customer.id })
      .eq('id', booking.id);

    if (updateError) throw updateError;

    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['booking'] });
    toast({ title: 'Cliente cadastrado com sucesso!' });
    setDuplicates([]);
    setPendingBooking(null);
    setIsRegistering(false);
    return customer;
  };

  const dismissDuplicates = () => {
    setDuplicates([]);
    setPendingBooking(null);
  };

  return {
    registerCustomerFromBooking,
    isRegistering,
    duplicates,
    linkExistingCustomer,
    forceCreate,
    dismissDuplicates,
  };
}

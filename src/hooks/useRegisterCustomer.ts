import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function useRegisterCustomer() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRegistering, setIsRegistering] = useState(false);

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
      // Filter out placeholder emails
      const email = booking.customer_email && !booking.customer_email.includes('@agendamento.local')
        ? booking.customer_email
        : null;

      const { data: customer, error: createError } = await supabase
        .from('customers')
        .insert({
          venue_id: currentVenue.id,
          name: booking.customer_name,
          email,
          phone: booking.customer_phone || null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Link customer to booking
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ customer_id: customer.id })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['booking'] });

      toast({ title: 'Cliente cadastrado com sucesso!' });
      return customer;
    } catch (error: any) {
      toast({
        title: 'Erro ao cadastrar cliente',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsRegistering(false);
    }
  };

  return { registerCustomerFromBooking, isRegistering };
}

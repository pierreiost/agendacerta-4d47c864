import { supabase } from '@/integrations/supabase/client';
import { useBookingErrors, SupabaseError } from '@/hooks/useBookingErrors';

/**
 * Hook para verificação de conflitos de reservas
 * Usado como fallback - preferir usar create_booking_atomic RPC
 */
export function useBookingConflicts() {
  const { handleAuthError } = useBookingErrors();

  const checkConflict = async (
    spaceId: string, 
    startTime: Date, 
    endTime: Date, 
    excludeBookingId?: string
  ): Promise<boolean> => {
    let query = supabase
      .from('bookings')
      .select('id')
      .eq('space_id', spaceId)
      .neq('status', 'CANCELLED')
      .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`);

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;
    
    if (error) {
      handleAuthError(error as SupabaseError);
      throw error;
    }
    
    return data.length > 0;
  };

  return { checkConflict };
}

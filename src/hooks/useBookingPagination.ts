import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBookingErrors, SupabaseError } from '@/hooks/useBookingErrors';
import type { Booking } from '@/hooks/useBookings';
import type { Database } from '@/integrations/supabase/types';

type BookingStatus = Database['public']['Enums']['booking_status'];

export interface PaginationParams {
  pageSize?: number;
  startDate?: Date;
  endDate?: Date;
  spaceIds?: string[];
  statuses?: BookingStatus[];
  searchQuery?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

const DEFAULT_PAGE_SIZE = 50;

/**
 * Hook para paginação virtual de reservas
 * Usa infinite query para carregar dados sob demanda
 */
export function useBookingsPaginated(params: PaginationParams = {}) {
  const { currentVenue } = useVenue();
  const { user } = useAuth();
  const { handleAuthError, shouldRetry } = useBookingErrors();
  
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    startDate,
    endDate,
    spaceIds,
    statuses,
    searchQuery,
  } = params;

  // Query para contagem total
  const countQuery = useQuery({
    queryKey: ['bookings-count', currentVenue?.id, startDate?.toISOString(), endDate?.toISOString(), spaceIds, statuses, searchQuery],
    queryFn: async () => {
      if (!currentVenue?.id) return 0;

      let query = supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', currentVenue.id);

      if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('end_time', endDate.toISOString());
      }
      if (spaceIds && spaceIds.length > 0) {
        query = query.in('space_id', spaceIds);
      }
      if (statuses && statuses.length > 0) {
        query = query.in('status', statuses);
      }
      if (searchQuery?.trim()) {
        const q = searchQuery.toLowerCase();
        query = query.or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%`);
      }

      const { count, error } = await query;

      if (error) {
        if (handleAuthError(error as SupabaseError)) {
          return 0;
        }
        throw error;
      }

      return count ?? 0;
    },
    enabled: !!currentVenue?.id && !!user,
    retry: shouldRetry,
  });

  // Infinite query para paginação virtual
  const infiniteQuery = useInfiniteQuery({
    queryKey: ['bookings-paginated', currentVenue?.id, startDate?.toISOString(), endDate?.toISOString(), spaceIds, statuses, searchQuery, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      if (!currentVenue?.id) return { data: [], nextCursor: undefined };

      let query = supabase
        .from('bookings')
        .select('*, space:spaces(*)')
        .eq('venue_id', currentVenue.id)
        .order('start_time', { ascending: true })
        .range(pageParam, pageParam + pageSize - 1);

      if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('end_time', endDate.toISOString());
      }
      if (spaceIds && spaceIds.length > 0) {
        query = query.in('space_id', spaceIds);
      }
      if (statuses && statuses.length > 0) {
        query = query.in('status', statuses);
      }
      if (searchQuery?.trim()) {
        const q = searchQuery.toLowerCase();
        query = query.or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%`);
      }

      const { data, error } = await query;

      if (error) {
        if (handleAuthError(error as SupabaseError)) {
          return { data: [], nextCursor: undefined };
        }
        throw error;
      }

      const hasMore = data.length === pageSize;
      return {
        data: data as Booking[],
        nextCursor: hasMore ? pageParam + pageSize : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!currentVenue?.id && !!user,
    retry: shouldRetry,
  });

  // Flatten all pages into a single array
  const allBookings = infiniteQuery.data?.pages.flatMap((page) => page.data) ?? [];

  return {
    bookings: allBookings,
    totalCount: countQuery.data ?? 0,
    isLoading: infiniteQuery.isLoading || countQuery.isLoading,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    error: infiniteQuery.error || countQuery.error,
    isError: infiniteQuery.isError || countQuery.isError,
    refetch: () => {
      infiniteQuery.refetch();
      countQuery.refetch();
    },
  };
}

/**
 * Hook para paginação offset-based tradicional
 * Útil para tabelas com navegação por páginas
 */
export function useBookingsOffset(params: PaginationParams & { page?: number } = {}) {
  const { currentVenue } = useVenue();
  const { user } = useAuth();
  const { handleAuthError, shouldRetry } = useBookingErrors();
  
  const {
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    startDate,
    endDate,
    spaceIds,
    statuses,
    searchQuery,
  } = params;

  const offset = (page - 1) * pageSize;

  return useQuery({
    queryKey: ['bookings-offset', currentVenue?.id, page, pageSize, startDate?.toISOString(), endDate?.toISOString(), spaceIds, statuses, searchQuery],
    queryFn: async () => {
      if (!currentVenue?.id) return { data: [], totalCount: 0, hasMore: false };

      // Get count first
      let countQuery = supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', currentVenue.id);

      if (startDate) countQuery = countQuery.gte('start_time', startDate.toISOString());
      if (endDate) countQuery = countQuery.lte('end_time', endDate.toISOString());
      if (spaceIds?.length) countQuery = countQuery.in('space_id', spaceIds);
      if (statuses?.length) countQuery = countQuery.in('status', statuses);
      if (searchQuery?.trim()) {
        const q = searchQuery.toLowerCase();
        countQuery = countQuery.or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%`);
      }

      const { count, error: countError } = await countQuery;
      if (countError) {
        if (handleAuthError(countError as SupabaseError)) {
          return { data: [], totalCount: 0, hasMore: false };
        }
        throw countError;
      }

      // Get data
      let dataQuery = supabase
        .from('bookings')
        .select('*, space:spaces(*)')
        .eq('venue_id', currentVenue.id)
        .order('start_time', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (startDate) dataQuery = dataQuery.gte('start_time', startDate.toISOString());
      if (endDate) dataQuery = dataQuery.lte('end_time', endDate.toISOString());
      if (spaceIds?.length) dataQuery = dataQuery.in('space_id', spaceIds);
      if (statuses?.length) dataQuery = dataQuery.in('status', statuses);
      if (searchQuery?.trim()) {
        const q = searchQuery.toLowerCase();
        dataQuery = dataQuery.or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%`);
      }

      const { data, error } = await dataQuery;

      if (error) {
        if (handleAuthError(error as SupabaseError)) {
          return { data: [], totalCount: 0, hasMore: false };
        }
        throw error;
      }

      const totalCount = count ?? 0;
      const hasMore = offset + pageSize < totalCount;

      return {
        data: data as Booking[],
        totalCount,
        hasMore,
        currentPage: page,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    },
    enabled: !!currentVenue?.id && !!user,
    retry: shouldRetry,
  });
}

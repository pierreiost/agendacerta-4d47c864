import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MarketplaceVenue {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  niche_name: string | null;
  primary_color: string | null;
  segment: string | null;
}

interface MarketplaceFilters {
  niches: { id: string; name: string; slug: string; segment: string }[];
  cities: string[];
}

export function useMarketplaceVenues(nicheId: string | null, city: string | null) {
  return useQuery({
    queryKey: ['marketplace-venues', nicheId, city],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_marketplace_venues', {
        p_niche_id: nicheId || undefined,
        p_city: city || undefined,
      });
      if (error) throw error;
      return (data || []) as MarketplaceVenue[];
    },
  });
}

export function useMarketplaceFilters() {
  return useQuery({
    queryKey: ['marketplace-filters'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_marketplace_filters');
      if (error) throw error;
      return (data || { niches: [], cities: [] }) as unknown as MarketplaceFilters;
    },
    staleTime: 5 * 60 * 1000,
  });
}

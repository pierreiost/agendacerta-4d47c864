import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { Tables } from '@/integrations/supabase/types';

type Venue = Tables<'venues'>;

export type VenueStatus = 'trialing' | 'active' | 'overdue' | 'suspended';
export type PlanType = 'basic' | 'max';

interface VenueWithRole extends Venue {
  role: 'admin' | 'manager' | 'staff' | 'superadmin';
}

interface VenueContextType {
  venues: VenueWithRole[];
  currentVenue: VenueWithRole | null;
  setCurrentVenue: (venue: VenueWithRole | null) => void;
  loading: boolean;
  refetchVenues: () => Promise<void>;
}

const VenueContext = createContext<VenueContextType | undefined>(undefined);

export function VenueProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [venues, setVenues] = useState<VenueWithRole[]>([]);
  const [currentVenue, setCurrentVenue] = useState<VenueWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVenues = async () => {
    if (!user) {
      setVenues([]);
      setCurrentVenue(null);
      setLoading(false);
      return;
    }

    // When refetching after onboarding/login we need to block ProtectedRoute
    // until the memberships/venues are loaded.
    setLoading(true);

    try {
      // Fetch venue_members for this user
      const { data: memberships, error: memberError } = await supabase
        .from('venue_members')
        .select('venue_id, role')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      if (!memberships || memberships.length === 0) {
        setVenues([]);
        setCurrentVenue(null);
        setLoading(false);
        return;
      }

      // Fetch venues
      const venueIds = memberships.map(m => m.venue_id);
      const { data: venuesData, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .in('id', venueIds);

      if (venueError) throw venueError;

      // Combine venues with roles
      const venuesWithRoles: VenueWithRole[] = (venuesData || []).map(venue => {
        const membership = memberships.find(m => m.venue_id === venue.id);
        return {
          ...venue,
          role: membership?.role || 'staff',
        };
      });

      setVenues(venuesWithRoles);

      // Set current venue from localStorage or first venue
      const storedVenueId = localStorage.getItem('currentVenueId');
      const storedVenue = venuesWithRoles.find(v => v.id === storedVenueId);
      
      if (storedVenue) {
        setCurrentVenue(storedVenue);
      } else if (venuesWithRoles.length > 0) {
        setCurrentVenue(venuesWithRoles[0]);
        localStorage.setItem('currentVenueId', venuesWithRoles[0].id);
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, [user]);

  const handleSetCurrentVenue = (venue: VenueWithRole | null) => {
    setCurrentVenue(venue);
    if (venue) {
      localStorage.setItem('currentVenueId', venue.id);
    } else {
      localStorage.removeItem('currentVenueId');
    }
  };

  return (
    <VenueContext.Provider value={{
      venues,
      currentVenue,
      setCurrentVenue: handleSetCurrentVenue,
      loading,
      refetchVenues: fetchVenues
    }}>
      {children}
    </VenueContext.Provider>
  );
}

export function useVenue() {
  const context = useContext(VenueContext);
  if (context === undefined) {
    throw new Error('useVenue must be used within a VenueProvider');
  }
  return context;
}

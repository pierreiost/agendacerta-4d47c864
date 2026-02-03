// Types for the multi-segment service model (beauty/health)

export type VenueSegment = 'sports' | 'beauty' | 'health' | 'custom';

export interface Service {
  id: string;
  venue_id: string;
  title: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceInsert {
  venue_id: string;
  title: string;
  description?: string | null;
  price: number;
  duration_minutes?: number;
  is_active?: boolean;
  display_order?: number;
}

export interface ServiceUpdate {
  title?: string;
  description?: string | null;
  price?: number;
  duration_minutes?: number;
  is_active?: boolean;
  display_order?: number;
}

export interface ProfessionalService {
  id: string;
  member_id: string;
  service_id: string;
  custom_price: number | null;
  custom_duration: number | null;
  created_at: string;
}

export interface BookableMember {
  id: string;
  user_id: string;
  venue_id: string;
  role: string;
  is_bookable: boolean;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    phone: string | null;
  };
  services?: { id: string; title: string }[];
}

export interface BookingService {
  id: string;
  booking_id: string;
  service_id: string;
  professional_id: string | null;
  price: number;
  duration_minutes: number;
  created_at: string;
  service?: Service;
}

export interface ProfessionalAvailability {
  professional_id: string;
  professional_name: string;
  available_slots: string[];
}

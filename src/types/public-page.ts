// Types for customizable public page sections

export interface HeroSection {
  enabled: boolean;
  title: string | null;
  subtitle: string | null;
  background_image_url: string | null;
  show_cta: boolean;
  cta_text: string;
}

export interface GalleryImage {
  url: string;
  alt: string;
}

export interface GallerySection {
  enabled: boolean;
  images: GalleryImage[];
}

export interface Testimonial {
  id: string;
  author: string;
  role: string;
  content: string;
  avatar_url: string | null;
  rating: number;
}

export interface TestimonialsSection {
  enabled: boolean;
  items: Testimonial[];
}

export interface CustomStat {
  label: string;
  value: string;
}

export interface StatsSection {
  enabled: boolean;
  years_in_business: number | null;
  customers_served: number | null;
  bookings_completed: number | null;
  custom_stats: CustomStat[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqSection {
  enabled: boolean;
  items: FaqItem[];
}

export interface LocationSection {
  enabled: boolean;
  show_map: boolean;
  address_line1: string | null;
  address_line2: string | null;
  google_maps_embed_url: string | null;
}

export interface DaySchedule {
  open: string | null;
  close: string | null;
  closed: boolean;
}

export interface HoursSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface HoursSection {
  enabled: boolean;
  schedule: HoursSchedule;
}

export interface SocialSection {
  enabled: boolean;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  phone: string | null;
  email: string | null;
}

export interface PublicPageSections {
  hero: HeroSection;
  gallery: GallerySection;
  testimonials: TestimonialsSection;
  stats: StatsSection;
  faq: FaqSection;
  location: LocationSection;
  hours: HoursSection;
  social: SocialSection;
}

export const DEFAULT_SECTIONS: PublicPageSections = {
  hero: {
    enabled: true,
    title: null,
    subtitle: null,
    background_image_url: null,
    show_cta: true,
    cta_text: "Agendar agora"
  },
  gallery: {
    enabled: false,
    images: []
  },
  testimonials: {
    enabled: false,
    items: []
  },
  stats: {
    enabled: false,
    years_in_business: null,
    customers_served: null,
    bookings_completed: null,
    custom_stats: []
  },
  faq: {
    enabled: false,
    items: []
  },
  location: {
    enabled: false,
    show_map: true,
    address_line1: null,
    address_line2: null,
    google_maps_embed_url: null
  },
  hours: {
    enabled: false,
    schedule: {
      monday: { open: "08:00", close: "18:00", closed: false },
      tuesday: { open: "08:00", close: "18:00", closed: false },
      wednesday: { open: "08:00", close: "18:00", closed: false },
      thursday: { open: "08:00", close: "18:00", closed: false },
      friday: { open: "08:00", close: "18:00", closed: false },
      saturday: { open: "09:00", close: "14:00", closed: false },
      sunday: { open: null, close: null, closed: true }
    }
  },
  social: {
    enabled: false,
    whatsapp: null,
    instagram: null,
    facebook: null,
    phone: null,
    email: null
  }
};

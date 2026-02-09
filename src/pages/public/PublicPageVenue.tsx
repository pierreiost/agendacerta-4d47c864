import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink } from 'lucide-react';
import { PublicPageSections, DEFAULT_SECTIONS } from '@/types/public-page';
import {
  GallerySection,
  TestimonialsSection,
  FaqSection,
  BookingWidget,
  WhatsAppButton,
  PageHeader,
  MobileBookingButton,
  SocialFloatingButtons,
} from '@/components/public-page';
import { LocationSection } from '@/components/public-page/LocationSection';
import { HoursSection } from '@/components/public-page/HoursSection';
import { StatsSection } from '@/components/public-page/StatsSection';

interface PublicVenue {
  id: string;
  name: string;
  slug: string;
  booking_mode: 'calendar' | 'inquiry' | 'external_link';
  public_settings: {
    external_link_url?: string;
    inquiry_notification_email?: string;
    page_title?: string;
    page_instruction?: string;
  } | null;
  logo_url: string | null;
  primary_color: string | null;
  phone: string | null;
  public_page_sections: PublicPageSections | null;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const isSafeUrl = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase().trim();
  if (lowerUrl.startsWith('javascript:') ||
      lowerUrl.startsWith('data:') ||
      lowerUrl.startsWith('vbscript:') ||
      lowerUrl.startsWith('file:')) {
    return false;
  }
  return lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://');
};

export default function PublicPageVenue() {
  const { slug } = useParams<{ slug: string }>();

  const { data: venue, isLoading: venueLoading, error: venueError } = useQuery({
    queryKey: ['public-venue', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase.rpc('get_public_venue_by_slug', { p_slug: slug });
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const raw = data[0];
      return {
        ...raw,
        booking_mode: raw.booking_mode as PublicVenue['booking_mode'],
        public_settings: raw.public_settings as PublicVenue['public_settings'],
        public_page_sections: raw.public_page_sections as unknown as PublicPageSections | null,
      } as PublicVenue;
    },
    enabled: !!slug,
  });

  // Apply theme colors
  useEffect(() => {
    if (venue?.primary_color) {
      const hsl = hexToHsl(venue.primary_color);
      if (hsl) {
        document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      }
    }
    return () => {
      document.documentElement.style.removeProperty('--primary');
    };
  }, [venue?.primary_color]);

  const sections: PublicPageSections = venue?.public_page_sections
    ? { ...DEFAULT_SECTIONS, ...venue.public_page_sections }
    : DEFAULT_SECTIONS;

  const whatsappPhone = sections.social?.whatsapp || venue?.phone;

  if (venueLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!venue || venueError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardHeader>
            <CardTitle>Página não encontrada</CardTitle>
            <CardDescription>Esta página pública não existe ou não está disponível.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // External link mode
  if (venue.booking_mode === 'external_link') {
    const externalUrl = venue.public_settings?.external_link_url;
    const safeUrl = externalUrl && isSafeUrl(externalUrl) ? externalUrl : null;

    if (safeUrl) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center shadow-xl">
            <CardHeader className="space-y-4">
              {venue.logo_url && (
                <div className="flex justify-center">
                  <img src={venue.logo_url} alt={venue.name} className="h-16 w-auto object-contain" />
                </div>
              )}
              <CardTitle>{venue.name}</CardTitle>
              <CardDescription>Você será redirecionado para nosso sistema de agendamento.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="lg">
                <a href={safeUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Acessar Agendamento
                </a>
              </Button>
            </CardContent>
          </Card>
          <WhatsAppButton phone={whatsappPhone} />
        </div>
      );
    }
  }

  // Verificar se há conteúdo na coluna esquerda
  const hasLeftContent =
    (sections.gallery.enabled && sections.gallery.images.length > 0) ||
    (sections.testimonials.enabled && sections.testimonials.items.length > 0) ||
    (sections.faq.enabled && sections.faq.items.length > 0) ||
    (sections.location.enabled) ||
    (sections.hours.enabled) ||
    (sections.stats.enabled);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header fixo */}
      <PageHeader
        venueName={venue.name}
        logoUrl={venue.logo_url}
        whatsappPhone={whatsappPhone}
      />

      {/* Main Content - Two Column Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-10 lg:pt-28 lg:pb-16">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          {/* Left Column - Content */}
          {hasLeftContent && (
            <div className="flex-1 lg:flex-[55] space-y-2 order-2 lg:order-1">
              {/* Gallery */}
              {sections.gallery.enabled && sections.gallery.images.length > 0 && (
                <GallerySection section={sections.gallery} />
              )}

              {/* Stats */}
              {sections.stats.enabled && (
                <StatsSection section={sections.stats} />
              )}

              {/* Testimonials */}
              {sections.testimonials.enabled && sections.testimonials.items.length > 0 && (
                <TestimonialsSection section={sections.testimonials} />
              )}

              {/* FAQ */}
              {sections.faq.enabled && sections.faq.items.length > 0 && (
                <FaqSection section={sections.faq} />
              )}

              {/* Location */}
              {sections.location.enabled && (
                <LocationSection section={sections.location} />
              )}

              {/* Hours */}
              {sections.hours.enabled && (
                <HoursSection section={sections.hours} />
              )}
            </div>
          )}

          {/* Right Column - Booking Widget (Desktop) */}
          <div
            className={`hidden lg:block lg:flex-[45] order-1 lg:order-2 ${!hasLeftContent ? 'mx-auto max-w-lg' : ''}`}
            id="booking-section"
          >
            <div className="sticky top-24">
              <div className="bg-white rounded-2xl shadow-2xl shadow-black/5 border border-black/5 overflow-hidden">
                <BookingWidget venue={venue} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-sm text-muted-foreground border-t bg-white/50 pb-24 lg:pb-8">
        <p>&copy; {new Date().getFullYear()} {venue.name}. Todos os direitos reservados.</p>
      </footer>

      {/* Mobile: Botão fixo que abre drawer */}
      <MobileBookingButton venue={venue} />

      {/* Social Floating Buttons (WhatsApp + Instagram) */}
      <SocialFloatingButtons
        whatsappPhone={whatsappPhone}
        instagramHandle={sections.social?.instagram}
      />
    </div>
  );
}

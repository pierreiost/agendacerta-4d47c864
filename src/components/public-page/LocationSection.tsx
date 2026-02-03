import { LocationSection as LocationSectionType } from '@/types/public-page';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationSectionProps {
  section: LocationSectionType;
}

// Validar se é uma URL segura do Google Maps (prevenir XSS via iframe)
function isValidGoogleMapsEmbedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    // Aceitar apenas domínios legítimos do Google Maps
    const allowedHosts = [
      'www.google.com',
      'google.com',
      'maps.google.com',
      'www.google.com.br',
      'google.com.br'
    ];
    if (!allowedHosts.includes(parsed.hostname)) {
      return false;
    }
    // Deve ser um path de embed
    if (!parsed.pathname.startsWith('/maps/embed') && !parsed.pathname.startsWith('/maps/d/embed')) {
      return false;
    }
    // Protocolo deve ser HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function LocationSection({ section }: LocationSectionProps) {
  if (!section.enabled) return null;

  const hasAddress = section.address_line1 || section.address_line2;
  const hasMap = section.show_map && isValidGoogleMapsEmbedUrl(section.google_maps_embed_url);

  if (!hasAddress && !hasMap) return null;

  // Extract coordinates from embed URL for "Get directions" link
  const getDirectionsUrl = () => {
    if (section.address_line1) {
      const address = encodeURIComponent(
        `${section.address_line1}${section.address_line2 ? ', ' + section.address_line2 : ''}`
      );
      return `https://www.google.com/maps/search/?api=1&query=${address}`;
    }
    return null;
  };

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Nossa Localização
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Address Card */}
          {hasAddress && (
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="space-y-2 mb-6">
                {section.address_line1 && (
                  <p className="text-xl font-medium">{section.address_line1}</p>
                )}
                {section.address_line2 && (
                  <p className="text-muted-foreground">{section.address_line2}</p>
                )}
              </div>
              {getDirectionsUrl() && (
                <Button asChild variant="outline" className="gap-2">
                  <a href={getDirectionsUrl()!} target="_blank" rel="noopener noreferrer">
                    <Navigation className="h-4 w-4" />
                    Como chegar
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Map - URL já validada por isValidGoogleMapsEmbedUrl */}
          {hasMap && (
            <div className="aspect-video md:aspect-[4/3] rounded-xl overflow-hidden shadow-lg border">
              <iframe
                src={section.google_maps_embed_url!}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mapa da localização"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

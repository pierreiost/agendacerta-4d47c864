import { LocationSection as LocationSectionType } from '@/types/public-page';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationSectionProps {
  section: LocationSectionType;
}

// Extrair URL do src de um iframe HTML, ou retornar o valor como está
function extractEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.includes('<iframe')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : null;
  }
  return trimmed;
}

// Validar se é uma URL segura do Google Maps (prevenir XSS via iframe)
function isValidGoogleMapsEmbedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const allowedHosts = [
      'www.google.com',
      'google.com',
      'maps.google.com',
      'www.google.com.br',
      'google.com.br'
    ];
    if (!allowedHosts.includes(parsed.hostname)) return false;
    if (!parsed.pathname.startsWith('/maps/embed') && !parsed.pathname.startsWith('/maps/d/embed')) return false;
    if (parsed.protocol !== 'https:') return false;
    return true;
  } catch {
    return false;
  }
}

// Construir link do Google Maps a partir do endereço ou da URL de embed
function buildMapsLink(address1: string | null, address2: string | null, embedUrl: string | null): string | null {
  if (address1) {
    const address = encodeURIComponent(
      `${address1}${address2 ? ', ' + address2 : ''}`
    );
    return `https://www.google.com/maps/search/?api=1&query=${address}`;
  }
  // Tentar extrair coordenadas da URL de embed (?pb=... ou !2d...!3d...)
  if (embedUrl) {
    const coordMatch = embedUrl.match(/!2d(-?[\d.]+)!3d(-?[\d.]+)/);
    if (coordMatch) {
      return `https://www.google.com/maps/search/?api=1&query=${coordMatch[2]},${coordMatch[1]}`;
    }
  }
  return null;
}

export function LocationSection({ section }: LocationSectionProps) {
  if (!section.enabled) return null;

  const hasAddress = section.address_line1 || section.address_line2;
  const embedUrl = extractEmbedUrl(section.google_maps_embed_url);
  const hasMap = section.show_map && isValidGoogleMapsEmbedUrl(embedUrl);

  if (!hasAddress && !hasMap) return null;

  const directionsUrl = buildMapsLink(section.address_line1, section.address_line2, embedUrl);

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
              {directionsUrl && (
                <Button asChild variant="outline" className="gap-2">
                  <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                    <Navigation className="h-4 w-4" />
                    Como chegar
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Map with clickable overlay */}
          {hasMap && (
            <div className="relative aspect-video md:aspect-[4/3] rounded-xl overflow-hidden shadow-lg border group">
              <iframe
                src={embedUrl!}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mapa da localização"
                sandbox="allow-scripts allow-same-origin"
              />
              {/* Overlay clicável */}
              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 z-10 flex items-end justify-end p-3 cursor-pointer"
                  aria-label="Abrir no Google Maps"
                >
                  <span className="flex items-center gap-1.5 bg-white/90 text-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir no Maps
                  </span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

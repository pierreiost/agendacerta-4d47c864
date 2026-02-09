import { useState } from 'react';
import { LocationSection as LocationSectionType } from '@/types/public-page';
import { MapPin, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface LocationSectionProps {
  section: LocationSectionType;
}

function extractEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.includes('<iframe')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : null;
  }
  return trimmed;
}

function isValidGoogleMapsEmbedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const allowedHosts = [
      'www.google.com', 'google.com', 'maps.google.com',
      'www.google.com.br', 'google.com.br'
    ];
    if (!allowedHosts.includes(parsed.hostname)) return false;
    if (!parsed.pathname.startsWith('/maps/embed') && !parsed.pathname.startsWith('/maps/d/embed')) return false;
    if (parsed.protocol !== 'https:') return false;
    return true;
  } catch {
    return false;
  }
}

function buildMapsLink(address1: string | null, address2: string | null, embedUrl: string | null): string | null {
  if (address1) {
    const address = encodeURIComponent(`${address1}${address2 ? ', ' + address2 : ''}`);
    return `https://www.google.com/maps/search/?api=1&query=${address}`;
  }
  if (embedUrl) {
    const coordMatch = embedUrl.match(/!2d(-?[\d.]+)!3d(-?[\d.]+)/);
    if (coordMatch) {
      return `https://www.google.com/maps/search/?api=1&query=${coordMatch[2]},${coordMatch[1]}`;
    }
  }
  return null;
}

function MapEmbed({ embedUrl, directionsUrl, onFullscreen }: { embedUrl: string; directionsUrl: string | null; onFullscreen?: () => void }) {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg border group">
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Mapa da localização"
        sandbox="allow-scripts allow-same-origin"
      />
      {/* Fullscreen button */}
      {onFullscreen && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFullscreen(); }}
          className="absolute top-3 right-3 z-20 bg-white/90 hover:bg-white text-foreground p-2 rounded-lg shadow-md transition-opacity opacity-0 group-hover:opacity-100"
          aria-label="Tela cheia"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      )}
      {/* Clickable overlay to open Maps */}
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
  );
}

export function LocationSection({ section }: LocationSectionProps) {
  const [fullscreen, setFullscreen] = useState(false);

  if (!section.enabled) return null;

  const hasAddress = section.address_line1 || section.address_line2;
  const embedUrl = extractEmbedUrl(section.google_maps_embed_url);
  const hasMap = section.show_map && isValidGoogleMapsEmbedUrl(embedUrl);

  if (!hasAddress && !hasMap) return null;

  const directionsUrl = buildMapsLink(section.address_line1, section.address_line2, embedUrl);

  return (
    <>
      <section className="py-16 md:py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Nossa Localização</h2>
            {hasAddress && (
              <div className="text-muted-foreground">
                {section.address_line1 && <p className="text-lg">{section.address_line1}</p>}
                {section.address_line2 && <p className="text-sm">{section.address_line2}</p>}
              </div>
            )}
          </div>

          {hasMap && (
            <MapEmbed
              embedUrl={embedUrl!}
              directionsUrl={directionsUrl}
              onFullscreen={() => setFullscreen(true)}
            />
          )}
        </div>
      </section>

      {/* Fullscreen Dialog */}
      {hasMap && (
        <Dialog open={fullscreen} onOpenChange={setFullscreen}>
          <DialogContent className="max-w-none w-screen h-screen p-0 rounded-none border-none [&>button]:z-30">
            <div className="relative w-full h-full group">
              <iframe
                src={embedUrl!}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mapa da localização - tela cheia"
                sandbox="allow-scripts allow-same-origin"
              />
              <button
                onClick={() => setFullscreen(false)}
                className="absolute top-4 right-14 z-20 bg-white/90 hover:bg-white text-foreground p-2 rounded-lg shadow-md"
                aria-label="Sair da tela cheia"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-white/90 hover:bg-white text-foreground text-sm font-medium px-4 py-2 rounded-full shadow-md transition-opacity"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir no Maps
                </a>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

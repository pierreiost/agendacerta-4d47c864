import { useState } from 'react';
import { GallerySection as GallerySectionType } from '@/types/public-page';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GallerySectionProps {
  section: GallerySectionType;
}

// Validar se URL de imagem é segura
function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('javascript:') || lowerUrl.includes('data:text')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function GallerySection({ section }: GallerySectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!section.enabled || section.images.length === 0) return null;

  const safeImages = section.images.filter(img => isSafeImageUrl(img.url));
  if (safeImages.length === 0) return null;

  const showPrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const showNext = () => {
    if (selectedIndex !== null && selectedIndex < safeImages.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  return (
    <section className="py-8">
      {/* Section Title */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Conheça nosso espaço
        </h2>
        <div className="w-12 h-0.5 bg-primary rounded-full" />
      </div>

      {/* Grid de fotos */}
      <div className="grid grid-cols-4 gap-3">
        {safeImages.slice(0, 8).map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={cn(
              "relative overflow-hidden rounded-xl group cursor-pointer aspect-square",
              "ring-2 ring-transparent hover:ring-primary/60 transition-all duration-200",
              "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            <img
              src={image.url}
              alt={image.alt || `Foto ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />

            {/* Mostrar contador se houver mais imagens */}
            {index === 7 && safeImages.length > 8 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                <span className="text-white text-lg font-bold">+{safeImages.length - 8}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-5xl p-0 bg-black/95 border-0">
          <div className="relative">
            {selectedIndex !== null && (
              <img
                src={safeImages[selectedIndex].url}
                alt={safeImages[selectedIndex].alt || ''}
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            )}

            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 text-white hover:bg-white/20 h-10 w-10"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Navigation */}
            {selectedIndex !== null && selectedIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={showPrev}
              >
                <ChevronLeft className="h-7 w-7" />
              </Button>
            )}
            {selectedIndex !== null && selectedIndex < safeImages.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={showNext}
              >
                <ChevronRight className="h-7 w-7" />
              </Button>
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/50 px-4 py-1.5 rounded-full">
              {selectedIndex !== null && `${selectedIndex + 1} / ${safeImages.length}`}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

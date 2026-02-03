import { useState } from 'react';
import { GallerySection as GallerySectionType } from '@/types/public-page';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Camera } from 'lucide-react';
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

  // Filtrar apenas imagens com URLs seguras
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
    <section className="py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Conheça nosso espaço</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Veja as fotos do nosso ambiente
        </p>
      </div>

      {/* Grid de imagens - layout masonry-like */}
      <div className={cn(
        "grid gap-3",
        safeImages.length === 1 && "grid-cols-1",
        safeImages.length === 2 && "grid-cols-2",
        safeImages.length >= 3 && "grid-cols-2 md:grid-cols-3"
      )}>
        {safeImages.slice(0, 6).map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={cn(
              "relative overflow-hidden rounded-xl group cursor-pointer",
              "ring-2 ring-transparent hover:ring-primary/50 transition-all duration-300",
              // Primeira imagem maior quando há mais de 2
              index === 0 && safeImages.length > 2 && "col-span-2 row-span-2 aspect-[4/3]",
              // Outras imagens são quadradas
              !(index === 0 && safeImages.length > 2) && "aspect-square"
            )}
          >
            <img
              src={image.url}
              alt={image.alt || `Foto ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Mostrar contador se houver mais imagens */}
            {index === 5 && safeImages.length > 6 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-xl font-semibold">+{safeImages.length - 6}</span>
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
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}

            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Navigation */}
            {selectedIndex !== null && selectedIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={showPrev}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}
            {selectedIndex !== null && selectedIndex < safeImages.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={showNext}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-3 py-1 rounded-full">
              {selectedIndex !== null && `${selectedIndex + 1} / ${safeImages.length}`}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

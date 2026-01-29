import { useState } from 'react';
import { GallerySection as GallerySectionType } from '@/types/public-page';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GallerySectionProps {
  section: GallerySectionType;
}

export function GallerySection({ section }: GallerySectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!section.enabled || section.images.length === 0) return null;

  const showPrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const showNext = () => {
    if (selectedIndex !== null && selectedIndex < section.images.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  return (
    <section className="py-16 md:py-24 px-4 bg-muted/30">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
          Conheça nosso espaço
        </h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          Veja as fotos do nosso ambiente e infraestrutura
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {section.images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl group cursor-pointer",
                "ring-2 ring-transparent hover:ring-primary transition-all duration-300",
                "transform hover:scale-[1.02]"
              )}
            >
              <img
                src={image.url}
                alt={image.alt || `Foto ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-5xl p-0 bg-black/95 border-0">
          <div className="relative">
            {selectedIndex !== null && (
              <img
                src={section.images[selectedIndex].url}
                alt={section.images[selectedIndex].alt || ''}
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
            {selectedIndex !== null && selectedIndex < section.images.length - 1 && (
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
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
              {selectedIndex !== null && `${selectedIndex + 1} / ${section.images.length}`}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

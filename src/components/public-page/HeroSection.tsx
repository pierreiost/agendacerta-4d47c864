import { Button } from '@/components/ui/button';
import { HeroSection as HeroSectionType } from '@/types/public-page';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  section: HeroSectionType;
  venueName: string;
  logoUrl: string | null;
  onCtaClick: () => void;
}

export function HeroSection({ section, venueName, logoUrl, onCtaClick }: HeroSectionProps) {
  if (!section.enabled) return null;

  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      {section.background_image_url ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${section.background_image_url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-primary/80" />
      )}

      {/* Content */}
      <div className="relative px-4 py-20 sm:py-28 md:py-32 lg:py-40">
        <div className="mx-auto max-w-4xl text-center">
          {/* Logo */}
          {logoUrl && (
            <div className="mb-6 flex justify-center animate-fade-in">
              <img
                src={logoUrl}
                alt={venueName}
                className="h-16 sm:h-20 md:h-24 w-auto object-contain drop-shadow-lg"
              />
            </div>
          )}

          {/* Title */}
          <h1
            className={cn(
              "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 animate-fade-in",
              section.background_image_url ? "text-white" : "text-primary-foreground"
            )}
            style={{ animationDelay: '100ms' }}
          >
            {section.title || venueName}
          </h1>

          {/* Subtitle */}
          {section.subtitle && (
            <p
              className={cn(
                "text-lg sm:text-xl md:text-2xl mb-8 animate-fade-in",
                section.background_image_url ? "text-white/90" : "text-primary-foreground/90"
              )}
              style={{ animationDelay: '200ms' }}
            >
              {section.subtitle}
            </p>
          )}

          {/* CTA */}
          {section.show_cta && (
            <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
              <Button
                size="lg"
                onClick={onCtaClick}
                className={cn(
                  "text-lg px-8 py-6 rounded-full shadow-lg transition-all duration-300",
                  "hover:scale-105 hover:shadow-xl",
                  section.background_image_url
                    ? "bg-white text-primary hover:bg-white/90"
                    : "bg-white text-primary hover:bg-white/90"
                )}
              >
                {section.cta_text}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Decorative wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0 120L60 105C120 90 240 60 360 55C480 50 600 70 720 80C840 90 960 90 1080 85C1200 80 1320 70 1380 65L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            className="fill-background"
          />
        </svg>
      </div>
    </section>
  );
}

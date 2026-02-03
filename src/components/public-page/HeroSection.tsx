import { Button } from '@/components/ui/button';
import { HeroSection as HeroSectionType, CoverStyle } from '@/types/public-page';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  section: HeroSectionType;
  venueName: string;
  logoUrl: string | null;
  onCtaClick: () => void;
}

// Validar se URL de imagem é segura (prevenir CSS injection)
function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    // Aceitar apenas http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    // Bloquear URLs suspeitas
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('javascript:') || lowerUrl.includes('data:')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function WaveDecoration() {
  return (
    <div className="absolute bottom-0 left-0 right-0">
      <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        <path
          d="M0 120L60 105C120 90 240 60 360 55C480 50 600 70 720 80C840 90 960 90 1080 85C1200 80 1320 70 1380 65L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
          className="fill-background"
        />
      </svg>
    </div>
  );
}

function SquaredDecoration() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-8 bg-background" />
  );
}

export function HeroSection({ section, venueName, logoUrl, onCtaClick }: HeroSectionProps) {
  if (!section.enabled) return null;

  const coverStyle: CoverStyle = section.cover_style || 'wave';
  const isFullHero = coverStyle === 'hero';
  const safeBackgroundUrl = isSafeImageUrl(section.background_image_url) ? section.background_image_url : null;
  const safeLogoUrl = isSafeImageUrl(logoUrl) ? logoUrl : null;

  return (
    <section className={cn(
      "relative overflow-hidden",
      isFullHero && "min-h-[70vh] flex items-center"
    )}>
      {/* Background - URL validada */}
      {safeBackgroundUrl ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${safeBackgroundUrl})` }}
          />
          <div className={cn(
            "absolute inset-0",
            isFullHero 
              ? "bg-gradient-to-r from-black/70 via-black/50 to-black/30"
              : "bg-gradient-to-b from-black/60 via-black/50 to-black/70"
          )} />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-primary/80" />
      )}

      {/* Content */}
      <div className={cn(
        "relative w-full",
        isFullHero 
          ? "px-6 py-24 md:py-32 lg:py-40" 
          : "px-4 py-16 sm:py-20 md:py-28 lg:py-32"
      )}>
        <div className={cn(
          "mx-auto max-w-5xl",
          isFullHero ? "text-left" : "text-center"
        )}>
          {/* Logo - URL validada */}
          {safeLogoUrl && (
            <div className={cn(
              "mb-4 animate-fade-in",
              isFullHero ? "flex justify-start" : "flex justify-center"
            )}>
              <img
                src={safeLogoUrl}
                alt={venueName}
                className="h-12 sm:h-14 md:h-16 w-auto object-contain drop-shadow-lg"
              />
            </div>
          )}

          {/* Title */}
          <h1
            className={cn(
              "font-bold tracking-tight animate-fade-in",
              isFullHero 
                ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-4"
                : "text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3",
              safeBackgroundUrl ? "text-white" : "text-primary-foreground"
            )}
            style={{ animationDelay: '100ms' }}
          >
            {section.title || venueName}
          </h1>

          {/* Subtitle */}
          {section.subtitle && (
            <p
              className={cn(
                "animate-fade-in",
                isFullHero
                  ? "text-lg sm:text-xl md:text-2xl mb-8 max-w-2xl"
                  : "text-base sm:text-lg md:text-xl mb-6",
                safeBackgroundUrl ? "text-white/90" : "text-primary-foreground/90"
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
                  "px-6 py-5 rounded-full shadow-lg transition-all duration-300",
                  "hover:scale-105 hover:shadow-xl",
                  safeBackgroundUrl
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

      {/* Cover decoration based on style */}
      {coverStyle === 'wave' && <WaveDecoration />}
      {coverStyle === 'squared' && <SquaredDecoration />}
      {/* 'hero' style has no decoration - full edge-to-edge */}
    </section>
  );
}

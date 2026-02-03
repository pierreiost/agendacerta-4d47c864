import { HeroSection as HeroSectionType, CoverStyle } from '@/types/public-page';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  section: HeroSectionType;
  venueName: string;
  logoUrl: string | null;
  onCtaClick?: () => void;
}

// Validar se URL de imagem é segura (prevenir CSS injection)
function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
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
          className="fill-slate-50"
        />
      </svg>
    </div>
  );
}

function SquaredDecoration() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-50" />
  );
}

export function HeroSection({ section, venueName }: HeroSectionProps) {
  if (!section.enabled) return null;

  const coverStyle: CoverStyle = section.cover_style || 'wave';
  const safeBackgroundUrl = isSafeImageUrl(section.background_image_url) ? section.background_image_url : null;

  return (
    <section className="relative overflow-hidden min-h-[45vh] md:min-h-[50vh] flex items-center">
      {/* Background */}
      {safeBackgroundUrl ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{ backgroundImage: `url(${safeBackgroundUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/40" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
      )}

      {/* Content */}
      <div className="relative w-full px-4 sm:px-6 pt-24 pb-16 md:pt-28 md:pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl">
            {/* Title */}
            <h1
              className={cn(
                "font-bold tracking-tight",
                "text-3xl sm:text-4xl md:text-5xl lg:text-6xl",
                "mb-4 md:mb-6",
                "animate-fade-in",
                safeBackgroundUrl ? "text-white" : "text-primary-foreground"
              )}
            >
              {section.title || venueName}
            </h1>

            {/* Subtitle */}
            {section.subtitle && (
              <p
                className={cn(
                  "text-lg sm:text-xl md:text-2xl",
                  "leading-relaxed",
                  "animate-fade-in",
                  safeBackgroundUrl ? "text-white/90" : "text-primary-foreground/90"
                )}
                style={{ animationDelay: '150ms' }}
              >
                {section.subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cover decoration */}
      {coverStyle === 'wave' && <WaveDecoration />}
      {coverStyle === 'squared' && <SquaredDecoration />}
    </section>
  );
}

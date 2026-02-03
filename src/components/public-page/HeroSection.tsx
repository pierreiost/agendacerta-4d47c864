import { HeroSection as HeroSectionType } from '@/types/public-page';

interface HeroSectionProps {
  section: HeroSectionType;
  venueName: string;
  logoUrl: string | null;
}

export function HeroSection({ section, venueName }: HeroSectionProps) {
  if (!section.enabled) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/85">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Content */}
      <div className="relative w-full px-4 sm:px-6 pt-28 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl">
            {/* Subtitle/Tagline */}
            {section.subtitle && (
              <p className="text-primary-foreground/80 text-base sm:text-lg mb-3 animate-fade-in">
                {section.subtitle}
              </p>
            )}

            {/* Main Title */}
            <h1 className="font-bold tracking-tight text-primary-foreground text-3xl sm:text-4xl md:text-5xl animate-fade-in">
              {section.title || `Bem-vindo à ${venueName}`}
            </h1>
          </div>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0 80L48 74.7C96 69 192 59 288 53.3C384 48 480 48 576 53.3C672 59 768 69 864 69.3C960 69 1056 59 1152 53.3C1248 48 1344 48 1392 48L1440 48V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z"
            className="fill-slate-50"
          />
        </svg>
      </div>
    </section>
  );
}

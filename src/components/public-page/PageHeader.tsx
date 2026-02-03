import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  venueName: string;
  logoUrl: string | null;
  whatsappPhone: string | null | undefined;
}

function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return true;
  } catch {
    return false;
  }
}

export function PageHeader({ venueName, logoUrl, whatsappPhone }: PageHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const safeLogoUrl = isSafeImageUrl(logoUrl) ? logoUrl : null;
  const cleanPhone = whatsappPhone?.replace(/\D/g, '');
  const hasValidPhone = cleanPhone && cleanPhone.length >= 8;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/98 backdrop-blur-md shadow-md"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-18 md:h-22 py-3">
          {/* Logo e Nome - Esquerda */}
          <div className="flex items-center gap-3 sm:gap-4">
            {safeLogoUrl && (
              <img
                src={safeLogoUrl}
                alt={venueName}
                className={cn(
                  "w-auto object-contain transition-all duration-300",
                  isScrolled ? "h-10 md:h-12" : "h-12 md:h-14"
                )}
              />
            )}
            <span
              className={cn(
                "font-bold transition-all duration-300",
                isScrolled
                  ? "text-foreground text-lg md:text-xl"
                  : "text-white text-xl md:text-2xl drop-shadow-lg"
              )}
            >
              {venueName}
            </span>
          </div>

          {/* Botão Contato - Direita */}
          {hasValidPhone && (
            <Button
              asChild
              className={cn(
                "gap-2 rounded-xl font-semibold transition-all duration-300",
                "hover:scale-105 active:scale-95",
                isScrolled
                  ? "bg-primary hover:bg-primary/90 text-white shadow-md"
                  : "bg-white hover:bg-white/95 text-primary shadow-lg"
              )}
            >
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

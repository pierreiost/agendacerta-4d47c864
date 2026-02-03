import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  venueName: string;
  logoUrl: string | null;
  whatsappPhone: string | null | undefined;
}

// Validar URL segura
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
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo e Nome - Esquerda */}
          <div className="flex items-center gap-3">
            {safeLogoUrl && (
              <img
                src={safeLogoUrl}
                alt={venueName}
                className="h-9 md:h-11 w-auto object-contain"
              />
            )}
            <span
              className={cn(
                "font-semibold text-lg md:text-xl transition-colors duration-300",
                isScrolled ? "text-foreground" : "text-white drop-shadow-md"
              )}
            >
              {venueName}
            </span>
          </div>

          {/* Botão Contato - Direita */}
          {hasValidPhone && (
            <Button
              asChild
              size="sm"
              className={cn(
                "gap-2 rounded-full px-4 transition-all duration-300",
                isScrolled
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30"
              )}
            >
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Fale Conosco</span>
              </a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

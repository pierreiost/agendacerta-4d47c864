import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

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
  const safeLogoUrl = isSafeImageUrl(logoUrl) ? logoUrl : null;
  const cleanPhone = whatsappPhone?.replace(/\D/g, '');
  const hasValidPhone = cleanPhone && cleanPhone.length >= 8;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Mini faixa com cor primária */}
      <div className="bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 md:h-18 py-2">
            {/* Logo e Nome - Esquerda */}
            <div className="flex items-center gap-3 sm:gap-4">
              {safeLogoUrl && (
                <img
                  src={safeLogoUrl}
                  alt={venueName}
                  className="h-10 md:h-12 w-auto object-contain"
                />
              )}
              <span className="font-bold text-primary-foreground text-lg md:text-xl">
                {venueName}
              </span>
            </div>

            {/* Botão Contato - Direita */}
            {hasValidPhone && (
              <Button
                asChild
                className="gap-2 rounded-xl font-semibold bg-white hover:bg-white/90 text-primary shadow-md hover:scale-105 active:scale-95 transition-all duration-300"
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
      </div>
    </header>
  );
}

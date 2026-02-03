import { MessageCircle, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SocialFloatingButtonsProps {
  whatsappPhone: string | null | undefined;
  instagramHandle: string | null | undefined;
  className?: string;
}

export function SocialFloatingButtons({
  whatsappPhone,
  instagramHandle,
  className,
}: SocialFloatingButtonsProps) {
  // Processar telefone do WhatsApp
  const cleanPhone = whatsappPhone?.replace(/\D/g, '') || '';
  const hasWhatsapp = cleanPhone.length >= 8;

  // Processar @ do Instagram (remover @ se presente)
  const cleanInstagram = instagramHandle?.replace(/^@/, '').trim() || '';
  const hasInstagram = cleanInstagram.length > 0;

  // Se não tem nenhum, não renderiza nada
  if (!hasWhatsapp && !hasInstagram) return null;

  const whatsappUrl = `https://wa.me/${cleanPhone}`;
  const instagramUrl = `https://instagram.com/${cleanInstagram}`;

  return (
    <div
      className={cn(
        "fixed bottom-24 lg:bottom-6 right-5 z-50 flex flex-col gap-3",
        className
      )}
    >
      {/* Instagram Button - aparece acima do WhatsApp */}
      {hasInstagram && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center justify-center",
            "w-14 h-14 rounded-full",
            "bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737]",
            "text-white",
            "shadow-lg shadow-[#E1306C]/30",
            "transition-all duration-300",
            "hover:scale-110 hover:shadow-xl hover:shadow-[#E1306C]/40"
          )}
          aria-label="Seguir no Instagram"
        >
          <Instagram className="h-7 w-7" />
        </a>
      )}

      {/* WhatsApp Button */}
      {hasWhatsapp && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "relative flex items-center justify-center",
            "w-14 h-14 rounded-full",
            "bg-[#25D366] hover:bg-[#128C7E]",
            "text-white",
            "shadow-lg shadow-[#25D366]/30",
            "transition-all duration-300",
            "hover:scale-110 hover:shadow-xl hover:shadow-[#25D366]/40"
          )}
          aria-label="Contato via WhatsApp"
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
          <MessageCircle className="h-7 w-7 relative z-10" />
        </a>
      )}
    </div>
  );
}

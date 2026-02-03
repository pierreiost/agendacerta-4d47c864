import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppButtonProps {
  phone: string | null | undefined;
  className?: string;
}

export function WhatsAppButton({ phone, className }: WhatsAppButtonProps) {
  if (!phone) return null;

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 8) return null;

  const whatsappUrl = `https://wa.me/${cleanPhone}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        // Posição - ajustada para não conflitar com botão mobile
        "fixed bottom-24 lg:bottom-6 right-5 z-50",
        // Tamanho e forma
        "flex items-center justify-center",
        "w-14 h-14 rounded-full",
        // Cores
        "bg-[#25D366] hover:bg-[#128C7E]",
        "text-white",
        // Sombra com cor
        "shadow-lg shadow-[#25D366]/30",
        // Transições
        "transition-all duration-300",
        "hover:scale-110 hover:shadow-xl hover:shadow-[#25D366]/40",
        className
      )}
      aria-label="Contato via WhatsApp"
    >
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />

      {/* Icon */}
      <MessageCircle className="h-7 w-7 relative z-10" />
    </a>
  );
}

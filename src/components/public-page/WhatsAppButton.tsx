import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppButtonProps {
  phone: string | null | undefined;
  className?: string;
}

export function WhatsAppButton({ phone, className }: WhatsAppButtonProps) {
  if (!phone) return null;

  // Limpar o número - manter apenas dígitos
  const cleanPhone = phone.replace(/\D/g, '');

  // Validar se tem pelo menos 8 dígitos
  if (cleanPhone.length < 8) return null;

  const whatsappUrl = `https://wa.me/${cleanPhone}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "flex items-center justify-center",
        "w-14 h-14 rounded-full",
        "bg-[#25D366] hover:bg-[#128C7E]",
        "text-white shadow-lg",
        "transition-all duration-300",
        "hover:scale-110 hover:shadow-xl",
        "animate-in fade-in zoom-in-50 duration-500",
        className
      )}
      aria-label="Contato via WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}

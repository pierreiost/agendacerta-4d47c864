import { Crown, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PremiumFeatureOverlayProps {
  featureName?: string;
  supportWhatsapp?: string;
}

export function PremiumFeatureOverlay({ 
  featureName = 'Funcionalidade Premium',
  supportWhatsapp = '5551999999999' 
}: PremiumFeatureOverlayProps) {
  const handleRequestUpgrade = () => {
    const message = encodeURIComponent(
      `Olá! Tenho interesse em fazer upgrade para o plano Max do Agenda Certa para ter acesso a ${featureName}.`
    );
    window.open(`https://wa.me/${supportWhatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
      <div className="text-center p-6 max-w-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Crown className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-2">{featureName}</h3>
        <p className="text-muted-foreground mb-6">
          Este recurso está disponível apenas para o plano <span className="font-semibold text-primary">Max</span>. 
          Faça upgrade agora e desbloqueie todas as funcionalidades premium.
        </p>
        <Button onClick={handleRequestUpgrade} className="gap-2">
          <MessageCircle className="h-4 w-4" />
          Solicitar Upgrade
        </Button>
      </div>
    </div>
  );
}

import { AlertTriangle, Clock, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface SubscriptionBannerProps {
  daysRemaining: number;
  status: 'trialing' | 'active' | 'overdue' | 'suspended';
}

export function SubscriptionBanner({ daysRemaining, status }: SubscriptionBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Don't show banner if more than 3 days remaining or if active with plenty of time
  if (dismissed || daysRemaining > 3 || (status === 'active' && daysRemaining > 5)) {
    return null;
  }

  const isUrgent = daysRemaining <= 1;
  const isWarning = daysRemaining <= 3 && daysRemaining > 1;

  if (!isUrgent && !isWarning) {
    return null;
  }

  const getMessage = () => {
    if (status === 'trialing') {
      if (isUrgent) {
        return daysRemaining === 1 
          ? 'ATENÇÃO: Seu período de teste expira amanhã. Regularize agora!'
          : 'ATENÇÃO: Seu período de teste expira hoje. Regularize agora!';
      }
      return `Seu período de teste termina em ${daysRemaining} dias.`;
    }
    
    if (isUrgent) {
      return daysRemaining === 1 
        ? 'ATENÇÃO: Sua assinatura expira amanhã. Regularize agora!'
        : 'ATENÇÃO: Sua assinatura expira hoje. Regularize agora!';
    }
    return `Sua assinatura expira em ${daysRemaining} dias.`;
  };

  return (
    <div
      className={`
        relative flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium
        ${isUrgent 
          ? 'bg-destructive text-destructive-foreground animate-pulse' 
          : 'bg-yellow-500/90 text-yellow-950'
        }
      `}
    >
      {isUrgent ? (
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      ) : (
        <Clock className="h-4 w-4 flex-shrink-0" />
      )}
      <span className="text-center">{getMessage()}</span>
      {!isUrgent && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 h-6 w-6 p-0 hover:bg-yellow-600/20"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

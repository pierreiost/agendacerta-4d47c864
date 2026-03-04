import { Clock, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
          ? 'Período de teste expira amanhã'
          : 'Período de teste expira hoje';
      }
      return `Período de teste termina em ${daysRemaining} dias`;
    }
    
    if (isUrgent) {
      return daysRemaining === 1 
        ? 'Assinatura expira amanhã'
        : 'Assinatura expira hoje';
    }
    return `Assinatura expira em ${daysRemaining} dias`;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg mx-3 mt-2",
        isUrgent 
          ? "bg-destructive/10 text-destructive border border-destructive/20" 
          : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20"
      )}
    >
      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="flex-1">{getMessage()}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-5 w-5 p-0 hover:bg-transparent opacity-60 hover:opacity-100"
        onClick={() => setDismissed(true)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';

export type VenueStatus = 'trialing' | 'active' | 'overdue' | 'suspended';

interface Venue {
  status?: VenueStatus | null;
  trial_ends_at?: string | null;
  subscription_ends_at?: string | null;
  plan_type?: string | null;
}

interface SubscriptionStatus {
  isBlocked: boolean;
  daysRemaining: number;
  status: VenueStatus;
  showBanner: boolean;
  isPlanMax: boolean;
}

export function useSubscriptionStatus(venue: Venue | null): SubscriptionStatus {
  return useMemo(() => {
    if (!venue) {
      return {
        isBlocked: false,
        daysRemaining: 999,
        status: 'trialing',
        showBanner: false,
        isPlanMax: false,
      };
    }

    const now = new Date();
    const status = (venue.status as VenueStatus) || 'trialing';
    const isPlanMax = venue.plan_type === 'max';

    // Calculate days remaining based on status
    let expirationDate: Date | null = null;
    
    if (status === 'trialing' && venue.trial_ends_at) {
      expirationDate = new Date(venue.trial_ends_at);
    } else if ((status === 'active' || status === 'overdue') && venue.subscription_ends_at) {
      expirationDate = new Date(venue.subscription_ends_at);
    }

    const daysRemaining = expirationDate 
      ? differenceInDays(expirationDate, now)
      : 999;

    // Determine if access is blocked
    let isBlocked = false;
    
    if (status === 'suspended') {
      isBlocked = true;
    } else if (status === 'trialing') {
      isBlocked = expirationDate ? expirationDate < now : false;
    } else if (status === 'overdue') {
      // Give some grace period for overdue
      isBlocked = daysRemaining < -3;
    }
    // 'active' is never blocked

    // Show banner if expiring soon
    const showBanner = daysRemaining <= 3 && daysRemaining >= 0 && !isBlocked;

    return {
      isBlocked,
      daysRemaining,
      status,
      showBanner,
      isPlanMax,
    };
  }, [venue]);
}

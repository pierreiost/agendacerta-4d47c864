import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useDynamicTheme } from '@/hooks/useDynamicTheme';
import { useVenue } from '@/contexts/VenueContext';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { SubscriptionBlockScreen, SubscriptionBanner } from '@/components/subscription';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  // Aplica a cor primária dinâmica baseada nas configurações do venue
  useDynamicTheme();
  
  const { currentVenue } = useVenue();
  const { isBlocked, daysRemaining, status, showBanner } = useSubscriptionStatus(currentVenue);

  // Support WhatsApp - pode ser configurado via env ou hardcoded
  const supportWhatsapp = '5551999999999';

  return (
    <SidebarProvider>
      {/* Subscription expiration banner */}
      {showBanner && (
        <SubscriptionBanner daysRemaining={daysRemaining} status={status} />
      )}
      
        <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col w-full overflow-hidden">
          <header className="sticky top-0 z-10 flex h-10 md:h-11 items-center gap-2 md:gap-3 border-b bg-background/95 px-2 md:px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
            <SidebarTrigger />
            {title && (
              <h1 className="text-sm md:text-base font-semibold truncate">{title}</h1>
            )}
            <div className="ml-auto">
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 p-2 md:p-4 overflow-y-auto overflow-x-hidden scrollbar-hide">
            {children}
          </main>
        </SidebarInset>
      </div>
      
      {/* Fullscreen block when subscription expired */}
      {isBlocked && <SubscriptionBlockScreen supportWhatsapp={supportWhatsapp} />}
    </SidebarProvider>
  );
}

import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col w-full overflow-x-hidden">
          <header className="sticky top-0 z-10 flex h-12 md:h-14 items-center gap-2 md:gap-4 border-b bg-background/95 px-3 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="-ml-1 md:-ml-2" />
            {title && (
              <h1 className="text-base md:text-lg font-semibold truncate">{title}</h1>
            )}
          </header>
          <main className="flex-1 p-3 md:p-6 overflow-x-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

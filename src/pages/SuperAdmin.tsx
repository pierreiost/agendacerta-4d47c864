import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Loader2, LayoutDashboard, Kanban, Users } from 'lucide-react';
import { SuperAdminDashboard } from '@/components/superadmin/SuperAdminDashboard';
import { CrmBoard } from '@/components/superadmin/CrmBoard';
import { VenueClientsTab } from '@/components/superadmin/VenueClientsTab';
import { cn } from '@/lib/utils';

type SuperAdminTab = 'dashboard' | 'crm' | 'clientes';

const tabs: { id: SuperAdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'crm', label: 'CRM', icon: Kanban },
  { id: 'clientes', label: 'Clientes', icon: Users },
];

export default function SuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, checkingRole } = useSuperAdmin();
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('dashboard');

  if (authLoading || checkingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 min-h-screen">
          {/* Glass Header */}
          <div className="sticky top-0 z-20 backdrop-blur-xl bg-slate-950/60 border-b border-white/10">
            <div className="container flex items-center justify-between py-4">
              <div>
                <h1 className="text-2xl font-bold text-white/95 tracking-tight">Centro de Comando</h1>
                <p className="text-sm text-white/40">Gestão global da plataforma AgendaCerta</p>
              </div>
              {/* Tab buttons */}
              <div className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        activeTab === tab.id
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                          : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="container py-8">
            {activeTab === 'dashboard' && <SuperAdminDashboard />}
            {activeTab === 'crm' && <CrmBoard />}
            {activeTab === 'clientes' && <VenueClientsTab />}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

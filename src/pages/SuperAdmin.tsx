import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Loader2 } from 'lucide-react';
import { CrmBoard } from '@/components/superadmin/CrmBoard';
import { VenueClientsTab } from '@/components/superadmin/VenueClientsTab';
import { SuperAdminDashboard } from '@/components/superadmin/SuperAdminDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Users, Kanban } from 'lucide-react';

export default function SuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, checkingRole } = useSuperAdmin();
  const [activeTab, setActiveTab] = useState('crm');

  if (authLoading || checkingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    crm: { title: 'Centro de Comando', subtitle: 'Pipeline de vendas da plataforma AgendaCerta' },
    clients: { title: 'Gestão de Clientes', subtitle: 'Empresas cadastradas e assinaturas' },
    dashboard: { title: 'Dashboard SaaS', subtitle: 'Métricas globais da plataforma' },
  };

  const current = tabTitles[activeTab] || tabTitles.crm;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 min-h-screen">
          {/* Glass Header */}
          <div className="sticky top-0 z-20 backdrop-blur-xl bg-slate-950/60 border-b border-white/10">
            <div className="px-4 lg:px-8 flex items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-white/95 tracking-tight">{current.title}</h1>
                <p className="text-sm text-white/40">{current.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 lg:px-8 py-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-white/10 border border-white/10 mb-6">
                <TabsTrigger value="crm" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white gap-1.5">
                  <Kanban className="h-4 w-4" /> CRM
                </TabsTrigger>
                <TabsTrigger value="clients" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white gap-1.5">
                  <Users className="h-4 w-4" /> Clientes
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white gap-1.5">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </TabsTrigger>
              </TabsList>

              <TabsContent value="crm">
                <CrmBoard />
              </TabsContent>
              <TabsContent value="clients">
                <VenueClientsTab />
              </TabsContent>
              <TabsContent value="dashboard">
                <SuperAdminDashboard />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

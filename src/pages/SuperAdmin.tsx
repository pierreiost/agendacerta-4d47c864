import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Loader2 } from 'lucide-react';
import { CrmBoard } from '@/components/superadmin/CrmBoard';

export default function SuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, checkingRole } = useSuperAdmin();

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
            <div className="px-4 lg:px-8 flex items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-white/95 tracking-tight">Centro de Comando</h1>
                <p className="text-sm text-white/40">Pipeline de vendas da plataforma AgendaCerta</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 lg:px-8 py-6">
            <CrmBoard />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

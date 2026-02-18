import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { VenueProvider, useVenue } from "./contexts/VenueContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigationPersist, NavigationPersistContext } from "@/hooks/useNavigationPersist";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Clientes from "./pages/Clientes";
import Espacos from "./pages/Espacos";
import Produtos from "./pages/Produtos";
import Servicos from "./pages/Servicos";
import Relatorios from "./pages/Relatorios";
import Financeiro from "./pages/Financeiro";
import OrdensServico from "./pages/OrdensServico";
import OrdemServicoForm from "./pages/OrdemServicoForm";
import Ajuda from "./pages/Ajuda";
import Configuracoes from "./pages/Configuracoes";

import PublicPageConfig from "./pages/PublicPageConfig";
import SuperAdmin from "./pages/SuperAdmin";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PublicPageVenue from "./pages/public/PublicPageVenue";
import Marketplace from "./pages/Marketplace";
import MinhasReservas from "./pages/MinhasReservas";
import { Loader2 } from "lucide-react";
import { AppErrorBoundary } from "@/components/shared/AppErrorBoundary";

const queryClient = new QueryClient();

function useSuperAdminCheck() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-superadmin-check', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.rpc('is_superadmin', { _user_id: user.id });
      if (error) return false;
      return data;
    },
    enabled: !!user,
  });
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { venues, loading: venueLoading } = useVenue();
  const { data: isSuperAdmin, isLoading: checkingSuperAdmin } = useSuperAdminCheck();

  if (authLoading || venueLoading || checkingSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Superadmins have full access to everything
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (venues.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { data: isSuperAdmin, isLoading: checkingSuperAdmin } = useSuperAdminCheck();

  if (authLoading || checkingSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutesWithPersist() {
  const { user, loading: authLoading } = useAuth();
  const { venues, loading: venueLoading } = useVenue();
  const navigationPersist = useNavigationPersist();

  if (authLoading || venueLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <NavigationPersistContext.Provider value={navigationPersist}>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/onboarding"
          element={
            !user ? (
              <Navigate to="/auth" replace />
            ) : venues.length > 0 ? (
              <Navigate to="/" replace />
            ) : (
              <Onboarding />
            )
          }
        />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
        <Route path="/espacos" element={<ProtectedRoute><Espacos /></ProtectedRoute>} />
        <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
        <Route path="/servicos" element={<ProtectedRoute><Servicos /></ProtectedRoute>} />
        <Route path="/ordens-servico" element={<ProtectedRoute><OrdensServico /></ProtectedRoute>} />
        <Route path="/ordens-servico/nova" element={<ProtectedRoute><OrdemServicoForm /></ProtectedRoute>} />
        <Route path="/ordens-servico/:id" element={<ProtectedRoute><OrdemServicoForm /></ProtectedRoute>} />
        <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
        <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
        
        <Route path="/pagina-publica" element={<ProtectedRoute><PublicPageConfig /></ProtectedRoute>} />
        <Route path="/ajuda" element={<ProtectedRoute><Ajuda /></ProtectedRoute>} />
        <Route path="/superadmin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </NavigationPersistContext.Provider>
  );
}

function AppWithProviders() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public marketing routes - outside of auth/venue providers */}
        <Route path="/inicio" element={<LandingPage />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/v/:slug" element={<PublicPageVenue />} />
        <Route path="/minhas-reservas" element={<MinhasReservas />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        {/* All other routes go through the providers */}
        <Route path="/*" element={<AppRoutesWithPersist />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <VenueProvider>
          <Toaster />
          <Sonner />
          <AppErrorBoundary>
            <AppWithProviders />
          </AppErrorBoundary>
        </VenueProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

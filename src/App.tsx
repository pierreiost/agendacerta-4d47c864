import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { VenueProvider, useVenue } from "./contexts/VenueContext";
import { supabase } from "@/integrations/supabase/client";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Espacos from "./pages/Espacos";
import Produtos from "./pages/Produtos";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import SuperAdmin from "./pages/SuperAdmin";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

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

function ProtectedRoute({ children, allowSuperAdmin = false }: { children: React.ReactNode; allowSuperAdmin?: boolean }) {
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

  // Superadmins without venues can access superadmin page and allowed routes
  if (isSuperAdmin && venues.length === 0) {
    if (allowSuperAdmin) {
      return <>{children}</>;
    }
    return <Navigate to="/superadmin" replace />;
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

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { venues, loading: venueLoading } = useVenue();

  if (authLoading || venueLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
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
      <Route path="/espacos" element={<ProtectedRoute><Espacos /></ProtectedRoute>} />
      <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute allowSuperAdmin><Configuracoes /></ProtectedRoute>} />
      <Route path="/superadmin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppWithProviders() {
  return (
    <BrowserRouter>
      <AppRoutes />
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
          <AppWithProviders />
        </VenueProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

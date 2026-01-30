import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVenue } from "@/contexts/VenueContext";
import { Calendar, MapPin, TrendingUp, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardBookings, DashboardAppointments, DashboardServiceOrders } from "@/components/dashboard";

type DashboardMode = 'bookings' | 'appointments' | 'service_orders';

export default function Dashboard() {
  const { currentVenue, loading } = useVenue();
  const navigate = useNavigate();

  // Determina o modo do dashboard baseado na configuração da venue
  const dashboardMode: DashboardMode = (currentVenue as { dashboard_mode?: DashboardMode })?.dashboard_mode || 'bookings';

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AppLayout>
    );
  }

  // Renderiza o dashboard correto baseado no modo
  const renderDashboardContent = () => {
    switch (dashboardMode) {
      case 'appointments':
        return <DashboardAppointments />;
      case 'service_orders':
        return <DashboardServiceOrders />;
      case 'bookings':
      default:
        return <DashboardBookings />;
    }
  };

  // Título dinâmico baseado no modo
  const getTitle = () => {
    switch (dashboardMode) {
      case 'appointments':
        return { title: 'Dashboard', subtitle: 'Visão geral dos atendimentos' };
      case 'service_orders':
        return { title: 'Dashboard', subtitle: 'Visão geral das ordens de serviço' };
      case 'bookings':
      default:
        return { title: 'Dashboard', subtitle: 'Visão geral do seu negócio' };
    }
  };

  // Ação principal dinâmica
  const getPrimaryAction = () => {
    switch (dashboardMode) {
      case 'appointments':
        return { label: 'Novo Atendimento', path: '/agenda' };
      case 'service_orders':
        return { label: 'Nova OS', path: '/ordens-servico' };
      case 'bookings':
      default:
        return { label: 'Nova Reserva', path: '/agenda' };
    }
  };

  const titleInfo = getTitle();
  const primaryAction = getPrimaryAction();

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{titleInfo.title}</h1>
            <p className="text-muted-foreground mt-1">{titleInfo.subtitle}</p>
          </div>
          <Button onClick={() => navigate(primaryAction.path)} size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            {primaryAction.label}
          </Button>
        </div>

        {/* Conteúdo do Dashboard */}
        {renderDashboardContent()}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="border-border shadow-soft hover:shadow-soft-lg transition-all cursor-pointer group"
            onClick={() => navigate("/agenda")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-primary-100 p-3 group-hover:bg-primary-200 transition-colors">
                  <Calendar className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Ver Agenda</h3>
                  <p className="text-sm text-muted-foreground">Calendário completo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-border shadow-soft hover:shadow-soft-lg transition-all cursor-pointer group"
            onClick={() => navigate("/espacos")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-success-100 p-3 group-hover:bg-success-200 transition-colors">
                  <MapPin className="h-6 w-6 text-success-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {dashboardMode === 'service_orders' ? 'Ordens' : 'Espaços'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {dashboardMode === 'service_orders' ? 'Gerenciar OS' : 'Gerenciar locais'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-border shadow-soft hover:shadow-soft-lg transition-all cursor-pointer group"
            onClick={() => navigate("/relatorios")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-accent-100 p-3 group-hover:bg-accent-200 transition-colors">
                  <TrendingUp className="h-6 w-6 text-accent-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Relatórios</h3>
                  <p className="text-sm text-muted-foreground">Analytics completo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

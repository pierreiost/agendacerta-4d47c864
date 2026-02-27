import { useSaasMetrics } from '@/hooks/useSaasMetrics';
import { GlassCard } from './GlassCard';
import { GrowthChart } from './GrowthChart';
import { TopVenuesChart } from './TopVenuesChart';
import { EngagementTable } from './EngagementTable';
import { Building2, Calendar, Users, FileText } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export function SuperAdminDashboard() {
  const { data: metrics, isLoading } = useSaasMetrics();

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const { totals, per_venue, monthly_growth } = metrics;

  return (
    <div className="space-y-8">
      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard title="Total de Empresas" value={totals.total_venues} icon={Building2} accentColor="#6366f1" />
        <GlassCard title="Agendamentos" value={totals.total_bookings} icon={Calendar} accentColor="#3b82f6" />
        <GlassCard title="Clientes Criados" value={totals.total_customers} icon={Users} accentColor="#22c55e" />
        <GlassCard title="OS Geradas" value={totals.total_service_orders} icon={FileText} accentColor="#f59e0b" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <GrowthChart data={monthly_growth} />
        <TopVenuesChart data={per_venue.map((v) => ({ name: v.name, bookings: v.bookings }))} />
      </div>

      {/* Table */}
      <EngagementTable data={per_venue} />
    </div>
  );
}

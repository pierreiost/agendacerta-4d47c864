import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Search, Loader2, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AllPackage {
  id: string;
  total_sessions: number;
  used_sessions: number;
  status: string;
  expires_at: string | null;
  created_at: string;
  customer: { name: string } | null;
  service: { title: string } | null;
}

const statusBadge: Record<string, { label: string; className: string }> = {
  active: { label: 'Ativo', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  exhausted: { label: 'Esgotado', className: 'bg-muted text-muted-foreground' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

export function AllPackagesTab() {
  const { currentVenue } = useVenue();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['all-customer-packages', currentVenue?.id],
    queryFn: async () => {
      if (!currentVenue?.id) return [];
      const { data, error } = await supabase
        .from('customer_packages')
        .select('id, total_sessions, used_sessions, status, expires_at, created_at, customer:customers(name), service:services(title)')
        .eq('venue_id', currentVenue.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AllPackage[];
    },
    enabled: !!currentVenue?.id,
  });

  const filtered = useMemo(() => {
    let list = packages;
    if (statusFilter !== 'all') {
      list = list.filter(p => p.status === statusFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p =>
        p.customer?.name?.toLowerCase().includes(s) ||
        p.service?.title?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [packages, statusFilter, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente ou serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="exhausted">Esgotados</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-sm whitespace-nowrap self-start sm:self-auto">
          {filtered.length} {filtered.length === 1 ? 'pacote' : 'pacotes'}
        </Badge>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Nenhum pacote encontrado</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pkg) => {
            const pct = Math.min((pkg.used_sessions / pkg.total_sessions) * 100, 100);
            const badge = statusBadge[pkg.status] || statusBadge.active;
            return (
              <Card key={pkg.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <p className="font-medium text-sm truncate">{pkg.customer?.name || 'Cliente removido'}</p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{pkg.service?.title || 'Serviço removido'}</p>
                    </div>
                    <Badge className={badge.className}>{badge.label}</Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{pkg.used_sessions} / {pkg.total_sessions} sessões</span>
                      {pkg.expires_at && (
                        <span>Até {format(new Date(pkg.expires_at), 'dd/MM/yy', { locale: ptBR })}</span>
                      )}
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

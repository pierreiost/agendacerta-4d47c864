import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown } from 'lucide-react';

interface VenueMetric {
  venue_id: string;
  name: string;
  segment: string;
  bookings: number;
  customers: number;
  service_orders: number;
  products: number;
  services: number;
}

interface EngagementTableProps {
  data: VenueMetric[];
}

const SEGMENT_COLORS: Record<string, string> = {
  sports: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  beauty: 'bg-pink-500/20 text-pink-300 border-pink-400/30',
  health: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  custom: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
};

const SEGMENT_LABELS: Record<string, string> = {
  sports: 'Esportes',
  beauty: 'Beleza',
  health: 'Saúde',
  custom: 'Custom',
};

type SortKey = 'name' | 'bookings' | 'customers' | 'services' | 'products' | 'service_orders';

export function EngagementTable({ data }: EngagementTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('bookings');
  const [asc, setAsc] = useState(false);

  const sorted = [...data].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    if (typeof va === 'string' && typeof vb === 'string') return asc ? va.localeCompare(vb) : vb.localeCompare(va);
    return asc ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setAsc(!asc);
    else { setSortKey(key); setAsc(false); }
  };

  const Header = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider cursor-pointer hover:text-white/80 transition-colors select-none"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </span>
    </th>
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
      <div className="p-6 pb-2">
        <h3 className="text-lg font-semibold text-white/90">Engajamento por Empresa</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <Header label="Empresa" field="name" />
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Segmento</th>
              <Header label="Agendamentos" field="bookings" />
              <Header label="Clientes" field="customers" />
              <Header label="Serviços" field="services" />
              <Header label="Produtos" field="products" />
              <Header label="OS" field="service_orders" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((v) => (
              <tr key={v.venue_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-white/90">{v.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={SEGMENT_COLORS[v.segment] || SEGMENT_COLORS.custom}>
                    {SEGMENT_LABELS[v.segment] || v.segment}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-white/70 font-mono">{v.bookings}</td>
                <td className="px-4 py-3 text-sm text-white/70 font-mono">{v.customers}</td>
                <td className="px-4 py-3 text-sm text-white/70 font-mono">{v.services}</td>
                <td className="px-4 py-3 text-sm text-white/70 font-mono">{v.products}</td>
                <td className="px-4 py-3 text-sm text-white/70 font-mono">{v.service_orders}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/40 text-sm">
                  Nenhuma empresa cadastrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

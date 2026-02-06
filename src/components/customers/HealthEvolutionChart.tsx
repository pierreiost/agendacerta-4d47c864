import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { HealthRecord } from '@/hooks/useHealthRecords';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from 'recharts';
import { format, subMonths, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';

interface HealthEvolutionChartProps {
  records: HealthRecord[];
}

type Metric = 'weight' | 'bmi';
type Period = '3' | '6' | '12';

export function HealthEvolutionChart({ records }: HealthEvolutionChartProps) {
  const [metric, setMetric] = useState<Metric>('weight');
  const [period, setPeriod] = useState<Period>('6');

  const chartData = useMemo(() => {
    const cutoff = subMonths(new Date(), parseInt(period));
    return records
      .filter(r => isAfter(new Date(r.recorded_at), cutoff))
      .filter(r => metric === 'weight' ? r.weight_kg : r.bmi)
      .reverse()
      .map(r => ({
        date: format(new Date(r.recorded_at), 'dd/MM', { locale: ptBR }),
        value: metric === 'weight' ? r.weight_kg : r.bmi,
      }));
  }, [records, metric, period]);

  if (records.filter(r => r.weight_kg || r.bmi).length < 2) {
    return null;
  }

  const color = metric === 'weight' ? 'hsl(var(--primary))' : 'hsl(217, 91%, 60%)';
  const label = metric === 'weight' ? 'Peso (kg)' : 'IMC';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução
          </CardTitle>
          <div className="flex gap-2">
            <ToggleGroup type="single" value={metric} onValueChange={(v) => v && setMetric(v as Metric)} size="sm">
              <ToggleGroupItem value="weight">Peso</ToggleGroupItem>
              <ToggleGroupItem value="bmi">IMC</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v as Period)} size="sm">
              <ToggleGroupItem value="3">3m</ToggleGroupItem>
              <ToggleGroupItem value="6">6m</ToggleGroupItem>
              <ToggleGroupItem value="12">12m</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" domain={['auto', 'auto']} />
            <Tooltip
              formatter={(value: number) => [`${value}`, label]}
              labelFormatter={(l) => `Data: ${l}`}
              contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
            />
            <Area type="monotone" dataKey="value" stroke={color} fill="url(#colorValue)" strokeWidth={2} dot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

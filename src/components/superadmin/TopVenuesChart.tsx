import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TopVenuesChartProps {
  data: { name: string; bookings: number }[];
}

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

export function TopVenuesChart({ data }: TopVenuesChartProps) {
  const top5 = [...data].sort((a, b) => b.bookings - a.bookings).slice(0, 5);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
      <h3 className="text-lg font-semibold text-white/90 mb-4">Top 5 Empresas</h3>
      {top5.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-8">Sem dados ainda</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={top5} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15,23,42,0.9)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                color: '#fff',
              }}
            />
            <Bar dataKey="bookings" name="Agendamentos" radius={[0, 8, 8, 0]} barSize={24}>
              {top5.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

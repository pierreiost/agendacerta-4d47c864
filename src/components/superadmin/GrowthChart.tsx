import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface GrowthChartProps {
  data: { month: string; bookings: number; venues: number }[];
}

export function GrowthChart({ data }: GrowthChartProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
      <h3 className="text-lg font-semibold text-white/90 mb-4">Crescimento da Plataforma</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="gradientBookings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientVenues" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15,23,42,0.9)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              backdropFilter: 'blur(12px)',
              color: '#fff',
            }}
          />
          <Area type="monotone" dataKey="bookings" name="Agendamentos" stroke="#6366f1" fillOpacity={1} fill="url(#gradientBookings)" strokeWidth={2} />
          <Area type="monotone" dataKey="venues" name="Novas Empresas" stroke="#22c55e" fillOpacity={1} fill="url(#gradientVenues)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

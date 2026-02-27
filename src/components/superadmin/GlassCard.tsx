import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface GlassCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accentColor?: string;
  className?: string;
}

export function GlassCard({ title, value, icon: Icon, accentColor = '#6366f1', className }: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-2xl transition-all hover:bg-white/10 hover:shadow-primary/20 group',
        className
      )}
    >
      {/* Accent line */}
      <div
        className="absolute top-0 left-0 h-1 w-full rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />
      {/* Decorative icon */}
      <div className="absolute -right-3 -top-3 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity">
        <Icon className="h-24 w-24" />
      </div>
      <div className="relative z-10">
        <p className="text-sm font-medium text-white/60 mb-1">{title}</p>
        <p className="text-3xl font-bold text-white/90 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DelinquencyDay } from "@/hooks/useFinancialCharts";

interface Props {
  data: DelinquencyDay[];
  segment: string;
  isLoading?: boolean;
}

const SEGMENT_CONFIG: Record<string, { title: string; description: string }> = {
  sports: { title: "Reservas não pagas", description: "Reservas passadas sem finalização (últimos 30 dias)" },
  beauty: { title: "Comandas abertas", description: "Atendimentos realizados sem fechamento (últimos 30 dias)" },
  health: { title: "Consultas não finalizadas", description: "Atendimentos passados sem encerramento (últimos 30 dias)" },
  custom: { title: "OS / Orçamentos atrasados", description: "Ordens de serviço e orçamentos pendentes há mais de 7 dias" },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

function getIntensity(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-muted";
  const ratio = value / max;
  if (ratio > 0.75) return "bg-destructive";
  if (ratio > 0.5) return "bg-destructive/80";
  if (ratio > 0.25) return "bg-destructive/60";
  return "bg-destructive/40";
}

export function DelinquencyHeatmap({ data, segment, isLoading }: Props) {
  const config = SEGMENT_CONFIG[segment] || SEGMENT_CONFIG.sports;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // scroll to end (most recent) on mount
    el.scrollLeft = el.scrollWidth;
    updateScrollState();
  }, [data]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
    setTimeout(updateScrollState, 350);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-[140px] w-full" /></CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.total_value), 1);
  const totalTrapped = data.reduce((sum, d) => sum + d.total_value, 0);
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);
  const daysWithItems = data.filter((d) => d.count > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{config.title}</CardTitle>
            <CardDescription className="text-xs">{config.description}</CardDescription>
          </div>
          {totalTrapped > 0 && (
            <div className="text-right">
              <p className="text-lg font-bold text-destructive">{formatCurrency(totalTrapped)}</p>
              <p className="text-xs text-muted-foreground">{totalCount} {totalCount === 1 ? "item" : "itens"} em {daysWithItems.length} {daysWithItems.length === 1 ? "dia" : "dias"}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {totalTrapped === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            Nenhuma pendência encontrada 🎉
          </p>
        ) : (
          <div
            className="relative group"
            onMouseEnter={() => { setIsHovering(true); updateScrollState(); }}
            onMouseLeave={() => setIsHovering(false)}
          >
            {/* Left arrow */}
            <button
              onClick={() => scroll("left")}
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/90 border border-border shadow-md flex items-center justify-center transition-opacity duration-200",
                isHovering && canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>

            {/* Right arrow */}
            <button
              onClick={() => scroll("right")}
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/90 border border-border shadow-md flex items-center justify-center transition-opacity duration-200",
                isHovering && canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>

            {/* Scrollable cards */}
            <div
              ref={scrollRef}
              onScroll={updateScrollState}
              className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {data.filter(d => d.count > 0).map((day) => (
                <div
                  key={day.day_label}
                  className={cn(
                    "flex-shrink-0 w-[100px] rounded-lg p-3 flex flex-col items-center gap-1 transition-colors",
                    getIntensity(day.total_value, maxValue)
                  )}
                >
                  <span className={cn(
                    "text-[11px] font-medium uppercase",
                    day.total_value > 0 ? "text-destructive-foreground" : "text-muted-foreground"
                  )}>
                    {day.day_name}
                  </span>
                  <span className={cn(
                    "text-lg font-bold",
                    day.total_value > 0 ? "text-destructive-foreground" : "text-muted-foreground"
                  )}>
                    {day.count}
                  </span>
                  <span className={cn(
                    "text-[10px]",
                    day.total_value > 0 ? "text-destructive-foreground/80" : "text-muted-foreground"
                  )}>
                    {formatCurrency(day.total_value)}
                  </span>
                  <span className={cn(
                    "text-[10px]",
                    day.total_value > 0 ? "text-destructive-foreground/70" : "text-muted-foreground"
                  )}>
                    {day.day_label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

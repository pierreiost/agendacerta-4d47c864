import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Calculator, Clock, TrendingUp, DollarSign } from 'lucide-react';

export function LandingROICalculator() {
  const [reservationsPerMonth, setReservationsPerMonth] = useState(100);
  const [avgTicket, setAvgTicket] = useState(80);
  const [hoursManagingPerDay, setHoursManagingPerDay] = useState(2);

  // Calculations
  const timeSavedHours = Math.round(hoursManagingPerDay * 0.7 * 22); // 70% reduction, 22 work days
  const noShowReduction = Math.round(reservationsPerMonth * 0.15); // 15% no-show reduction
  const additionalRevenue = noShowReduction * avgTicket;
  const totalMonthlySavings = additionalRevenue + (timeSavedHours * 30); // R$30/hour value

  return (
    <section id="calculadora" className="py-20 md:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Calculadora de ROI
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Veja quanto você pode economizar
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ajuste os valores abaixo para descobrir o impacto do AgendaCerta no seu negócio.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Calculator Inputs */}
          <div className="bg-muted/30 rounded-2xl p-8 space-y-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Seus números</h3>
            </div>

            {/* Reservations Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">
                  Reservas por mês
                </label>
                <span className="text-2xl font-bold text-primary">{reservationsPerMonth}</span>
              </div>
              <Slider
                value={[reservationsPerMonth]}
                onValueChange={(v) => setReservationsPerMonth(v[0])}
                max={500}
                min={20}
                step={10}
                className="w-full"
              />
            </div>

            {/* Average Ticket Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">
                  Ticket médio (R$)
                </label>
                <span className="text-2xl font-bold text-primary">R$ {avgTicket}</span>
              </div>
              <Slider
                value={[avgTicket]}
                onValueChange={(v) => setAvgTicket(v[0])}
                max={300}
                min={20}
                step={10}
                className="w-full"
              />
            </div>

            {/* Hours Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">
                  Horas gastas gerenciando/dia
                </label>
                <span className="text-2xl font-bold text-primary">{hoursManagingPerDay}h</span>
              </div>
              <Slider
                value={[hoursManagingPerDay]}
                onValueChange={(v) => setHoursManagingPerDay(v[0])}
                max={8}
                min={0.5}
                step={0.5}
                className="w-full"
              />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-foreground mb-8">
              Com o AgendaCerta você ganha:
            </h3>

            {/* Time Saved */}
            <div className="flex items-center gap-4 p-6 bg-blue-50 rounded-xl border border-blue-100">
              <div className="h-14 w-14 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">{timeSavedHours}h</p>
                <p className="text-sm text-blue-600/80">horas economizadas por mês</p>
              </div>
            </div>

            {/* No-show Reduction */}
            <div className="flex items-center gap-4 p-6 bg-green-50 rounded-xl border border-green-100">
              <div className="h-14 w-14 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">{noShowReduction}</p>
                <p className="text-sm text-green-600/80">no-shows evitados com lembretes</p>
              </div>
            </div>

            {/* Total Savings */}
            <div className="flex items-center gap-4 p-6 bg-primary/10 rounded-xl border border-primary/20">
              <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">
                  R$ {totalMonthlySavings.toLocaleString('pt-BR')}
                </p>
                <p className="text-sm text-primary/80">economia estimada por mês</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              * Estimativas baseadas em dados de clientes reais. Resultados podem variar.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

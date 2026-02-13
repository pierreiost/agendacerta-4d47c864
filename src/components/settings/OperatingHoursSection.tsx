import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useOperatingHours, OperatingHour } from '@/hooks/useOperatingHours';
import { Clock, Copy, Loader2 } from 'lucide-react';

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

interface OperatingHoursSectionProps {
  venueId: string | undefined;
}

export function OperatingHoursSection({ venueId }: OperatingHoursSectionProps) {
  const { hours, isLoading, saveHours, isSaving } = useOperatingHours(venueId);
  const [localHours, setLocalHours] = useState<OperatingHour[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (hours.length > 0) {
      setLocalHours(hours);
      setIsDirty(false);
    }
  }, [hours]);

  const updateDay = (dayOfWeek: number, updates: Partial<OperatingHour>) => {
    setLocalHours((prev) =>
      prev.map((h) => (h.day_of_week === dayOfWeek ? { ...h, ...updates } : h))
    );
    setIsDirty(true);
  };

  const copyMondayToWeekdays = () => {
    const monday = localHours.find((h) => h.day_of_week === 1);
    if (!monday) return;
    setLocalHours((prev) =>
      prev.map((h) => {
        if (h.day_of_week >= 2 && h.day_of_week <= 5) {
          return { ...h, open_time: monday.open_time, close_time: monday.close_time, is_open: monday.is_open };
        }
        return h;
      })
    );
    setIsDirty(true);
  };

  const handleSave = () => {
    saveHours(localHours);
    setIsDirty(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (localHours.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horário de Funcionamento
        </CardTitle>
        <CardDescription>
          Defina os horários de funcionamento para cada dia da semana
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => {
            const hourData = localHours.find((h) => h.day_of_week === day);
            if (!hourData) return null;

            return (
              <div
                key={day}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2 border-b last:border-b-0"
              >
                <div className="flex items-center gap-3 min-w-[160px]">
                  <Switch
                    checked={hourData.is_open}
                    onCheckedChange={(checked) => updateDay(day, { is_open: checked })}
                  />
                  <Label className="text-sm font-medium w-[120px]">
                    {DAY_LABELS[day]}
                  </Label>
                </div>

                {hourData.is_open ? (
                  <div className="flex items-center gap-2 ml-8 sm:ml-0">
                    <Input
                      type="time"
                      value={hourData.open_time.slice(0, 5)}
                      onChange={(e) => updateDay(day, { open_time: e.target.value })}
                      className="w-[120px]"
                    />
                    <span className="text-muted-foreground text-sm">às</span>
                    <Input
                      type="time"
                      value={hourData.close_time.slice(0, 5)}
                      onChange={(e) => updateDay(day, { close_time: e.target.value })}
                      className="w-[120px]"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground ml-8 sm:ml-0">Fechado</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyMondayToWeekdays}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar Segunda para dias úteis
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Horários
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

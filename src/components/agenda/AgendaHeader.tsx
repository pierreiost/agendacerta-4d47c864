import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarIcon,
  Search,
} from 'lucide-react';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export type ViewMode = 'day' | 'week' | 'month';

interface AgendaHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNewBooking: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function AgendaHeader({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  onNewBooking,
  searchQuery,
  onSearchChange,
}: AgendaHeaderProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePrevious = () => {
    switch (viewMode) {
      case 'day':
        onDateChange(subDays(currentDate, 1));
        break;
      case 'week':
        onDateChange(subWeeks(currentDate, 1));
        break;
      case 'month':
        onDateChange(subMonths(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'day':
        onDateChange(addDays(currentDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, 1));
        break;
      case 'month':
        onDateChange(addMonths(currentDate, 1));
        break;
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getDateLabel = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR });
      case 'week':
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
      case 'month':
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Agenda</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualize e gerencie suas reservas
          </p>
        </div>
        <Button 
          onClick={onNewBooking} 
          className="bg-primary-500 hover:bg-primary-600 shadow-soft transition-all duration-200 hover:scale-[1.02]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Reserva
        </Button>
      </div>

      {/* Controls Row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card rounded-xl p-4 shadow-soft border border-border">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            className="h-9 w-9 transition-all duration-200 hover:bg-muted"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            onClick={handleToday}
            className="h-9 px-4 transition-all duration-200 hover:bg-muted"
          >
            Hoje
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="h-9 w-9 transition-all duration-200 hover:bg-muted"
            aria-label="Próximo"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 px-3 gap-2 ml-2 transition-all duration-200 hover:bg-muted"
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="font-medium capitalize">{getDateLabel()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => {
                  if (date) {
                    onDateChange(date);
                    setCalendarOpen(false);
                  }
                }}
                locale={ptBR}
                className="rounded-lg pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Center: View Mode */}
        <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="day" className="px-6 data-[state=active]:bg-background data-[state=active]:shadow-soft">
              Dia
            </TabsTrigger>
            <TabsTrigger value="week" className="px-6 data-[state=active]:bg-background data-[state=active]:shadow-soft">
              Semana
            </TabsTrigger>
            <TabsTrigger value="month" className="px-6 data-[state=active]:bg-background data-[state=active]:shadow-soft">
              Mês
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Right: Search */}
        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar reservas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>
      </div>
    </div>
  );
}

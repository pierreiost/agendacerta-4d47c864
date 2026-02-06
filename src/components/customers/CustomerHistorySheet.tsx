import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/hooks/useCustomers';
import { useHealthRecords } from '@/hooks/useHealthRecords';
import { HealthRecordForm } from './HealthRecordForm';
import { HealthRecordTimeline } from './HealthRecordTimeline';
import { HealthEvolutionChart } from './HealthEvolutionChart';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  DollarSign,
  Package,
  TrendingUp,
  Loader2,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  venueSegment?: string | null;
}

interface BookingWithItems {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  space_total: number | null;
  items_total: number | null;
  grand_total: number | null;
  notes: string | null;
  space: { name: string } | null;
  order_items: { id: string; description: string; quantity: number; unit_price: number; subtotal: number }[];
  payments: { id: string; amount: number; method: string }[];
}

const statusConfig = {
  PENDING: { label: 'Pendente', variant: 'secondary' as const, icon: AlertCircle },
  CONFIRMED: { label: 'Confirmada', variant: 'default' as const, icon: CheckCircle },
  CANCELLED: { label: 'Cancelada', variant: 'destructive' as const, icon: XCircle },
  FINALIZED: { label: 'Finalizada', variant: 'outline' as const, icon: CheckCircle },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function CustomerHistorySheet({ open, onOpenChange, customer, venueSegment }: CustomerHistorySheetProps) {
  const [showRecordForm, setShowRecordForm] = useState(false);
  const isHealth = venueSegment === 'health';

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['customer-history', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select(`id, start_time, end_time, status, space_total, items_total, grand_total, notes,
          space:spaces(name), order_items(id, description, quantity, unit_price, subtotal), payments(id, amount, method)`)
        .eq('customer_id', customer.id)
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data as BookingWithItems[];
    },
    enabled: open && !!customer?.id,
  });

  const { records, isLoading: healthLoading, createRecord, deleteRecord, latestAllergies, latestBloodType } = useHealthRecords(
    open && isHealth ? customer?.id : undefined
  );

  const stats = useMemo(() => {
    if (!bookings || bookings.length === 0)
      return { totalBookings: 0, completedBookings: 0, cancelledBookings: 0, totalSpent: 0, totalItems: 0, totalHours: 0 };
    const completed = bookings.filter(b => b.status === 'FINALIZED' || b.status === 'CONFIRMED');
    const cancelled = bookings.filter(b => b.status === 'CANCELLED');
    return {
      totalBookings: bookings.length,
      completedBookings: completed.length,
      cancelledBookings: cancelled.length,
      totalSpent: completed.reduce((s, b) => s + (b.grand_total || 0), 0),
      totalItems: completed.reduce((s, b) => s + b.order_items.reduce((is, i) => is + i.quantity, 0), 0),
      totalHours: completed.reduce((s, b) => {
        const start = new Date(b.start_time);
        const end = new Date(b.end_time);
        return s + (end.getTime() - start.getTime()) / 3600000;
      }, 0),
    };
  }, [bookings]);

  if (!customer) return null;

  const historyContent = (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">Reservas</span></div>
            <p className="text-2xl font-bold mt-1">{stats.totalBookings}</p>
            <p className="text-xs text-muted-foreground">{stats.completedBookings} concluídas • {stats.cancelledBookings} canceladas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-500" /><span className="text-sm text-muted-foreground">Total Gasto</span></div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" /><span className="text-sm text-muted-foreground">Horas</span></div>
            <p className="text-2xl font-bold mt-1">{stats.totalHours.toFixed(0)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2"><Package className="h-4 w-4 text-orange-500" /><span className="text-sm text-muted-foreground">Itens</span></div>
            <p className="text-2xl font-bold mt-1">{stats.totalItems}</p>
          </CardContent>
        </Card>
      </div>
      <Separator />
      {/* Bookings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Histórico de Reservas</h3>
        {!bookings || bookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" /><p>Nenhuma reserva encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const config = statusConfig[booking.status as keyof typeof statusConfig];
              const StatusIcon = config?.icon || AlertCircle;
              return (
                <Card key={booking.id} className="overflow-hidden">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{booking.space?.name || 'Espaço removido'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(booking.start_time), "dd/MM/yyyy", { locale: ptBR })}
                          <Clock className="h-3 w-3 ml-2" />
                          {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
                        </div>
                      </div>
                      <Badge variant={config?.variant || 'secondary'} className="shrink-0">
                        <StatusIcon className="h-3 w-3 mr-1" />{config?.label || booking.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    {booking.order_items.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Consumo:</p>
                        <div className="space-y-1">
                          {booking.order_items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{item.quantity}x {item.description}</span>
                              <span>{formatCurrency(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <div className="space-y-0.5">
                        {booking.space_total && booking.space_total > 0 && <p className="text-xs text-muted-foreground">Espaço: {formatCurrency(booking.space_total)}</p>}
                        {booking.items_total && booking.items_total > 0 && <p className="text-xs text-muted-foreground">Consumo: {formatCurrency(booking.items_total)}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(booking.grand_total || 0)}</p>
                        {booking.payments.length > 0 && (
                          <p className="text-xs text-green-600">Pago: {formatCurrency(booking.payments.reduce((s, p) => s + p.amount, 0))}</p>
                        )}
                      </div>
                    </div>
                    {booking.notes && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex items-start gap-1 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3 mt-0.5 shrink-0" /><span>{booking.notes}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const prontuarioContent = (
    <div className="space-y-4">
      {!showRecordForm ? (
        <Button size="sm" onClick={() => setShowRecordForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Registro
        </Button>
      ) : (
        <HealthRecordForm
          defaultAllergies={latestAllergies}
          defaultBloodType={latestBloodType}
          onSubmit={(data) => {
            createRecord.mutate(data, { onSuccess: () => setShowRecordForm(false) });
          }}
          onCancel={() => setShowRecordForm(false)}
          isSubmitting={createRecord.isPending}
        />
      )}
      <HealthEvolutionChart records={records} />
      <HealthRecordTimeline records={records} onDelete={(id) => deleteRecord.mutate(id)} />
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {isHealth ? 'Prontuário de' : 'Histórico de'} {customer.name}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
          {isLoading || healthLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isHealth ? (
            <Tabs defaultValue="prontuario">
              <TabsList className="w-full">
                <TabsTrigger value="prontuario" className="flex-1">
                  <Heart className="h-4 w-4 mr-1" /> Prontuário
                </TabsTrigger>
                <TabsTrigger value="historico" className="flex-1">
                  <Calendar className="h-4 w-4 mr-1" /> Histórico
                </TabsTrigger>
              </TabsList>
              <TabsContent value="prontuario" className="mt-4">{prontuarioContent}</TabsContent>
              <TabsContent value="historico" className="mt-4">{historyContent}</TabsContent>
            </Tabs>
          ) : (
            historyContent
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

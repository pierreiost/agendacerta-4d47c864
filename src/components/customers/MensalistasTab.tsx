import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSpaces } from '@/hooks/useSpaces';
import { useBookingRPC } from '@/hooks/useBookingRPC';
import {
  Search,
  Loader2,
  CalendarClock,
  MoreHorizontal,
  XCircle,
  RefreshCw,
  Pencil,
  MapPin,
  User,
  Clock,
  Calendar,
} from 'lucide-react';
import { format, addDays, parseISO, isBefore, startOfDay, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface RecurrenceGroup {
  recurrence_group_id: string;
  customer_name: string;
  customer_id: string | null;
  space_id: string | null;
  space_name: string | null;
  day_of_week: number;
  start_hour: number;
  end_hour: number;
  total_bookings: number;
  future_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  status: 'active' | 'completed' | 'cancelled';
  next_booking_date: string | null;
}

export function MensalistasTab() {
  const { currentVenue } = useVenue();
  const { spaces } = useSpaces();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { createRecurringBookings } = useBookingRPC();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [cancelGroupId, setCancelGroupId] = useState<string | null>(null);
  const [cancelGroupName, setCancelGroupName] = useState<string>('');
  const [renewGroup, setRenewGroup] = useState<RecurrenceGroup | null>(null);
  const [renewWeeks, setRenewWeeks] = useState(4);
  const [editGroup, setEditGroup] = useState<RecurrenceGroup | null>(null);
  const [editDayOfWeek, setEditDayOfWeek] = useState(1);
  const [editStartHour, setEditStartHour] = useState(8);
  const [editEndHour, setEditEndHour] = useState(9);

  // Fetch recurrence groups
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['mensalistas', currentVenue?.id],
    queryFn: async () => {
      if (!currentVenue?.id) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select('id, recurrence_group_id, customer_name, customer_id, space_id, start_time, end_time, status, space:spaces(name)')
        .eq('venue_id', currentVenue.id)
        .not('recurrence_group_id', 'is', null)
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Group by recurrence_group_id
      const groupMap = new Map<string, {
        bookings: typeof data;
        customer_name: string;
        customer_id: string | null;
        space_id: string | null;
        space_name: string | null;
      }>();

      for (const b of data) {
        const gid = b.recurrence_group_id!;
        if (!groupMap.has(gid)) {
          groupMap.set(gid, {
            bookings: [],
            customer_name: b.customer_name,
            customer_id: b.customer_id,
            space_id: b.space_id,
            space_name: (b.space as any)?.name || null,
          });
        }
        groupMap.get(gid)!.bookings.push(b);
      }

      const now = new Date();
      const result: RecurrenceGroup[] = [];

      for (const [gid, group] of groupMap) {
        const first = group.bookings[0];
        const startDate = parseISO(first.start_time);
        const dayOfWeek = getDay(startDate);
        const startHour = startDate.getHours();
        const endDate = parseISO(first.end_time);
        const endHour = endDate.getHours();

        const futureBookings = group.bookings.filter(b =>
          isBefore(now, parseISO(b.start_time)) && b.status !== 'CANCELLED'
        );
        const completedBookings = group.bookings.filter(b => b.status === 'FINALIZED');
        const cancelledBookings = group.bookings.filter(b => b.status === 'CANCELLED');
        const confirmedFuture = futureBookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING');

        let status: 'active' | 'completed' | 'cancelled' = 'completed';
        if (cancelledBookings.length === group.bookings.length) {
          status = 'cancelled';
        } else if (confirmedFuture.length > 0) {
          status = 'active';
        }

        const nextBooking = futureBookings
          .filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING')
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];

        result.push({
          recurrence_group_id: gid,
          customer_name: group.customer_name,
          customer_id: group.customer_id,
          space_id: group.space_id,
          space_name: group.space_name,
          day_of_week: dayOfWeek,
          start_hour: startHour,
          end_hour: endHour,
          total_bookings: group.bookings.length,
          future_bookings: confirmedFuture.length,
          completed_bookings: completedBookings.length,
          cancelled_bookings: cancelledBookings.length,
          status,
          next_booking_date: nextBooking ? nextBooking.start_time : null,
        });
      }

      // Sort: active first, then by next booking date
      result.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return 0;
      });

      return result;
    },
    enabled: !!currentVenue?.id,
  });

  // Cancel all future bookings in group
  const cancelGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'CANCELLED' })
        .eq('recurrence_group_id', groupId)
        .eq('venue_id', currentVenue!.id)
        .gte('start_time', now)
        .in('status', ['CONFIRMED', 'PENDING']);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mensalistas'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Reservas futuras canceladas com sucesso' });
      setCancelGroupId(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao cancelar', description: error.message, variant: 'destructive' });
    },
  });

  // Update future bookings in group (edit schedule)
  const updateGroupSchedule = useMutation({
    mutationFn: async ({ groupId, dayOfWeek, startHour, endHour }: {
      groupId: string;
      dayOfWeek: number;
      startHour: number;
      endHour: number;
    }) => {
      // Get all future CONFIRMED/PENDING bookings in this group
      const now = new Date().toISOString();
      const { data: futureBookings, error: fetchError } = await supabase
        .from('bookings')
        .select('id, start_time')
        .eq('recurrence_group_id', groupId)
        .eq('venue_id', currentVenue!.id)
        .gte('start_time', now)
        .in('status', ['CONFIRMED', 'PENDING'])
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;
      if (!futureBookings?.length) throw new Error('Nenhuma reserva futura para alterar');

      // Update each booking with new day/time
      for (const booking of futureBookings) {
        const oldDate = parseISO(booking.start_time);
        const currentDay = getDay(oldDate);
        const dayDiff = dayOfWeek - currentDay;
        const newDate = addDays(oldDate, dayDiff);
        
        const newStart = new Date(newDate);
        newStart.setHours(startHour, 0, 0, 0);
        const newEnd = new Date(newDate);
        newEnd.setHours(endHour, 0, 0, 0);

        // Skip if new date is in the past
        if (isBefore(newStart, new Date())) continue;

        const { error } = await supabase
          .from('bookings')
          .update({
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
          })
          .eq('id', booking.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mensalistas'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Horários atualizados com sucesso' });
      setEditGroup(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao alterar horários', description: error.message, variant: 'destructive' });
    },
  });

  // Filter
  const filtered = useMemo(() => {
    let list = groups;
    if (statusFilter !== 'all') {
      list = list.filter(g => g.status === statusFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(g =>
        g.customer_name?.toLowerCase().includes(s) ||
        g.space_name?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [groups, statusFilter, search]);

  const handleCancelClick = (group: RecurrenceGroup) => {
    setCancelGroupId(group.recurrence_group_id);
    setCancelGroupName(group.customer_name);
  };

  const handleRenewClick = (group: RecurrenceGroup) => {
    setRenewGroup(group);
    setRenewWeeks(4);
  };

  const handleEditClick = (group: RecurrenceGroup) => {
    setEditGroup(group);
    setEditDayOfWeek(group.day_of_week);
    setEditStartHour(group.start_hour);
    setEditEndHour(group.end_hour);
  };

  const handleRenewConfirm = () => {
    if (!renewGroup || !currentVenue?.id) return;

    // Find next occurrence of this day of week
    const today = startOfDay(new Date());
    let baseDate = today;
    while (getDay(baseDate) !== renewGroup.day_of_week) {
      baseDate = addDays(baseDate, 1);
    }

    createRecurringBookings.mutate({
      venue_id: currentVenue.id,
      space_id: renewGroup.space_id || '',
      customer_name: renewGroup.customer_name,
      base_date: format(baseDate, 'yyyy-MM-dd'),
      start_hour: renewGroup.start_hour,
      end_hour: renewGroup.end_hour,
      customer_id: renewGroup.customer_id,
      space_price_per_hour: spaces.find(s => s.id === renewGroup.space_id)?.price_per_hour || 0,
      recurrence_type: 'weekly',
      recurrence_count: renewWeeks,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['mensalistas'] });
        setRenewGroup(null);
      },
    });
  };

  const statusBadge: Record<string, { label: string; className: string }> = {
    active: { label: 'Ativo', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    completed: { label: 'Finalizado', className: 'bg-muted text-muted-foreground' },
    cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente ou espaço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="completed">Finalizados</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-sm whitespace-nowrap self-start sm:self-auto">
          {filtered.length} {filtered.length === 1 ? 'mensalista' : 'mensalistas'}
        </Badge>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarClock className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Nenhum mensalista encontrado</p>
          <p className="text-xs mt-1">Crie reservas recorrentes na agenda para gerar mensalistas</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((group) => {
            const badge = statusBadge[group.status] || statusBadge.active;
            return (
              <Card key={group.recurrence_group_id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <p className="font-medium text-sm truncate">{group.customer_name}</p>
                      </div>
                      {group.space_name && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{group.space_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={badge.className}>{badge.label}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRenewClick(group)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Renovar
                          </DropdownMenuItem>
                          {group.status === 'active' && (
                            <DropdownMenuItem onClick={() => handleEditClick(group)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Alterar Horário
                            </DropdownMenuItem>
                          )}
                          {group.status === 'active' && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleCancelClick(group)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar Todas
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Schedule info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>{DAY_NAMES[group.day_of_week]}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{String(group.start_hour).padStart(2, '0')}:00 - {String(group.end_hour).padStart(2, '0')}:00</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-3 text-xs">
                    <div className="text-center">
                      <p className="font-semibold text-foreground">{group.future_bookings}</p>
                      <p className="text-muted-foreground">Futuras</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">{group.completed_bookings}</p>
                      <p className="text-muted-foreground">Realizadas</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">{group.total_bookings}</p>
                      <p className="text-muted-foreground">Total</p>
                    </div>
                  </div>

                  {/* Next booking */}
                  {group.next_booking_date && (
                    <p className="text-xs text-primary">
                      Próxima: {format(parseISO(group.next_booking_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelGroupId} onOpenChange={(o) => !o && setCancelGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar todas as reservas?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as reservas futuras do mensalista "{cancelGroupName}" serão canceladas. 
              As reservas passadas e finalizadas não serão alteradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelGroupId && cancelGroup.mutate(cancelGroupId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelGroup.isPending}
            >
              {cancelGroup.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Cancelar Reservas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Renew Dialog */}
      <Dialog open={!!renewGroup} onOpenChange={(o) => !o && setRenewGroup(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renovar Mensalista</DialogTitle>
            <DialogDescription>
              Gerar novas reservas semanais para {renewGroup?.customer_name} — {DAY_NAMES[renewGroup?.day_of_week ?? 0]} {String(renewGroup?.start_hour ?? 0).padStart(2, '0')}:00-{String(renewGroup?.end_hour ?? 0).padStart(2, '0')}:00
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Quantidade de semanas</Label>
              <Select value={String(renewWeeks)} onValueChange={(v) => setRenewWeeks(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 4, 8, 12, 16].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} semanas</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewGroup(null)}>Cancelar</Button>
            <Button onClick={handleRenewConfirm} disabled={createRecurringBookings.isPending}>
              {createRecurringBookings.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <RefreshCw className="h-4 w-4 mr-2" />
              Renovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={!!editGroup} onOpenChange={(o) => !o && setEditGroup(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Horário</DialogTitle>
            <DialogDescription>
              Alterar dia/horário de todas as reservas futuras de {editGroup?.customer_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Dia da semana</Label>
              <Select value={String(editDayOfWeek)} onValueChange={(v) => setEditDayOfWeek(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Início</Label>
                <Select value={String(editStartHour)} onValueChange={(v) => setEditStartHour(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 18 }, (_, i) => i + 6).map(h => (
                      <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}:00</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Select value={String(editEndHour)} onValueChange={(v) => setEditEndHour(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 18 }, (_, i) => i + 7).map(h => (
                      <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}:00</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGroup(null)}>Cancelar</Button>
            <Button
              onClick={() => editGroup && updateGroupSchedule.mutate({
                groupId: editGroup.recurrence_group_id,
                dayOfWeek: editDayOfWeek,
                startHour: editStartHour,
                endHour: editEndHour,
              })}
              disabled={updateGroupSchedule.isPending || editStartHour >= editEndHour}
            >
              {updateGroupSchedule.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

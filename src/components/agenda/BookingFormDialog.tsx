import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useBookings, type Booking } from '@/hooks/useBookings';
import type { Space } from '@/hooks/useSpaces';
import { format, setHours, setMinutes, parseISO, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  customer_name: z.string().min(1, 'Nome do cliente é obrigatório'),
  customer_phone: z.string().optional(),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  space_id: z.string().min(1, 'Selecione um espaço'),
  date: z.date({ required_error: 'Data é obrigatória' }),
  start_hour: z.string().min(1, 'Hora inicial obrigatória'),
  end_hour: z.string().min(1, 'Hora final obrigatória'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const HOURS_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const hour = i + 6;
  return { value: `${hour}:00`, label: `${hour.toString().padStart(2, '0')}:00` };
});

interface BookingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  venueId: string;
  spaces: Space[];
  defaultSlot?: { spaceId: string; date: Date; hour: number } | null;
}

export function BookingFormDialog({
  open,
  onOpenChange,
  booking,
  venueId,
  spaces,
  defaultSlot,
}: BookingFormDialogProps) {
  const { createBooking, updateBooking, checkConflict } = useBookings();
  const isEditing = !!booking;
  const [conflictError, setConflictError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      space_id: '',
      date: new Date(),
      start_hour: '8:00',
      end_hour: '9:00',
      notes: '',
    },
  });

  useEffect(() => {
    if (booking) {
      const startDate = parseISO(booking.start_time);
      const endDate = parseISO(booking.end_time);
      
      form.reset({
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone ?? '',
        customer_email: booking.customer_email ?? '',
        space_id: booking.space_id,
        date: startDate,
        start_hour: format(startDate, 'H:mm'),
        end_hour: format(endDate, 'H:mm'),
        notes: booking.notes ?? '',
      });
    } else if (defaultSlot) {
      form.reset({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        space_id: defaultSlot.spaceId,
        date: defaultSlot.date,
        start_hour: `${defaultSlot.hour}:00`,
        end_hour: `${defaultSlot.hour + 1}:00`,
        notes: '',
      });
    } else {
      form.reset({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        space_id: spaces[0]?.id ?? '',
        date: new Date(),
        start_hour: '8:00',
        end_hour: '9:00',
        notes: '',
      });
    }
    setConflictError(null);
  }, [booking, defaultSlot, form, spaces]);

  const onSubmit = async (data: FormData) => {
    setConflictError(null);

    const [startHour] = data.start_hour.split(':').map(Number);
    const [endHour] = data.end_hour.split(':').map(Number);

    if (endHour <= startHour) {
      form.setError('end_hour', { message: 'Hora final deve ser maior que inicial' });
      return;
    }

    const startTime = setMinutes(setHours(data.date, startHour), 0);
    const endTime = setMinutes(setHours(data.date, endHour), 0);

    // Block retroactive bookings (only for new bookings)
    if (!isEditing && isBefore(startTime, new Date())) {
      setConflictError('Não é permitido criar reservas retroativas (data/hora no passado).');
      return;
    }

    // Check for space conflicts
    const hasConflict = await checkConflict(
      data.space_id,
      startTime,
      endTime,
      booking?.id
    );

    if (hasConflict) {
      setConflictError('Já existe uma reserva neste horário para este espaço.');
      return;
    }

    // Check if the same customer already has a booking at the same time in the same space
    const { data: customerConflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('space_id', data.space_id)
      .eq('customer_name', data.customer_name)
      .neq('status', 'CANCELLED')
      .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`)
      .neq('id', booking?.id ?? '00000000-0000-0000-0000-000000000000');

    if (customerConflicts && customerConflicts.length > 0) {
      setConflictError('Este cliente já possui uma reserva neste espaço no mesmo horário.');
      return;
    }

    const space = spaces.find(s => s.id === data.space_id);
    const pricePerHour = Number(space?.price_per_hour ?? 0);

    const payload = {
      customer_name: data.customer_name,
      customer_phone: data.customer_phone || null,
      customer_email: data.customer_email || null,
      space_id: data.space_id,
      venue_id: venueId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      notes: data.notes || null,
      space_price_per_hour: pricePerHour,
    };

    if (isEditing) {
      await updateBooking.mutateAsync({ id: booking.id, ...payload });
    } else {
      await createBooking.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isPending = createBooking.isPending || updateBooking.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Reserva' : 'Nova Reserva'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {conflictError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{conflictError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="space_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Espaço *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um espaço" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {spaces.map((space) => (
                        <SelectItem key={space.id} value={space.id}>
                          <div className="flex items-center gap-2">
                            {space.category?.color && (
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: space.category.color }}
                              />
                            )}
                            {space.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, "d 'de' MMMM, yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={ptBR}
                        disabled={(date) => !isEditing && isBefore(startOfDay(date), startOfDay(new Date()))}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_hour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Início *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HOURS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_hour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Fim *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HOURS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionais sobre a reserva"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar Reserva'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

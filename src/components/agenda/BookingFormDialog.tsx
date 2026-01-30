import { useEffect, useState, useMemo } from 'react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { format, setHours, setMinutes, parseISO, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2, AlertCircle, UserPlus, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog';
import { useFormPersist } from '@/hooks/useFormPersist';

const formSchema = z.object({
  customer_id: z.string().optional(),
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
  const { customers, refetch: refetchCustomers } = useCustomers();
  const isEditing = !!booking;
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_id: '',
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

  // Form persistence - only for new bookings
  const { clearDraft } = useFormPersist({
    form,
    key: `booking_form_${venueId}`,
    showRecoveryToast: !isEditing && open && !defaultSlot,
  });

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!customerSearch) return customers;
    const searchLower = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  const handleSelectCustomer = (customer: Customer) => {
    form.setValue('customer_id', customer.id);
    form.setValue('customer_name', customer.name);
    form.setValue('customer_phone', customer.phone || '');
    form.setValue('customer_email', customer.email || '');
    setCustomerSearchOpen(false);
    setCustomerSearch('');
  };

  const handleClearCustomer = () => {
    form.setValue('customer_id', '');
    form.setValue('customer_name', '');
    form.setValue('customer_phone', '');
    form.setValue('customer_email', '');
  };

  const handleNewCustomerCreated = () => {
    refetchCustomers();
  };

  useEffect(() => {
    if (booking) {
      clearDraft();
      const startDate = parseISO(booking.start_time);
      const endDate = parseISO(booking.end_time);
      
      form.reset({
        customer_id: booking.customer_id ?? '',
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
      clearDraft();
      form.reset({
        customer_id: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        space_id: defaultSlot.spaceId,
        date: defaultSlot.date,
        start_hour: `${defaultSlot.hour}:00`,
        end_hour: `${defaultSlot.hour + 1}:00`,
        notes: '',
      });
    } else if (!open) {
      form.reset({
        customer_id: '',
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
    setCustomerSearch('');
  }, [booking, defaultSlot, form, spaces, open, clearDraft]);

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
      customer_id: data.customer_id || null,
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

    clearDraft();
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

            {/* Customer Selection with Autocomplete */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Cliente *</FormLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCustomerDialogOpen(true)}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Novo Cliente
                </Button>
              </div>
              
              <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerSearchOpen}
                    className="w-full justify-between font-normal"
                  >
                    {form.watch('customer_name') || 'Buscar cliente...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Digite o nome, email ou telefone..."
                      value={customerSearch}
                      onValueChange={setCustomerSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-2 text-center text-sm">
                          Nenhum cliente encontrado.
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="px-1"
                            onClick={() => {
                              setCustomerSearchOpen(false);
                              setCustomerDialogOpen(true);
                            }}
                          >
                            Criar novo
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredCustomers.slice(0, 10).map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.id}
                            onSelect={() => handleSelectCustomer(customer)}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                form.watch('customer_id') === customer.id
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{customer.name}</span>
                              {(customer.phone || customer.email) && (
                                <span className="text-xs text-muted-foreground">
                                  {[customer.phone, customer.email].filter(Boolean).join(' • ')}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {form.watch('customer_id') && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={handleClearCustomer}
                >
                  Limpar seleção
                </Button>
              )}
            </div>

            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem className={form.watch('customer_id') ? 'hidden' : ''}>
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

      <CustomerFormDialog
        open={customerDialogOpen}
        onOpenChange={(open) => {
          setCustomerDialogOpen(open);
          if (!open) {
            handleNewCustomerCreated();
          }
        }}
        customer={null}
      />
    </Dialog>
  );
}

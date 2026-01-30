import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { useBookings } from '@/hooks/useBookings';
import { useVenue } from '@/contexts/VenueContext';
import { useFormPersist } from '@/hooks/useFormPersist';
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog';
import type { Tables } from '@/integrations/supabase/types';
import { getSpaceColor } from './AgendaSidebar';
import {
  format,
  setHours,
  setMinutes,
  differenceInHours,
  isBefore,
  startOfDay,
  addWeeks,
  addMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  User,
  CalendarIcon,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Search,
  DollarSign,
  Mail,
  Phone,
  Repeat,
} from 'lucide-react';

type Space = Tables<'spaces'> & {
  category?: Tables<'categories'> | null;
};

interface BookingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaces: Space[];
  allSpaces: Space[];
  defaultSlot?: { spaceId: string; date: Date; hour: number } | null;
}

const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const hour = i + 6;
  return {
    value: hour.toString(),
    label: `${hour.toString().padStart(2, '0')}:00`,
  };
});

const RECURRENCE_OPTIONS = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
];

const RECURRENCE_COUNT_OPTIONS = [
  { value: '4', label: '4 vezes' },
  { value: '8', label: '8 vezes' },
  { value: '12', label: '12 vezes' },
  { value: '24', label: '24 vezes' },
  { value: '52', label: '52 vezes (1 ano semanal)' },
];

const schema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, 'Nome é obrigatório'),
  customerEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  spaceId: z.string().min(1, 'Espaço é obrigatório'),
  date: z.date({ required_error: 'Data é obrigatória' }),
  startHour: z.string().min(1, 'Horário inicial é obrigatório'),
  endHour: z.string().min(1, 'Horário final é obrigatório'),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceType: z.enum(['weekly', 'monthly']).optional(),
  recurrenceCount: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function BookingWizard({
  open,
  onOpenChange,
  spaces,
  allSpaces,
  defaultSlot,
}: BookingWizardProps) {
  const [step, setStep] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const { currentVenue } = useVenue();
  const { customers } = useCustomers();
  const { createBooking, checkConflict } = useBookings();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      spaceId: '',
      startHour: '',
      endHour: '',
      notes: '',
    },
  });

  const { watch, setValue, reset, handleSubmit, formState: { errors } } = form;

  // Form persistence - only active when dialog is open
  const { clearDraft } = useFormPersist({
    form,
    key: `booking_wizard_${currentVenue?.id || 'default'}`,
    exclude: ['customerId'], // Don't persist customerId as it may be invalid
    debounceMs: 300,
    showRecoveryToast: open, // Only show toast when dialog opens
  });

  const selectedSpaceId = watch('spaceId');
  const selectedDate = watch('date');
  const startHour = watch('startHour');
  const endHour = watch('endHour');
  const customerName = watch('customerName');
  const isRecurring = watch('isRecurring');
  const recurrenceType = watch('recurrenceType');
  const recurrenceCount = watch('recurrenceCount');

  // Track if we should restore from draft or use defaultSlot
  const initialLoadRef = useRef(true);

  // Reset form when dialog opens with defaultSlot
  useEffect(() => {
    if (open) {
      setStep(1);
      // Only reset with defaultSlot values if this is a fresh open with a slot
      if (defaultSlot && initialLoadRef.current) {
        reset({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          spaceId: defaultSlot.spaceId,
          date: defaultSlot.date,
          startHour: defaultSlot.hour.toString(),
          endHour: (defaultSlot.hour + 1).toString(),
          notes: '',
        });
        clearDraft(); // Clear any existing draft when using defaultSlot
      }
      initialLoadRef.current = false;
    } else {
      initialLoadRef.current = true;
    }
  }, [open, defaultSlot, reset, clearDraft]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 10);
    const search = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.phone?.includes(search)
    ).slice(0, 10);
  }, [customers, customerSearch]);

  const selectedSpace = useMemo(() => {
    return spaces.find((s) => s.id === selectedSpaceId);
  }, [spaces, selectedSpaceId]);

  const pricePreview = useMemo(() => {
    if (!selectedSpace || !startHour || !endHour) return null;
    const hours = parseInt(endHour) - parseInt(startHour);
    if (hours <= 0) return null;
    return hours * (selectedSpace.price_per_hour ?? 0);
  }, [selectedSpace, startHour, endHour]);

  const handleSelectCustomer = (customer: Customer) => {
    setValue('customerId', customer.id);
    setValue('customerName', customer.name);
    setValue('customerEmail', customer.email || '');
    setValue('customerPhone', customer.phone || '');
    setCustomerPopoverOpen(false);
    setCustomerSearch('');
  };

  const handleClearCustomer = () => {
    setValue('customerId', undefined);
    setValue('customerName', '');
    setValue('customerEmail', '');
    setValue('customerPhone', '');
  };

  const handleNewCustomerCreated = (customer: Customer) => {
    handleSelectCustomer(customer);
    setNewCustomerDialogOpen(false);
  };

  const canProceedToStep2 = customerName && customerName.trim().length > 0;
  const canProceedToStep3 =
    selectedSpaceId && selectedDate && startHour && endHour && parseInt(endHour) > parseInt(startHour);

  const onSubmit = async (data: FormData) => {
    if (!currentVenue?.id || !data.date) return;

    const space = spaces.find((s) => s.id === data.spaceId);
    const count = data.isRecurring && data.recurrenceCount ? parseInt(data.recurrenceCount) : 1;
    
    // Generate all booking dates
    const bookingDates: Date[] = [];
    for (let i = 0; i < count; i++) {
      let bookingDate = data.date;
      if (i > 0) {
        if (data.recurrenceType === 'weekly') {
          bookingDate = addWeeks(data.date, i);
        } else if (data.recurrenceType === 'monthly') {
          bookingDate = addMonths(data.date, i);
        }
      }
      bookingDates.push(bookingDate);
    }

    // Check for conflicts on all dates
    for (const bookingDate of bookingDates) {
      const startTime = setMinutes(setHours(bookingDate, parseInt(data.startHour)), 0);
      const endTime = setMinutes(setHours(bookingDate, parseInt(data.endHour)), 0);

      // Check for past dates (only for first booking)
      if (isBefore(startOfDay(startTime), startOfDay(new Date()))) {
        continue; // Skip past dates
      }

      const hasConflict = await checkConflict(data.spaceId, startTime, endTime);
      if (hasConflict) {
        // Skip dates with conflicts for recurrent bookings
        continue;
      }
    }

    // Create all bookings
    let successCount = 0;
    for (const bookingDate of bookingDates) {
      const startTime = setMinutes(setHours(bookingDate, parseInt(data.startHour)), 0);
      const endTime = setMinutes(setHours(bookingDate, parseInt(data.endHour)), 0);

      // Skip past dates
      if (isBefore(startOfDay(startTime), startOfDay(new Date()))) {
        continue;
      }

      // Check conflict again before creating
      const hasConflict = await checkConflict(data.spaceId, startTime, endTime);
      if (hasConflict) {
        continue;
      }

      const recurrenceNote = data.isRecurring
        ? `[Reserva Recorrente ${successCount + 1}/${count}] `
        : '';

      try {
        await new Promise<void>((resolve, reject) => {
          createBooking.mutate(
            {
              venue_id: currentVenue.id,
              space_id: data.spaceId,
              customer_id: data.customerId || null,
              customer_name: data.customerName,
              customer_email: data.customerEmail || null,
              customer_phone: data.customerPhone || null,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              notes: recurrenceNote + (data.notes || ''),
              status: 'CONFIRMED',
              space_price_per_hour: space?.price_per_hour ?? 0,
            },
            {
              onSuccess: () => resolve(),
              onError: () => reject(),
            }
          );
        });
        successCount++;
      } catch {
        // Continue to next booking even if one fails
      }
    }

    if (successCount > 0) {
      clearDraft(); // Clear draft on successful submission
      onOpenChange(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 p-4 bg-muted/30 border-b border-border">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200',
                    step >= s
                      ? 'bg-primary-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={cn(
                      'w-12 h-1 rounded-full transition-all duration-200',
                      step > s ? 'bg-primary-500' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          <DialogHeader className="px-6 pt-4">
            <DialogTitle>
              {step === 1 && 'Selecionar Cliente'}
              {step === 2 && 'Detalhes da Reserva'}
              {step === 3 && 'Confirmação'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="px-6 py-4 min-h-[350px]">
              {/* Step 1: Customer */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <Label className="mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Cliente
                    </Label>
                    <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-11"
                        >
                          {customerName || 'Buscar cliente...'}
                          <Search className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Digite nome, email ou telefone..."
                            value={customerSearch}
                            onValueChange={setCustomerSearch}
                          />
                          <CommandList>
                            <CommandEmpty>
                              <div className="p-4 text-center">
                                <p className="text-sm text-muted-foreground mb-3">
                                  Nenhum cliente encontrado
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCustomerPopoverOpen(false);
                                    setNewCustomerDialogOpen(true);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Novo Cliente
                                </Button>
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {filteredCustomers.map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  onSelect={() => handleSelectCustomer(customer)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                      <User className="h-4 w-4 text-primary-600" />
                                    </div>
                                    <div>
                                      <div className="font-medium">{customer.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {customer.email || customer.phone || 'Sem contato'}
                                      </div>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {customerName && (
                    <div className="space-y-4 animate-fade-in">
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="flex items-center gap-2 mb-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </Label>
                          <Input
                            placeholder="email@exemplo.com"
                            {...form.register('customerEmail')}
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-2 mb-2">
                            <Phone className="h-4 w-4" />
                            Telefone
                          </Label>
                          <Input
                            placeholder="(00) 00000-0000"
                            {...form.register('customerPhone')}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setNewCustomerDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Novo Cliente
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Booking Details */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  {/* Space selection */}
                  <div>
                    <Label className="mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Espaço
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {spaces.map((space) => {
                        const index = allSpaces.findIndex((s) => s.id === space.id);
                        const colors = getSpaceColor(index);
                        const isSelected = selectedSpaceId === space.id;

                        return (
                          <Card
                            key={space.id}
                            className={cn(
                              'p-3 cursor-pointer transition-all duration-200 border-2',
                              isSelected
                                ? 'border-primary-500 shadow-soft bg-primary-50/50'
                                : 'border-transparent hover:border-muted hover:shadow-soft'
                            )}
                            onClick={() => setValue('spaceId', space.id)}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn('w-3 h-3 rounded-full', colors.dot)} />
                              <span className="font-medium text-sm">{space.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatCurrency(space.price_per_hour ?? 0)}/hora
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                    {errors.spaceId && (
                      <p className="text-sm text-error-500 mt-1">{errors.spaceId.message}</p>
                    )}
                  </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="mb-2 flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Data
                      </Label>
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Selecionar'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              if (date) {
                                setValue('date', date);
                                setDatePickerOpen(false);
                              }
                            }}
                            locale={ptBR}
                            disabled={(date) => isBefore(date, startOfDay(new Date()))}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label className="mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Início
                      </Label>
                      <Select value={startHour} onValueChange={(v) => setValue('startHour', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Hora" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOUR_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Fim
                      </Label>
                      <Select value={endHour} onValueChange={(v) => setValue('endHour', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Hora" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOUR_OPTIONS.filter((opt) => parseInt(opt.value) > parseInt(startHour || '0')).map(
                            (opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label className="mb-2">Observações</Label>
                    <Textarea
                      placeholder="Adicione notas sobre a reserva..."
                      {...form.register('notes')}
                      rows={2}
                    />
                  </div>

                  {/* Recurrence Toggle */}
                  <Card className="p-4 border-dashed">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center">
                          <Repeat className="h-5 w-5 text-accent-600" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Reserva Recorrente</Label>
                          <p className="text-xs text-muted-foreground">
                            Repetir esta reserva automaticamente
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isRecurring || false}
                        onCheckedChange={(checked) => {
                          setValue('isRecurring', checked);
                          if (!checked) {
                            setValue('recurrenceType', undefined);
                            setValue('recurrenceCount', undefined);
                          } else {
                            setValue('recurrenceType', 'weekly');
                            setValue('recurrenceCount', '4');
                          }
                        }}
                      />
                    </div>

                    {isRecurring && (
                      <div className="mt-4 pt-4 border-t border-dashed space-y-4 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="mb-2 text-xs">Frequência</Label>
                            <Select
                              value={recurrenceType}
                              onValueChange={(v) => setValue('recurrenceType', v as 'weekly' | 'monthly')}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {RECURRENCE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="mb-2 text-xs">Repetições</Label>
                            <Select
                              value={recurrenceCount}
                              onValueChange={(v) => setValue('recurrenceCount', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {RECURRENCE_COUNT_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          {recurrenceType === 'weekly' && recurrenceCount && (
                            <>Serão criadas <strong>{recurrenceCount} reservas</strong> (toda {format(selectedDate || new Date(), 'EEEE', { locale: ptBR })})</>
                          )}
                          {recurrenceType === 'monthly' && recurrenceCount && (
                            <>Serão criadas <strong>{recurrenceCount} reservas</strong> (todo dia {format(selectedDate || new Date(), 'd', { locale: ptBR })} do mês)</>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Price preview */}
                  {pricePreview !== null && (
                    <Card className="p-4 bg-success-50 border-success-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-success-700">
                          {isRecurring && recurrenceCount
                            ? `Valor total (${recurrenceCount}x)`
                            : 'Valor estimado'}
                        </span>
                        <span className="text-lg font-semibold text-success-700">
                          {formatCurrency(
                            pricePreview * (isRecurring && recurrenceCount ? parseInt(recurrenceCount) : 1)
                          )}
                        </span>
                      </div>
                      {isRecurring && recurrenceCount && (
                        <div className="text-xs text-success-600 mt-1">
                          {formatCurrency(pricePreview)} por reserva
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              )}

              {/* Step 3: Confirmation */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <Card className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="font-medium">{customerName}</div>
                        <div className="text-sm text-muted-foreground">
                          {watch('customerEmail') || watch('customerPhone') || 'Sem contato'}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Espaço</span>
                        <p className="font-medium">{selectedSpace?.name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data inicial</span>
                        <p className="font-medium">
                          {selectedDate && format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Horário</span>
                        <p className="font-medium">
                          {startHour?.padStart(2, '0')}:00 - {endHour?.padStart(2, '0')}:00
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duração</span>
                        <p className="font-medium">
                          {parseInt(endHour || '0') - parseInt(startHour || '0')} hora(s)
                        </p>
                      </div>
                    </div>

                    {isRecurring && recurrenceType && recurrenceCount && (
                      <>
                        <Separator />
                        <div className="bg-accent-50 rounded-lg p-3 border border-accent-200">
                          <div className="flex items-center gap-2 text-accent-700 mb-2">
                            <Repeat className="h-4 w-4" />
                            <span className="font-medium text-sm">Reserva Recorrente</span>
                          </div>
                          <div className="text-sm text-accent-600">
                            {recurrenceType === 'weekly' && (
                              <>
                                <strong>{recurrenceCount} reservas</strong> semanais
                                (toda {format(selectedDate || new Date(), 'EEEE', { locale: ptBR })})
                              </>
                            )}
                            {recurrenceType === 'monthly' && (
                              <>
                                <strong>{recurrenceCount} reservas</strong> mensais
                                (todo dia {format(selectedDate || new Date(), 'd', { locale: ptBR })})
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {isRecurring && recurrenceCount
                          ? `Total (${recurrenceCount} reservas)`
                          : 'Total'}
                      </span>
                      <span className="text-xl font-bold text-primary-600">
                        {pricePreview !== null
                          ? formatCurrency(
                              pricePreview * (isRecurring && recurrenceCount ? parseInt(recurrenceCount) : 1)
                            )
                          : '-'}
                      </span>
                    </div>
                    {isRecurring && recurrenceCount && pricePreview !== null && (
                      <div className="text-xs text-muted-foreground text-right">
                        {formatCurrency(pricePreview)} por reserva
                      </div>
                    )}
                  </Card>

                  {watch('notes') && (
                    <Card className="p-4">
                      <span className="text-sm text-muted-foreground">Observações</span>
                      <p className="text-sm mt-1">{watch('notes')}</p>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
              <Button
                type="button"
                variant="ghost"
                onClick={() => (step === 1 ? onOpenChange(false) : setStep(step - 1))}
              >
                {step === 1 ? 'Cancelar' : <><ChevronLeft className="h-4 w-4 mr-1" /> Voltar</>}
              </Button>

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 ? !canProceedToStep2 : !canProceedToStep3}
                  className="bg-primary-500 hover:bg-primary-600"
                >
                  Continuar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createBooking.isPending}
                  className="bg-success-600 hover:bg-success-700"
                >
                  {createBooking.isPending ? 'Criando...' : 'Confirmar Reserva'}
                  <Check className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CustomerFormDialog
        open={newCustomerDialogOpen}
        onOpenChange={(open) => {
          setNewCustomerDialogOpen(open);
          if (!open) {
            // Refresh customers list when dialog closes
          }
        }}
        customer={null}
      />
    </>
  );
}

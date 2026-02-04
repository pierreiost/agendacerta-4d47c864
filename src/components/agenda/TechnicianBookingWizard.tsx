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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { useServiceOrders, ServiceOrder } from '@/hooks/useServiceOrders';
import { useVenue } from '@/contexts/VenueContext';
import { useFormPersist } from '@/hooks/useFormPersist';
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format, isBefore, startOfDay, addMinutes, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  User,
  CalendarIcon,
  Clock,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Search,
  Mail,
  Phone,
  FileText,
  Loader2,
} from 'lucide-react';

interface TechnicianBookingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date | null;
}

const DURATION_OPTIONS = [
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hora' },
  { value: '90', label: '1h30' },
  { value: '120', label: '2 horas' },
  { value: '180', label: '3 horas' },
  { value: '240', label: '4 horas' },
];

// Generate time slots for a given date (8:00 - 18:00)
function generateTimeSlots(date: Date, slotInterval: number = 30): { time: string; label: string }[] {
  const slots: { time: string; label: string }[] = [];
  const now = new Date();
  const workStart = 8;
  const workEnd = 18;

  let current = setMinutes(setHours(date, workStart), 0);
  const endOfWork = setMinutes(setHours(date, workEnd), 0);

  while (isBefore(current, endOfWork)) {
    // Skip past times for today
    if (!isBefore(current, now)) {
      slots.push({
        time: current.toISOString(),
        label: format(current, 'HH:mm'),
      });
    }
    current = addMinutes(current, slotInterval);
  }

  return slots;
}

const schema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, 'Nome é obrigatório'),
  customerEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  serviceOrderId: z.string().optional(),
  date: z.date({ required_error: 'Data é obrigatória' }),
  startTime: z.string().min(1, 'Selecione um horário'),
  durationMinutes: z.string().min(1, 'Duração é obrigatória'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function TechnicianBookingWizard({
  open,
  onOpenChange,
  defaultDate,
}: TechnicianBookingWizardProps) {
  const [step, setStep] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { currentVenue } = useVenue();
  const { user } = useAuth();
  const { customers } = useCustomers();
  const { orders: serviceOrders, isLoading: ordersLoading } = useServiceOrders();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const slotInterval = currentVenue?.slot_interval_minutes || 30;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      serviceOrderId: '',
      durationMinutes: '60',
      startTime: '',
      notes: '',
    },
  });

  const { watch, setValue, reset, handleSubmit, formState: { errors } } = form;

  const { clearDraft } = useFormPersist({
    form,
    key: `technician_booking_wizard_${currentVenue?.id || 'default'}`,
    exclude: ['customerId'],
    debounceMs: 300,
    showRecoveryToast: open,
    onRestore: () => {
      const dateValue = form.getValues('date');
      if (dateValue && typeof dateValue === 'string') {
        form.setValue('date', new Date(dateValue));
      }
    },
  });

  const customerName = watch('customerName');
  const serviceOrderId = watch('serviceOrderId');
  const selectedDate = watch('date');
  const startTime = watch('startTime');
  const durationMinutes = watch('durationMinutes');

  // Generate available slots based on selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];
    return generateTimeSlots(selectedDate, slotInterval);
  }, [selectedDate, slotInterval]);

  // Reset when dialog opens
  const initialLoadRef = useRef(true);
  useEffect(() => {
    if (open) {
      setStep(1);
      if (defaultDate && initialLoadRef.current) {
        reset({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          serviceOrderId: '',
          date: defaultDate,
          durationMinutes: '60',
          startTime: '',
          notes: '',
        });
        clearDraft();
      }
      initialLoadRef.current = false;
    } else {
      initialLoadRef.current = true;
    }
  }, [open, defaultDate, reset, clearDraft]);

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

  // Open service orders (not invoiced/cancelled)
  const openServiceOrders = useMemo(() => {
    return serviceOrders.filter(o => 
      o.status_simple === 'open' || 
      (o.status_complete && !['invoiced', 'cancelled'].includes(o.status_complete))
    );
  }, [serviceOrders]);

  const handleSelectCustomer = (customer: Customer) => {
    setValue('customerId', customer.id);
    setValue('customerName', customer.name);
    setValue('customerEmail', customer.email || '');
    setValue('customerPhone', customer.phone || '');
    setCustomerPopoverOpen(false);
    setCustomerSearch('');
  };

  const handleNewCustomerCreated = (customer: Customer) => {
    handleSelectCustomer(customer);
    setNewCustomerDialogOpen(false);
  };

  const handleSelectServiceOrder = (order: ServiceOrder) => {
    setValue('serviceOrderId', order.id);
    setValue('customerId', order.customer_id || undefined);
    setValue('customerName', order.customer_name);
    setValue('customerEmail', order.customer_email || '');
    setValue('customerPhone', order.customer_phone || '');
    setValue('notes', order.description || '');
  };

  const canProceedToStep2 = customerName && customerName.trim().length > 0;
  const canProceedToStep3 = selectedDate && startTime;

  const selectedOrder = useMemo(() => {
    if (!serviceOrderId) return null;
    return serviceOrders.find(o => o.id === serviceOrderId);
  }, [serviceOrderId, serviceOrders]);

  const onSubmit = async (data: FormData) => {
    if (!currentVenue?.id) return;
    
    setIsSubmitting(true);
    try {
      const startDateTime = new Date(data.startTime);
      const endDateTime = addMinutes(startDateTime, parseInt(data.durationMinutes));

      // Get or create a default space for the venue
      const defaultSpaceId = await getOrCreateDefaultSpace();

      const { error } = await supabase.from('bookings').insert({
        venue_id: currentVenue.id,
        space_id: defaultSpaceId,
        customer_name: data.customerName,
        customer_email: data.customerEmail || null,
        customer_phone: data.customerPhone || null,
        customer_id: data.customerId || null,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: 'CONFIRMED',
        booking_type: 'service',
        notes: data.notes || null,
        created_by: user?.id,
        metadata: data.serviceOrderId ? { service_order_id: data.serviceOrderId } : null,
      });

      if (error) throw error;

      toast({ title: 'Agendamento criado com sucesso!' });
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao criar agendamento',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get or create a default space for the venue
  const getOrCreateDefaultSpace = async (): Promise<string> => {
    // Try to get existing active space
    const { data: existingSpace } = await supabase
      .from('spaces')
      .select('id')
      .eq('venue_id', currentVenue?.id || '')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (existingSpace?.id) return existingSpace.id;

    // Create a default space for custom segment
    const { data: newSpace, error } = await supabase
      .from('spaces')
      .insert({
        venue_id: currentVenue?.id || '',
        name: 'Atendimentos',
        is_active: true,
      })
      .select('id')
      .single();

    if (error) throw error;
    return newSpace.id;
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
          {/* Progress indicator - 3 steps now */}
          <div className="flex items-center justify-center gap-2 p-4 bg-muted/30 border-b border-border">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200',
                    step >= s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={cn(
                      'w-8 h-1 rounded-full transition-all duration-200',
                      step > s ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          <DialogHeader className="px-6 pt-4">
            <DialogTitle>
              {step === 1 && 'Cliente e OS'}
              {step === 2 && 'Data e Horário'}
              {step === 3 && 'Confirmação'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="px-6 py-4 min-h-[350px]">
              {/* Step 1: Customer & OS */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  {/* Link to Service Order (optional) */}
                  <div>
                    <Label className="mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Vincular a OS (opcional)
                    </Label>
                    {ordersLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : openServiceOrders.length > 0 ? (
                      <Select
                        value={serviceOrderId || ''}
                        onValueChange={(val) => {
                          if (val === '__none__') {
                            setValue('serviceOrderId', '');
                          } else {
                            const order = serviceOrders.find(o => o.id === val);
                            if (order) handleSelectServiceOrder(order);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma OS..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem OS vinculada</SelectItem>
                          {openServiceOrders.map((order) => (
                            <SelectItem key={order.id} value={order.id}>
                              #{order.order_number} - {order.customer_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma OS em aberto</p>
                    )}
                  </div>

                  <Separator />

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
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <User className="h-4 w-4 text-primary" />
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

                  <div className="pt-2">
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

              {/* Step 2: Date & Time */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-2 flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Data
                      </Label>
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            {selectedDate
                              ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                              : 'Selecionar data'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              if (date) {
                                setValue('date', date);
                                setValue('startTime', ''); // Reset time when date changes
                              }
                              setDatePickerOpen(false);
                            }}
                            disabled={(date) => isBefore(date, startOfDay(new Date()))}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.date && (
                        <p className="text-sm text-destructive mt-1">{errors.date.message}</p>
                      )}
                    </div>

                    <div>
                      <Label className="mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Duração
                      </Label>
                      <Select
                        value={durationMinutes}
                        onValueChange={(val) => setValue('durationMinutes', val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Duração" />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário de Início
                    </Label>
                    {selectedDate ? (
                      availableSlots.length > 0 ? (
                        <ScrollArea className="h-[180px] pr-4">
                          <div className="grid grid-cols-4 gap-2">
                            {availableSlots.map((slot) => {
                              const isSelected = startTime === slot.time;
                              return (
                                <Button
                                  key={slot.time}
                                  type="button"
                                  variant={isSelected ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setValue('startTime', slot.time)}
                                  className={cn(
                                    'h-10',
                                    isSelected && 'ring-2 ring-primary ring-offset-2'
                                  )}
                                >
                                  {slot.label}
                                </Button>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      ) : (
                        <Card className="p-6 text-center">
                          <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">Nenhum horário disponível</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Todos os horários já passaram para esta data
                          </p>
                        </Card>
                      )
                    ) : (
                      <Card className="p-6 text-center">
                        <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Selecione uma data primeiro</p>
                      </Card>
                    )}
                    {errors.startTime && (
                      <p className="text-sm text-destructive mt-1">{errors.startTime.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="mb-2">Observações (opcional)</Label>
                    <Textarea
                      placeholder="Informações adicionais sobre o atendimento..."
                      {...form.register('notes')}
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <Card className="p-4 space-y-3">
                    <h3 className="font-semibold text-lg">Resumo do Agendamento</h3>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-medium">{customerName}</span>
                      </div>
                      
                      {selectedOrder && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">OS:</span>
                          <Badge variant="secondary">
                            #{selectedOrder.order_number}
                          </Badge>
                        </div>
                      )}
                      
                      <Separator />
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data:</span>
                        <span className="font-medium">
                          {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Horário:</span>
                        <span className="font-medium">
                          {startTime && format(new Date(startTime), 'HH:mm')}
                          {' - '}
                          {startTime && format(addMinutes(new Date(startTime), parseInt(durationMinutes)), 'HH:mm')}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duração:</span>
                        <span className="font-medium">
                          {DURATION_OPTIONS.find(o => o.value === durationMinutes)?.label}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {form.watch('notes') && (
                    <Card className="p-4">
                      <h4 className="text-sm font-medium mb-2">Observações</h4>
                      <p className="text-sm text-muted-foreground">{form.watch('notes')}</p>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {/* Footer navigation */}
            <div className="flex items-center justify-between p-4 border-t bg-muted/20">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(s => Math.max(1, s - 1))}
                disabled={step === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  disabled={
                    (step === 1 && !canProceedToStep2) ||
                    (step === 2 && !canProceedToStep3)
                  }
                >
                  Continuar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Confirmar Agendamento
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CustomerFormDialog
        open={newCustomerDialogOpen}
        onOpenChange={setNewCustomerDialogOpen}
        customer={null}
      />
    </>
  );
}

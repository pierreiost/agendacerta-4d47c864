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
import { Checkbox } from '@/components/ui/checkbox';
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
import { useProfessionals } from '@/hooks/useProfessionals';
import { useServiceOrders, ServiceOrder } from '@/hooks/useServiceOrders';
import { useTechnicianAvailability } from '@/hooks/useTechnicianAvailability';
import { useVenue } from '@/contexts/VenueContext';
import { useFormPersist } from '@/hooks/useFormPersist';
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format, isBefore, startOfDay, addMinutes } from 'date-fns';
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
  Wrench,
  FileText,
  Users,
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

const schema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, 'Nome é obrigatório'),
  customerEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  serviceOrderId: z.string().optional(), // Optional link to OS
  technicianIds: z.array(z.string()).min(1, 'Selecione ao menos um técnico'),
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
  const { bookableProfessionals, isLoading: professionalsLoading } = useProfessionals();
  const { orders: serviceOrders, isLoading: ordersLoading } = useServiceOrders();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      serviceOrderId: '',
      technicianIds: [],
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
  });

  const customerName = watch('customerName');
  const serviceOrderId = watch('serviceOrderId');
  const technicianIds = watch('technicianIds');
  const selectedDate = watch('date');
  const startTime = watch('startTime');
  const durationMinutes = parseInt(watch('durationMinutes') || '60');

  // Fetch availability
  const { data: availability, isLoading: availabilityLoading } = useTechnicianAvailability(
    selectedDate || null,
    durationMinutes,
    technicianIds.length > 0 ? technicianIds : undefined
  );

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
          technicianIds: [],
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

  // Clear time when technicians or duration change (only if already has a value)
  const prevTechCountRef = useRef(technicianIds.length);
  const prevDurationRef = useRef(durationMinutes);
  useEffect(() => {
    const techCountChanged = prevTechCountRef.current !== technicianIds.length;
    const durationChanged = prevDurationRef.current !== durationMinutes;
    
    if ((techCountChanged || durationChanged) && startTime) {
      setValue('startTime', '');
    }
    
    prevTechCountRef.current = technicianIds.length;
    prevDurationRef.current = durationMinutes;
  }, [technicianIds.length, durationMinutes, startTime, setValue]);

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

  // Get common available slots for all selected technicians
  const availableSlots = useMemo(() => {
    if (!availability || availability.length === 0 || technicianIds.length === 0) return [];
    
    // For multiple technicians, find common slots
    if (technicianIds.length === 1) {
      const tech = availability.find(a => a.technician_id === technicianIds[0]);
      return tech?.available_slots || [];
    }

    // Get slots available for ALL selected technicians
    const selectedTechs = availability.filter(a => technicianIds.includes(a.technician_id));
    if (selectedTechs.length !== technicianIds.length) return [];

    const firstTechSlots = selectedTechs[0]?.available_slots || [];
    return firstTechSlots.filter(slot =>
      selectedTechs.every(tech => 
        tech.available_slots.some(s => s.time === slot.time)
      )
    );
  }, [availability, technicianIds]);

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

  const handleTechnicianToggle = (techId: string) => {
    const current = technicianIds;
    if (current.includes(techId)) {
      setValue('technicianIds', current.filter(id => id !== techId));
    } else {
      setValue('technicianIds', [...current, techId]);
    }
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
  const canProceedToStep3 = technicianIds.length > 0 && selectedDate;
  const canProceedToStep4 = startTime;

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

      // Create bookings for each technician
      for (const techId of data.technicianIds) {
        const { error } = await supabase.from('bookings').insert({
          venue_id: currentVenue.id,
          space_id: (await getDefaultSpace()) || '', // Need a default space
          professional_id: techId,
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
      }

      toast({ 
        title: 'Agendamento criado!',
        description: data.technicianIds.length > 1 
          ? `${data.technicianIds.length} técnicos agendados`
          : 'Técnico agendado com sucesso'
      });
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

  // Helper to get a default space for the venue (technical appointments still need a space_id)
  const getDefaultSpace = async () => {
    const { data } = await supabase
      .from('spaces')
      .select('id')
      .eq('venue_id', currentVenue?.id || '')
      .eq('is_active', true)
      .limit(1)
      .single();
    return data?.id;
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
            {[1, 2, 3, 4].map((s) => (
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
                {s < 4 && (
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
              {step === 2 && 'Técnicos e Data'}
              {step === 3 && 'Horário'}
              {step === 4 && 'Confirmação'}
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

              {/* Step 2: Technicians & Date */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <Label className="mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Técnicos
                    </Label>
                    {professionalsLoading ? (
                      <div className="space-y-2">
                        {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                      </div>
                    ) : bookableProfessionals.length === 0 ? (
                      <Card className="p-6 text-center">
                        <Wrench className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Nenhum técnico disponível</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Configure técnicos em Equipe → Profissionais
                        </p>
                      </Card>
                    ) : (
                      <ScrollArea className="h-[140px] pr-4">
                        <div className="space-y-2">
                          {bookableProfessionals.map((tech) => {
                            const isSelected = technicianIds.includes(tech.id);
                            const displayName = tech.display_name || tech.profile?.full_name || 'Técnico';
                            return (
                              <Card
                                key={tech.id}
                                className={cn(
                                  'p-3 cursor-pointer transition-all duration-200 border-2',
                                  isSelected
                                    ? 'border-primary bg-primary/5'
                                    : 'border-transparent hover:border-muted-foreground/30'
                                )}
                                onClick={() => handleTechnicianToggle(tech.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox checked={isSelected} className="pointer-events-none" />
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Wrench className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium">{displayName}</div>
                                    {tech.bio && (
                                      <div className="text-xs text-muted-foreground line-clamp-1">
                                        {tech.bio}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                    {errors.technicianIds && (
                      <p className="text-sm text-destructive mt-1">{errors.technicianIds.message}</p>
                    )}
                  </div>

                  <Separator />

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
                              if (date) setValue('date', date);
                              setDatePickerOpen(false);
                            }}
                            disabled={(date) => isBefore(date, startOfDay(new Date()))}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label className="mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Duração
                      </Label>
                      <Select
                        value={watch('durationMinutes')}
                        onValueChange={(val) => setValue('durationMinutes', val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                </div>
              )}

              {/* Step 3: Time Selection */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <Label className="mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horários Disponíveis
                    </Label>
                    {availabilityLoading ? (
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <Card className="p-6 text-center">
                        <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          {technicianIds.length > 1 
                            ? 'Nenhum horário comum disponível para os técnicos selecionados'
                            : 'Nenhum horário disponível para esta data'}
                        </p>
                      </Card>
                    ) : (
                      <ScrollArea className="h-[200px] pr-4">
                        <div className="grid grid-cols-4 gap-2">
                          {availableSlots.map((slot) => (
                            <Button
                              key={slot.time}
                              type="button"
                              variant={startTime === slot.time ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setValue('startTime', slot.time)}
                            >
                              {slot.label}
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <Label className="mb-2">Observações</Label>
                    <Textarea
                      placeholder="Detalhes do serviço, equipamentos necessários, etc."
                      {...form.register('notes')}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Confirmation */}
              {step === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{customerName}</div>
                        <div className="text-sm text-muted-foreground">
                          {watch('customerEmail') || watch('customerPhone') || 'Sem contato'}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {selectedOrder && (
                      <>
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="text-sm text-muted-foreground">Ordem de Serviço</div>
                            <div className="font-medium">#{selectedOrder.order_number}</div>
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Técnicos</div>
                        <div className="font-medium">
                          {technicianIds.map(id => {
                            const tech = bookableProfessionals.find(p => p.id === id);
                            return tech?.display_name || tech?.profile?.full_name || 'Técnico';
                          }).join(', ')}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Data e Horário</div>
                        <div className="font-medium">
                          {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                          {' às '}
                          {startTime && format(new Date(startTime), 'HH:mm')}
                          {' - '}
                          {startTime && format(addMinutes(new Date(startTime), durationMinutes), 'HH:mm')}
                        </div>
                      </div>
                    </div>

                    {watch('notes') && (
                      <>
                        <Separator />
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Observações</div>
                          <div className="text-sm">{watch('notes')}</div>
                        </div>
                      </>
                    )}
                  </Card>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
              <Button
                type="button"
                variant="ghost"
                onClick={() => step > 1 && setStep(step - 1)}
                disabled={step === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>

              {step < 4 ? (
                <Button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && !canProceedToStep2) ||
                    (step === 2 && !canProceedToStep3) ||
                    (step === 3 && !canProceedToStep4)
                  }
                >
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Agendando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Confirmar
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

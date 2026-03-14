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
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { useServices } from '@/hooks/useServices';
import { useProfessionals, useProfessionalAvailability } from '@/hooks/useProfessionals';
import { useVenue } from '@/contexts/VenueContext';
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useCustomerPackages } from '@/hooks/useCustomerPackages';
import { format, isBefore, startOfDay } from 'date-fns';
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
  Heart,
  Scissors,
  Loader2,
  PackageCheck,
} from 'lucide-react';
import type { Service, ProfessionalAvailability } from '@/types/services';
import { getServiceIcon } from '@/lib/segment-utils';

interface ServiceBookingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date | null;
}

const schema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, 'Nome é obrigatório'),
  customerEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  serviceIds: z.array(z.string()).min(1, 'Selecione ao menos um serviço'),
  date: z.date({ required_error: 'Data é obrigatória' }),
  professionalId: z.string().min(1, 'Selecione um profissional'),
  startTime: z.string().min(1, 'Selecione um horário'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function ServiceBookingWizard({
  open,
  onOpenChange,
  defaultDate,
}: ServiceBookingWizardProps) {
  const [step, setStep] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usePackage, setUsePackage] = useState(false);
  // --- Local state for fields that previously caused re-render loops via watch() ---
  const [localServiceIds, setLocalServiceIds] = useState<string[]>([]);
  const [localProfessionalId, setLocalProfessionalId] = useState('');
  const [localStartTime, setLocalStartTime] = useState('');

  const { currentVenue } = useVenue();
  const { customers } = useCustomers();
  const { activeServices, isLoading: servicesLoading } = useServices();
  const { bookableProfessionals, isLoading: professionalsLoading } = useProfessionals();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const venueSegment = (currentVenue as { segment?: string })?.segment;
  const ServiceIcon = getServiceIcon(venueSegment);



  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      serviceIds: [],
      professionalId: '',
      startTime: '',
      notes: '',
    },
  });

  const { watch, setValue, reset, handleSubmit, formState: { errors } } = form;

  // Only watch scalar fields that don't cause reference-instability loops
  const customerName = watch('customerName');
  const selectedDate = watch('date');
  const customerId = watch('customerId');

  // Package detection
  const { activePackages } = useCustomerPackages(customerId);
  const matchedPackage = useMemo(() => {
    if (!activePackages || localServiceIds.length === 0) return null;
    return activePackages.find(pkg =>
      localServiceIds.includes(pkg.service_id) &&
      pkg.used_sessions < pkg.total_sessions &&
      (!pkg.expires_at || new Date(pkg.expires_at) > new Date())
    ) || null;
  }, [activePackages, localServiceIds]);

  // Fetch availability using stable local state (no watch() involved)
  const { data: availability, isLoading: availabilityLoading } = useProfessionalAvailability(
    selectedDate || null,
    localServiceIds,
    localProfessionalId || undefined
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
          serviceIds: [],
          date: defaultDate,
          professionalId: '',
          startTime: '',
          notes: '',
        });
      }
      // Always reset local state when dialog opens
      setLocalServiceIds([]);
      setLocalProfessionalId('');
      setLocalStartTime('');
      setUsePackage(false);
      initialLoadRef.current = false;
    } else {
      initialLoadRef.current = true;
    }
  }, [open, defaultDate, reset]);

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

  // Get selected services data using local state
  const selectedServices = useMemo(() => {
    return activeServices.filter(s => localServiceIds.includes(s.id));
  }, [activeServices, localServiceIds]);

  // Calculate totals
  const { totalDuration, totalPrice } = useMemo(() => {
    return selectedServices.reduce(
      (acc, service) => ({
        totalDuration: acc.totalDuration + service.duration_minutes,
        totalPrice: acc.totalPrice + service.price,
      }),
      { totalDuration: 0, totalPrice: 0 }
    );
  }, [selectedServices]);

  // Filter professionals that offer all selected services
  const availableProfessionals = useMemo(() => {
    if (localServiceIds.length === 0) return [];
    
    return bookableProfessionals.filter(prof => {
      const profServiceIds = prof.services?.map(s => s.id) || [];
      return localServiceIds.every(id => profServiceIds.includes(id));
    });
  }, [bookableProfessionals, localServiceIds]);

  // Get available slots for selected professional
  const availableSlots = useMemo(() => {
    if (!availability || availability.length === 0) return [];
    const prof = availability.find(a => a.professional_id === localProfessionalId);
    const slots = prof?.available_slots || [];
    
    // Filter out past slots when selected date is today
    if (selectedDate) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const selected = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      
      if (selected.getTime() === today.getTime()) {
        return slots.filter(slot => new Date(slot) > now);
      }
    }
    
    return slots;
  }, [availability, localProfessionalId, selectedDate]);

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

  // Handlers update only local state — no form.setValue for these fields during interaction
  const handleServiceToggle = (serviceId: string) => {
    setLocalServiceIds(prev => {
      const updated = prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      return updated;
    });
    // Reset dependent selections
    setLocalProfessionalId('');
    setLocalStartTime('');
  };

  const handleProfessionalSelect = (profId: string) => {
    setLocalProfessionalId(profId);
    setLocalStartTime('');
  };

  const handleTimeSelect = (slot: string) => {
    setLocalStartTime(slot);
  };

  const canProceedToStep2 = customerName && customerName.trim().length > 0;
  const canProceedToStep3 = localServiceIds.length > 0 && selectedDate && localProfessionalId;
  const canProceedToStep4 = localStartTime;

  const onSubmit = async (data: FormData) => {
    if (step !== 4) return; // Guard: only submit on final step
    if (!currentVenue?.id) return;
    
    setIsSubmitting(true);
    try {
      // Use local state values (already synced to form before handleSubmit validation)
      const { data: bookingId, error } = await supabase.rpc('create_service_booking', {
        p_venue_id: currentVenue.id,
        p_professional_id: localProfessionalId,
        p_service_ids: localServiceIds,
        p_start_time: localStartTime,
        p_customer_name: data.customerName,
        p_customer_email: data.customerEmail || '',
        p_customer_phone: data.customerPhone || null,
        p_notes: data.notes || null,
        p_status: 'CONFIRMED',
        p_package_id: usePackage && matchedPackage ? matchedPackage.id : null,
      });

      if (error) throw error;

      toast({ title: 'Agendamento criado com sucesso!' });
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

  // Synchronize local state into form right before submit so zod validation passes
  const handleFormSubmit = () => {
    setValue('serviceIds', localServiceIds);
    setValue('professionalId', localProfessionalId);
    setValue('startTime', localStartTime);
    // Trigger react-hook-form validation + onSubmit
    handleSubmit(onSubmit)();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatSlotTime = (isoTime: string) => {
    return format(new Date(isoTime), 'HH:mm');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 max-h-[92dvh] flex flex-col overflow-hidden" aria-describedby={undefined}>
          {/* Progress indicator */}
          <div className="shrink-0 flex items-center justify-center gap-2 p-4 bg-muted/30 border-b border-border">
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

          <DialogHeader className="shrink-0 px-6 pt-4">
            <DialogTitle>
              {step === 1 && 'Selecionar Cliente'}
              {step === 2 && 'Selecionar Serviços'}
              {step === 3 && 'Escolher Horário'}
              {step === 4 && 'Confirmação'}
            </DialogTitle>
          </DialogHeader>

          {/* Use div instead of form to prevent accidental submit; we call handleFormSubmit manually */}
          <div className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-6 py-4 pb-6 min-h-[250px]">
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

              {/* Step 2: Services */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <Label className="mb-2 flex items-center gap-2">
                      <ServiceIcon className="h-4 w-4" />
                      Serviços
                    </Label>
                    {servicesLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                      </div>
                    ) : activeServices.length === 0 ? (
                      <Card className="p-6 text-center">
                        <p className="text-muted-foreground">Nenhum serviço cadastrado</p>
                      </Card>
                    ) : (
                      <ScrollArea className="h-[250px] pr-4">
                        <div className="space-y-2">
                          {activeServices.map((service) => {
                            const isSelected = localServiceIds.includes(service.id);
                            return (
                              <Card
                                key={service.id}
                                className={cn(
                                  'p-3 cursor-pointer transition-all duration-200 border-2',
                                  isSelected
                                    ? 'border-primary shadow-sm bg-primary/5'
                                    : 'border-transparent hover:border-muted'
                                )}
                                onClick={(e) => {
                                  if ((e.target as HTMLElement).closest('button[role="checkbox"]')) return;
                                  handleServiceToggle(service.id);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Checkbox
                                      checked={isSelected}
                                      tabIndex={-1}
                                      onClick={(e) => e.stopPropagation()}
                                      onCheckedChange={() => handleServiceToggle(service.id)}
                                    />
                                    <div>
                                      <div className="font-medium">{service.title}</div>
                                      <div className="text-xs text-muted-foreground flex gap-2">
                                        <span>{service.duration_minutes} min</span>
                                        <span>•</span>
                                        <span>{formatCurrency(service.price)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                    {errors.serviceIds && (
                      <p className="text-sm text-destructive mt-1">{errors.serviceIds.message}</p>
                    )}
                  </div>

                  {/* Date Selection */}
                  <div>
                    <Label className="mb-2 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Data
                    </Label>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Selecionar data'}
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
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Professional Selection */}
                  {localServiceIds.length > 0 && selectedDate && (
                    <div>
                      <Label className="mb-2 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Profissional
                      </Label>
                      {professionalsLoading ? (
                        <Skeleton className="h-20 w-full" />
                      ) : availableProfessionals.length === 0 ? (
                        <Card className="p-4 text-center bg-muted/50">
                          <p className="text-sm text-muted-foreground">
                            Nenhum profissional disponível para os serviços selecionados
                          </p>
                        </Card>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {availableProfessionals.map((prof) => {
                            const isSelected = localProfessionalId === prof.id;
                            const name = prof.display_name || prof.profile?.full_name || 'Sem nome';
                            return (
                              <Card
                                key={prof.id}
                                className={cn(
                                  'p-3 cursor-pointer transition-all duration-200 border-2',
                                  isSelected
                                    ? 'border-primary shadow-sm bg-primary/5'
                                    : 'border-transparent hover:border-muted'
                                )}
                                onClick={() => handleProfessionalSelect(prof.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <span className="font-medium text-sm truncate">{name}</span>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Package alert */}
                  {matchedPackage && (
                    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                      <PackageCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm text-green-800 dark:text-green-300">
                          Pacote ativo: <strong>{matchedPackage.service_title}</strong>. Restam{' '}
                          {matchedPackage.total_sessions - matchedPackage.used_sessions} de {matchedPackage.total_sessions} sessões.
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Usar pacote?</span>
                          <Switch checked={usePackage} onCheckedChange={setUsePackage} />
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Summary */}
                  {selectedServices.length > 0 && (
                    <Card className="p-3 bg-muted/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {selectedServices.length} serviço(s) • {totalDuration} min
                        </span>
                        <span className="font-semibold">
                          {usePackage && matchedPackage ? (
                            <span className="flex items-center gap-2">
                              <span className="line-through text-muted-foreground">{formatCurrency(totalPrice)}</span>
                              <span className="text-green-600 dark:text-green-400">Cortesia</span>
                            </span>
                          ) : formatCurrency(totalPrice)}
                        </span>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* Step 3: Time Selection */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <Label className="mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário disponível
                    </Label>
                    
                    {availabilityLoading ? (
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                          <Skeleton key={i} className="h-10" />
                        ))}
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <Card className="p-6 text-center bg-muted/50">
                        <p className="text-muted-foreground">
                          Nenhum horário disponível para esta data
                        </p>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {availableSlots.map((slot) => {
                          const isSelected = localStartTime === slot;
                          return (
                            <Button
                              key={slot}
                              type="button"
                              variant={isSelected ? 'default' : 'outline'}
                              className={cn(
                                'h-10',
                                isSelected && 'bg-primary text-primary-foreground'
                              )}
                              onClick={() => handleTimeSelect(slot)}
                            >
                              {formatSlotTime(slot)}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                    {errors.startTime && (
                      <p className="text-sm text-destructive mt-1">{errors.startTime.message}</p>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <Label className="mb-2">Observações</Label>
                    <Textarea
                      placeholder="Adicione notas sobre o agendamento..."
                      {...form.register('notes')}
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Confirmation */}
              {step === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <Card className="p-4 space-y-4">
                    {/* Customer */}
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

                    {/* Services */}
                    <div>
                      <span className="text-sm text-muted-foreground">Serviços</span>
                      <div className="mt-1 space-y-1">
                        {selectedServices.map(service => (
                          <div key={service.id} className="flex justify-between text-sm">
                            <span>{service.title}</span>
                            <span className="text-muted-foreground">{service.duration_minutes} min</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Professional & Time */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Profissional</span>
                        <p className="font-medium">
                          {availableProfessionals.find(p => p.id === localProfessionalId)?.display_name ||
                           availableProfessionals.find(p => p.id === localProfessionalId)?.profile?.full_name || '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data</span>
                        <p className="font-medium">
                          {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Horário</span>
                        <p className="font-medium">{localStartTime && formatSlotTime(localStartTime)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duração</span>
                        <p className="font-medium">{totalDuration} min</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Total */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total</span>
                      {usePackage && matchedPackage ? (
                        <div className="text-right">
                          <span className="line-through text-sm text-muted-foreground mr-2">{formatCurrency(totalPrice)}</span>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <PackageCheck className="h-3 w-3 mr-1" /> Pacote
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xl font-bold text-primary">
                          {formatCurrency(totalPrice)}
                        </span>
                      )}
                    </div>
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
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-between p-4 border-t border-border bg-muted/30">
              <Button
                type="button"
                variant="ghost"
                onClick={() => (step === 1 ? onOpenChange(false) : setStep(step - 1))}
              >
                {step === 1 ? 'Cancelar' : <><ChevronLeft className="h-4 w-4 mr-1" /> Voltar</>}
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
                  Continuar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Criando...</>
                  ) : (
                    <><Check className="h-4 w-4 mr-1" /> Confirmar</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CustomerFormDialog
        open={newCustomerDialogOpen}
        onOpenChange={(open) => {
          setNewCustomerDialogOpen(open);
          if (!open && customers.length > 0) {
            const latestCustomer = customers[customers.length - 1];
            if (latestCustomer && !watch('customerId')) {
              handleSelectCustomer(latestCustomer);
            }
          }
        }}
        customer={null}
      />
    </>
  );
}

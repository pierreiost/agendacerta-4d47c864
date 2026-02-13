import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, ChevronLeft, ChevronRight, Clock, Check, Scissors, User, Clock3 } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ServiceBookingWidgetProps {
  venue: {
    id: string;
    name: string;
    booking_mode: string;
    public_settings: {
      page_title?: string;
      page_instruction?: string;
    } | null;
  };
  whatsappPhone?: string | null;
}

interface PublicService {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  cover_image_url: string | null;
}

interface Professional {
  member_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface AvailableSlot {
  slot_start: string;
  professional_id: string;
  professional_name: string;
}

const MAX_SERVICES = 5;

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ServiceBookingWidget({ venue, whatsappPhone }: ServiceBookingWidgetProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['public-services', venue.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_services_by_venue', { p_venue_id: venue.id });
      if (error) throw error;
      return (data || []) as PublicService[];
    },
  });

  // Fetch professionals when services are selected
  const { data: professionals = [], isLoading: professionalsLoading } = useQuery({
    queryKey: ['public-professionals', venue.id, selectedServiceIds],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_venue_professionals', {
        p_venue_id: venue.id,
        p_service_ids: selectedServiceIds,
      });
      if (error) throw error;
      return (data || []) as Professional[];
    },
    enabled: selectedServiceIds.length > 0 && step >= 3,
  });

  // Compute totals
  const selectedServices = useMemo(
    () => services.filter(s => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );
  const totalPrice = useMemo(() => selectedServices.reduce((sum, s) => sum + s.price, 0), [selectedServices]);
  const totalDuration = useMemo(() => selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0), [selectedServices]);

  // Determine active professional for availability query
  const activeProfessionalId = useMemo(() => {
    if (professionals.length === 1) return professionals[0].member_id;
    return selectedProfessionalId;
  }, [professionals, selectedProfessionalId]);

  // Fetch availability
  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['public-availability', venue.id, selectedDate?.toISOString(), totalDuration, activeProfessionalId],
    queryFn: async () => {
      if (!selectedDate) return [];
      const { data, error } = await supabase.rpc('get_professional_availability_public', {
        p_venue_id: venue.id,
        p_date: format(selectedDate, 'yyyy-MM-dd'),
        p_total_duration_minutes: totalDuration,
        ...(activeProfessionalId ? { p_professional_id: activeProfessionalId } : {}),
      });
      if (error) throw error;
      return (data || []) as AvailableSlot[];
    },
    enabled: step >= 3 && totalDuration > 0 && !!selectedDate,
  });

  // Reset downstream state when services change
  useEffect(() => {
    setSelectedProfessionalId(null);
    setSelectedSlot(null);
    if (step > 2) setStep(2);
  }, [selectedServiceIds.join(',')]);

  // Reset slot when date changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate]);

  // Reset slot when professional changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedProfessionalId]);

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot || !activeProfessionalId) throw new Error('Selecione horário e profissional');

      const { data, error } = await supabase.rpc('create_service_booking', {
        p_venue_id: venue.id,
        p_professional_id: activeProfessionalId,
        p_service_ids: selectedServiceIds,
        p_start_time: selectedSlot,
        p_customer_name: customerName,
        p_customer_email: customerEmail || 'sem-email@agendamento.local',
        p_customer_phone: customerPhone || undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setStep(5);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao agendar', description: error.message, variant: 'destructive' });
    },
  });

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id);
      if (prev.length >= MAX_SERVICES) {
        toast({ title: `Máximo de ${MAX_SERVICES} serviços`, variant: 'destructive' });
        return prev;
      }
      return [...prev, id];
    });
  };

  const skipProfessionalSelection = professionals.length <= 1;

  // Determine selected professional name for summary
  const selectedProfessionalName = useMemo(() => {
    const pro = professionals.find(p => p.member_id === activeProfessionalId);
    return pro?.display_name || '';
  }, [professionals, activeProfessionalId]);

  // ─── STEP 1: Service Selection ─────────────────────────────
  if (step === 1) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {venue.public_settings?.page_title || 'Nossos Serviços'}
          </h2>
          {venue.public_settings?.page_instruction && (
            <p className="text-sm text-muted-foreground mt-1">{venue.public_settings.page_instruction}</p>
          )}
        </div>

        {servicesLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : services.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum serviço disponível.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map(service => {
              const isSelected = selectedServiceIds.includes(service.id);
              return (
                <Card
                  key={service.id}
                  className={cn(
                    'overflow-hidden cursor-pointer transition-all duration-200 border-2',
                    isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-muted-foreground/20'
                  )}
                  onClick={() => toggleService(service.id)}
                >
                  {/* Cover image */}
                  <div className="aspect-[4/3] relative bg-muted">
                    {service.cover_image_url ? (
                      <img
                        src={service.cover_image_url}
                        alt={service.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <Scissors className="h-10 w-10 text-primary/30" />
                      </div>
                    )}
                    {/* Selection checkbox overlay */}
                    <div className="absolute top-2 right-2">
                      <div className={cn(
                        'h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all',
                        isSelected ? 'bg-primary border-primary' : 'bg-white/80 border-muted-foreground/30'
                      )}>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-foreground leading-tight">{service.title}</h3>
                    {service.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-primary">{formatPrice(service.price)}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(service.duration_minutes)}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Sticky summary bar */}
        {selectedServiceIds.length > 0 && (
          <div className="sticky bottom-0 bg-background border-t pt-3 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedServiceIds.length}</span> serviço{selectedServiceIds.length > 1 ? 's' : ''} · {formatPrice(totalPrice)} · {formatDuration(totalDuration)}
              </div>
            </div>
            <Button className="w-full" size="lg" onClick={() => setStep(2)}>
              Continuar
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── STEP 2: Date Selection ────────────────────────────────
  if (step === 2) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold text-foreground">Escolha a data</h2>
        </div>

        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={{ before: new Date() }}
            locale={ptBR}
            className="rounded-md border pointer-events-auto"
          />
        </div>

        <Button className="w-full" size="lg" onClick={() => setStep(3)} disabled={!selectedDate}>
          Continuar
        </Button>
      </div>
    );
  }

  // ─── STEP 3: Professional + Time ───────────────────────────
  if (step === 3) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setStep(2)} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold text-foreground">
            {skipProfessionalSelection ? 'Horários disponíveis' : 'Profissional e horário'}
          </h2>
        </div>

        <p className="text-sm text-muted-foreground">
          {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR }) : ''} · {formatDuration(totalDuration)}
        </p>

        {professionalsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Professional selection (only when 2+) */}
            {!skipProfessionalSelection && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Escolha o profissional:</p>
                <div className="grid grid-cols-1 gap-2">
                  {professionals.map(pro => (
                    <Card
                      key={pro.member_id}
                      className={cn(
                        'p-3 cursor-pointer transition-all border-2',
                        selectedProfessionalId === pro.member_id
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-transparent hover:border-muted-foreground/20'
                      )}
                      onClick={() => setSelectedProfessionalId(pro.member_id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {pro.avatar_url ? (
                            <img src={pro.avatar_url} alt={pro.display_name} className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{pro.display_name}</p>
                          {pro.bio && <p className="text-xs text-muted-foreground line-clamp-1">{pro.bio}</p>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Time slots */}
            {(skipProfessionalSelection || selectedProfessionalId) && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Horários:</p>
                {slotsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum horário disponível nesta data.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((slot, idx) => {
                      const time = new Date(slot.slot_start);
                      const timeStr = format(time, 'HH:mm');
                      const isSelected = selectedSlot === slot.slot_start;
                      return (
                        <button
                          key={`${slot.slot_start}-${slot.professional_id}-${idx}`}
                          onClick={() => {
                            setSelectedSlot(slot.slot_start);
                            if (skipProfessionalSelection && !selectedProfessionalId) {
                              setSelectedProfessionalId(slot.professional_id);
                            }
                          }}
                          className={cn(
                            'py-2.5 px-3 rounded-lg text-sm font-medium transition-all border',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-md'
                              : 'bg-background border-border hover:border-primary/50 text-foreground'
                          )}
                        >
                          {timeStr}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {selectedSlot && (
          <Button className="w-full" size="lg" onClick={() => setStep(4)}>
            Continuar
          </Button>
        )}
      </div>
    );
  }

  // ─── STEP 5: Success Screen ─────────────────────────────────
  if (step === 5) {
    const bookedDateStr = selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: ptBR }) : '';
    const bookedTimeStr = selectedSlot ? format(new Date(selectedSlot), 'HH:mm') : '';

    const cleanPhone = whatsappPhone?.replace(/\D/g, '') || '';
    const hasWhatsApp = cleanPhone.length >= 8;
    const whatsAppMessage = encodeURIComponent(
      `Olá! Acabei de solicitar um agendamento para ${bookedDateStr} às ${bookedTimeStr}. Aguardo a confirmação!`
    );

    return (
      <div className="p-4 sm:p-6 flex flex-col items-center text-center space-y-4 py-10">
        <div className="h-16 w-16 rounded-full bg-warning/20 flex items-center justify-center">
          <Clock3 className="h-8 w-8 text-warning" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Pedido Realizado!</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Recebemos sua solicitação para <strong>{bookedDateStr}</strong> às <strong>{bookedTimeStr}</strong>.
          O estabelecimento irá confirmar sua disponibilidade em breve.
        </p>
        <p className="text-xs text-muted-foreground">
          Fique atento ao seu WhatsApp/E-mail para a confirmação.
        </p>

        {hasWhatsApp && (
          <a
            href={`https://wa.me/${cleanPhone}?text=${whatsAppMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#128C7E] text-white px-6 py-2.5 text-sm font-medium transition-colors w-full max-w-xs"
          >
            📱 Enviar Comprovante via WhatsApp
          </a>
        )}

        <Button
          variant="outline"
          className="mt-2"
          onClick={() => {
            setStep(1);
            setSelectedServiceIds([]);
            setSelectedSlot(null);
            setSelectedProfessionalId(null);
            setCustomerName('');
            setCustomerEmail('');
            setCustomerPhone('');
          }}
        >
          Fazer novo agendamento
        </Button>
      </div>
    );
  }

  // ─── STEP 4: Customer Data + Confirmation ──────────────────
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setStep(3)} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-bold text-foreground">Seus dados</h2>
      </div>

      {/* Summary */}
      <Card className="p-4 bg-muted/50 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {selectedServices.map(s => (
            <Badge key={s.id} variant="secondary" className="text-xs">{s.title}</Badge>
          ))}
        </div>
        <div className="text-sm text-muted-foreground space-y-0.5">
          <p>📅 {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
          <p>🕐 {selectedSlot ? format(new Date(selectedSlot), 'HH:mm') : ''} · {formatDuration(totalDuration)}</p>
          {selectedProfessionalName && <p>👤 {selectedProfessionalName}</p>}
          <p className="font-semibold text-foreground">Total: {formatPrice(totalPrice)}</p>
        </div>
      </Card>

      {/* Form */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-foreground">Nome *</label>
          <Input
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Seu nome completo"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Telefone *</label>
          <Input
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
            placeholder="(99) 99999-9999"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">E-mail</label>
          <Input
            type="email"
            value={customerEmail}
            onChange={e => setCustomerEmail(e.target.value)}
            placeholder="seu@email.com (opcional)"
            className="mt-1"
          />
        </div>
      </div>

      <Button
        className="w-full"
        size="lg"
        disabled={!customerName || customerPhone.replace(/\D/g, '').length < 8 || bookingMutation.isPending}
        onClick={() => bookingMutation.mutate()}
      >
        {bookingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Confirmar Agendamento
      </Button>
    </div>
  );
}

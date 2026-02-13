import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  ImagePlus,
  X,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { format, startOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PublicVenue {
  id: string;
  name: string;
  slug: string;
  booking_mode: 'calendar' | 'inquiry' | 'external_link';
  public_settings: {
    external_link_url?: string;
    inquiry_notification_email?: string;
    page_title?: string;
    page_instruction?: string;
  } | null;
  logo_url: string | null;
  primary_color: string | null;
}

interface PublicSpace {
  id: string;
  name: string;
  description: string | null;
  price_per_hour: number | null;
  capacity: number | null;
}

interface BookedSlot {
  start_time: string;
  end_time: string;
}

interface BookingWidgetProps {
  venue: PublicVenue;
}

const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 8;
  return {
    start: `${hour.toString().padStart(2, '0')}:00`,
    end: `${(hour + 1).toString().padStart(2, '0')}:00`,
    label: `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`,
  };
});

// Constantes de segurança para uploads
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: `Tipo de arquivo não permitido: ${file.type.split('/')[1] || 'desconhecido'}. Use JPG, PNG, GIF ou WebP.` };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo: ${MAX_FILE_SIZE_MB}MB.` };
  }
  return { valid: true };
};

export function BookingWidget({ venue }: BookingWidgetProps) {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calendar mode state
  const [calendarStep, setCalendarStep] = useState<'space' | 'datetime' | 'info'>('space');
  const [selectedSpace, setSelectedSpace] = useState<PublicSpace | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    problem_description: '',
    notes: '',
  });

  const { data: spaces, isLoading: spacesLoading } = useQuery({
    queryKey: ['public-spaces', venue?.id],
    queryFn: async () => {
      if (!venue?.id) return [];
      const { data, error } = await supabase.rpc('get_public_spaces_by_venue', { p_venue_id: venue.id });
      if (error) throw error;
      return (data || []) as PublicSpace[];
    },
    enabled: !!venue?.id && venue.booking_mode === 'calendar',
  });

  const { data: bookedSlots } = useQuery({
    queryKey: ['booked-slots', venue?.id, selectedSpace?.id, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''],
    queryFn: async () => {
      if (!venue?.id || !selectedSpace?.id || !selectedDate) return [];
      const { data, error } = await supabase.rpc('get_space_bookings_for_date', {
        p_venue_id: venue.id,
        p_space_id: selectedSpace.id,
        p_date: format(selectedDate, 'yyyy-MM-dd'),
      });
      if (error) throw error;
      return (data || []) as BookedSlot[];
    },
    enabled: !!venue?.id && !!selectedSpace?.id && !!selectedDate && venue.booking_mode === 'calendar',
  });

  useEffect(() => {
    return () => {
      photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    };
  }, []);

  const isSlotBooked = (slotStart: string) => {
    if (!bookedSlots || !selectedDate) return false;
    const slotStartTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${slotStart}:00`);
    const slotEndTime = new Date(slotStartTime.getTime() + 60 * 60 * 1000);
    return bookedSlots.some(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      return slotStartTime < bookingEnd && slotEndTime > bookingStart;
    });
  };

  const isSlotPast = (slotStart: string) => {
    if (!selectedDate || !isToday(selectedDate)) return false;
    const now = new Date();
    const [hours] = slotStart.split(':').map(Number);
    return hours <= now.getHours();
  };

  const toggleSlot = (slotStart: string) => {
    setSelectedSlots(prev => {
      if (prev.includes(slotStart)) {
        return prev.filter(s => s !== slotStart);
      }
      return [...prev, slotStart].sort();
    });
  };

  const getBookingTimeRange = () => {
    if (selectedSlots.length === 0) return null;
    const sortedSlots = [...selectedSlots].sort();
    const firstSlot = sortedSlots[0];
    const lastSlot = sortedSlots[sortedSlots.length - 1];
    const [lastHour] = lastSlot.split(':').map(Number);
    return {
      start: firstSlot,
      end: `${(lastHour + 1).toString().padStart(2, '0')}:00`,
      hours: selectedSlots.length,
    };
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles: { file: File; preview: string }[] = [];
    const errors: string[] = [];

    Array.from(files).slice(0, 5 - photos.length).forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push({
          file,
          preview: URL.createObjectURL(file),
        });
      } else {
        errors.push(validation.error!);
      }
    });

    if (errors.length > 0) {
      toast({
        title: 'Alguns arquivos foram rejeitados',
        description: errors.join(' '),
        variant: 'destructive',
      });
    }

    if (validFiles.length > 0) {
      setPhotos(prev => [...prev, ...validFiles].slice(0, 5));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const photo = prev[index];
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (photos.length === 0) return [];
    const uploadedUrls: string[] = [];

    const MIME_TO_EXT: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };

    for (const photo of photos) {
      const validation = validateFile(photo.file);
      if (!validation.valid) {
        console.warn('Arquivo rejeitado no upload:', validation.error);
        continue;
      }

      const fileExt = MIME_TO_EXT[photo.file.type] || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${venue?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('inquiry-photos').upload(filePath, photo.file, {
        contentType: photo.file.type,
        cacheControl: '3600',
      });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from('inquiry-photos').getPublicUrl(filePath);
      uploadedUrls.push(publicUrl);
    }
    return uploadedUrls;
  };

  const createInquiry = useMutation({
    mutationFn: async () => {
      if (!venue?.id) throw new Error('Dados incompletos');
      setUploadingPhotos(true);
      let photoUrls: string[] = [];
      try {
        photoUrls = await uploadPhotos();
      } catch (err) {
        console.error('Error uploading photos:', err);
      } finally {
        setUploadingPhotos(false);
      }
      const { data, error } = await supabase.rpc('create_service_inquiry', {
        p_venue_id: venue.id,
        p_customer_name: formData.customer_name,
        p_customer_email: formData.customer_email,
        p_customer_phone: formData.customer_phone || null,
        p_problem_description: formData.problem_description || null,
        p_photo_urls: photoUrls,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: 'Solicitação enviada!', description: 'Entraremos em contato em breve.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao enviar solicitação', description: error.message, variant: 'destructive' });
    },
  });

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!venue?.id || !selectedSpace?.id || !selectedDate) throw new Error('Dados incompletos');
      const timeRange = getBookingTimeRange();
      if (!timeRange) throw new Error('Selecione um horário');

      const startDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${timeRange.start}:00`);
      const endDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${timeRange.end}:00`);

      const { data, error } = await supabase.rpc('create_public_booking', {
        p_venue_id: venue.id,
        p_space_id: selectedSpace.id,
        p_customer_name: formData.customer_name,
        p_customer_email: formData.customer_email,
        p_customer_phone: formData.customer_phone || null,
        p_start_time: startDateTime.toISOString(),
        p_end_time: endDateTime.toISOString(),
        p_notes: formData.notes || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: 'Reserva solicitada!', description: 'Aguarde a confirmação.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao reservar', description: error.message, variant: 'destructive' });
    },
  });

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInquiry.mutate();
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBooking.mutate();
  };

  const resetCalendar = () => {
    setCalendarStep('space');
    setSelectedSpace(null);
    setSelectedDate(startOfDay(new Date()));
    setSelectedSlots([]);
    setFormData({ customer_name: '', customer_email: '', customer_phone: '', problem_description: '', notes: '' });
  };

  const weekDays: Date[] = []; // no longer used

  // Success state
  if (submitted) {
    return (
      <div className="p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-2xl bg-green-100 p-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-3">
          {venue.booking_mode === 'calendar' ? 'Reserva Solicitada!' : 'Solicitação Enviada!'}
        </h3>
        <p className="text-muted-foreground mb-8 text-base">
          {venue.booking_mode === 'calendar'
            ? 'Sua reserva foi recebida e está aguardando confirmação.'
            : 'Sua solicitação foi recebida. Entraremos em contato em breve.'}
        </p>
        <Button
          variant="outline"
          size="lg"
          className="rounded-xl"
          onClick={() => { setSubmitted(false); resetCalendar(); }}
        >
          Fazer nova solicitação
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="p-6 pb-5 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/15">
            <CalendarIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {venue.booking_mode === 'calendar' ? 'Agendar Horário' : 'Solicitar Orçamento'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {venue.public_settings?.page_instruction || 'Preencha os dados abaixo'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {venue.booking_mode === 'calendar' ? (
          <>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 text-sm mb-6">
              <div className={cn("flex items-center gap-1", calendarStep === 'space' ? 'text-primary font-medium' : 'text-muted-foreground')}>
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs", calendarStep === 'space' ? 'bg-primary text-white' : 'bg-muted')}>1</div>
                <span className="hidden sm:inline">Espaço</span>
              </div>
              <div className="w-6 h-px bg-muted" />
              <div className={cn("flex items-center gap-1", calendarStep === 'datetime' ? 'text-primary font-medium' : 'text-muted-foreground')}>
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs", calendarStep === 'datetime' ? 'bg-primary text-white' : 'bg-muted')}>2</div>
                <span className="hidden sm:inline">Data/Hora</span>
              </div>
              <div className="w-6 h-px bg-muted" />
              <div className={cn("flex items-center gap-1", calendarStep === 'info' ? 'text-primary font-medium' : 'text-muted-foreground')}>
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs", calendarStep === 'info' ? 'bg-primary text-white' : 'bg-muted')}>3</div>
                <span className="hidden sm:inline">Dados</span>
              </div>
            </div>

            {/* Step 1: Space selection */}
            {calendarStep === 'space' && (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  Selecione o espaço
                </h3>
                {spacesLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : spaces && spaces.length > 0 ? (
                  <div className="space-y-3">
                    {spaces.map((space) => (
                      <button
                        key={space.id}
                        type="button"
                        onClick={() => { setSelectedSpace(space); setCalendarStep('datetime'); }}
                        className={cn(
                          "w-full p-5 text-left rounded-xl border-2 transition-all duration-200",
                          "hover:border-primary hover:bg-primary/5 hover:shadow-md",
                          "active:scale-[0.98]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-semibold text-base">{space.name}</div>
                            {space.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{space.description}</p>
                            )}
                            {space.capacity && (
                              <p className="text-xs text-muted-foreground mt-2">Capacidade: {space.capacity} pessoas</p>
                            )}
                          </div>
                          {space.price_per_hour && (
                            <div className="text-right flex-shrink-0">
                              <div className="text-xl font-bold text-primary">
                                R$ {space.price_per_hour.toFixed(0)}
                              </div>
                              <div className="text-xs text-muted-foreground">/hora</div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum espaço disponível no momento.
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Date/Time selection */}
            {calendarStep === 'datetime' && selectedSpace && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => setCalendarStep('space')}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Voltar
                  </Button>
                  <span className="text-sm font-medium">{selectedSpace.name}</span>
                </div>

                {/* Monthly calendar */}
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => { setSelectedDate(date); setSelectedSlots([]); }}
                    disabled={{ before: new Date() }}
                    locale={ptBR}
                    className="rounded-md border pointer-events-auto"
                  />
                </div>

                {/* Time slots */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Selecione o horário
                  </h4>
                  <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                    {TIME_SLOTS.map((slot) => {
                      const booked = isSlotBooked(slot.start);
                      const past = isSlotPast(slot.start);
                      const selected = selectedSlots.includes(slot.start);
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          disabled={booked || past}
                          onClick={() => toggleSlot(slot.start)}
                          className={cn(
                            "py-3 px-3 rounded-xl text-sm font-medium border-2 transition-all duration-200",
                            selected && "bg-primary text-white border-primary shadow-md",
                            !selected && !booked && !past && "hover:border-primary hover:bg-primary/5",
                            (booked || past) && "opacity-40 cursor-not-allowed bg-muted border-transparent"
                          )}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedSlots.length > 0 && (
                  <Button
                    size="lg"
                    className="w-full rounded-xl font-semibold h-12"
                    onClick={() => setCalendarStep('info')}
                  >
                    Continuar ({selectedSlots.length}h)
                  </Button>
                )}
              </div>
            )}

            {/* Step 3: Customer info */}
            {calendarStep === 'info' && (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => setCalendarStep('datetime')}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>

                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium">{selectedSpace?.name}</p>
                  <p className="text-muted-foreground">
                    {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: ptBR }) : ''} • {getBookingTimeRange()?.start} às {getBookingTimeRange()?.end}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name" className="text-sm">Nome completo *</Label>
                    <Input
                      id="name"
                      value={formData.customer_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                      required
                      minLength={2}
                      maxLength={200}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm">Telefone *</Label>
                    <Input
                      id="phone"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                      required
                      maxLength={20}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                      maxLength={254}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-sm">Observações</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      maxLength={1000}
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-xl font-semibold h-12"
                  disabled={createBooking.isPending}
                >
                  {createBooking.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Solicitar Reserva
                </Button>
              </form>
            )}
          </>
        ) : (
          // Inquiry mode form
          <form onSubmit={handleInquirySubmit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="name" className="text-sm">Nome completo *</Label>
                <Input
                  id="name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  required
                  minLength={2}
                  maxLength={200}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  required
                  maxLength={20}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                  maxLength={254}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="problem" className="text-sm">Descrição do problema/serviço</Label>
                <Textarea
                  id="problem"
                  value={formData.problem_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, problem_description: e.target.value }))}
                  rows={3}
                  maxLength={5000}
                  className="mt-1"
                />
              </div>

              {/* Photo upload */}
              <div>
                <Label className="text-sm">Fotos (opcional - máx. 5)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative">
                      <img src={photo.preview} alt="" className="h-14 w-14 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <label className="h-14 w-14 flex items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                        multiple
                        className="hidden"
                        onChange={handlePhotoSelect}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-xl font-semibold h-12"
              disabled={createInquiry.isPending || uploadingPhotos}
            >
              {(createInquiry.isPending || uploadingPhotos) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar Solicitação
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

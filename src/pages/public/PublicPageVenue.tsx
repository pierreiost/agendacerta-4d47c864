import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, ExternalLink, Mail, Phone, User, CheckCircle2, FileText, ImagePlus, X, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay, isToday, isBefore } from 'date-fns';
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

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Generate time slots from 8:00 to 22:00
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 8;
  return {
    start: `${hour.toString().padStart(2, '0')}:00`,
    end: `${(hour + 1).toString().padStart(2, '0')}:00`,
    label: `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`,
  };
});

export default function PublicPageVenue() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calendar mode state
  const [calendarStep, setCalendarStep] = useState<'space' | 'datetime' | 'info'>('space');
  const [selectedSpace, setSelectedSpace] = useState<PublicSpace | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(startOfDay(new Date()));

  // Form state for inquiry mode
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    problem_description: '',
    notes: '',
  });

  // Fetch venue by slug
  const { data: venue, isLoading: venueLoading, error: venueError } = useQuery({
    queryKey: ['public-venue', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase.rpc('get_public_venue_by_slug', { p_slug: slug });
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[0] as PublicVenue;
    },
    enabled: !!slug,
  });

  // Fetch spaces for calendar mode
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

  // Fetch booked slots for selected date and space
  const { data: bookedSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['booked-slots', venue?.id, selectedSpace?.id, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!venue?.id || !selectedSpace?.id) return [];
      const { data, error } = await supabase.rpc('get_space_bookings_for_date', {
        p_venue_id: venue.id,
        p_space_id: selectedSpace.id,
        p_date: format(selectedDate, 'yyyy-MM-dd'),
      });
      if (error) throw error;
      return (data || []) as BookedSlot[];
    },
    enabled: !!venue?.id && !!selectedSpace?.id && venue.booking_mode === 'calendar',
  });

  // Apply theme colors
  useEffect(() => {
    if (venue?.primary_color) {
      const hsl = hexToHsl(venue.primary_color);
      if (hsl) {
        document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      }
    }
    return () => {
      document.documentElement.style.removeProperty('--primary');
    };
  }, [venue?.primary_color]);

  // Cleanup photo previews on unmount
  useEffect(() => {
    return () => {
      photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    };
  }, []);

  // Check if a time slot is booked
  const isSlotBooked = (slotStart: string) => {
    if (!bookedSlots) return false;
    const slotStartTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${slotStart}:00`);
    const slotEndTime = new Date(slotStartTime.getTime() + 60 * 60 * 1000);

    return bookedSlots.some(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      return slotStartTime < bookingEnd && slotEndTime > bookingStart;
    });
  };

  // Check if slot is in the past
  const isSlotPast = (slotStart: string) => {
    if (!isToday(selectedDate)) return false;
    const now = new Date();
    const [hours] = slotStart.split(':').map(Number);
    return hours <= now.getHours();
  };

  // Toggle slot selection
  const toggleSlot = (slotStart: string) => {
    setSelectedSlots(prev => {
      if (prev.includes(slotStart)) {
        return prev.filter(s => s !== slotStart);
      }
      // Allow selecting multiple consecutive slots
      return [...prev, slotStart].sort();
    });
  };

  // Get consecutive slots info
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

    // Mapeamento de MIME type para extensão segura
    const MIME_TO_EXT: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };

    for (const photo of photos) {
      // Validação final antes do upload (double-check)
      const validation = validateFile(photo.file);
      if (!validation.valid) {
        console.warn('Arquivo rejeitado no upload:', validation.error);
        continue;
      }

      // Usar extensão baseada no MIME type (mais seguro que confiar na extensão do nome)
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

  // Create inquiry mutation (for inquiry mode)
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

  // Create booking mutation (for calendar mode)
  const createBooking = useMutation({
    mutationFn: async () => {
      if (!venue?.id || !selectedSpace?.id) throw new Error('Dados incompletos');
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

  // Loading state
  if (venueLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not found state
  if (!venue || venueError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Página não encontrada</CardTitle>
            <CardDescription>Esta página pública não existe ou não está disponível.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Função para validar URL segura (prevenir javascript:, data:, etc.)
  const isSafeUrl = (url: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase().trim();
    // Rejeitar URLs perigosas
    if (lowerUrl.startsWith('javascript:') ||
        lowerUrl.startsWith('data:') ||
        lowerUrl.startsWith('vbscript:') ||
        lowerUrl.startsWith('file:')) {
      return false;
    }
    // Aceitar apenas http e https
    return lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://');
  };

  // External link redirect mode
  if (venue.booking_mode === 'external_link') {
    const externalUrl = venue.public_settings?.external_link_url;
    const safeUrl = externalUrl && isSafeUrl(externalUrl) ? externalUrl : null;

    if (safeUrl) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center shadow-lg">
            <CardHeader className="space-y-4">
              {venue.logo_url && (
                <div className="flex justify-center">
                  <img src={venue.logo_url} alt={venue.name} className="h-16 w-auto object-contain" />
                </div>
              )}
              <CardTitle>{venue.name}</CardTitle>
              <CardDescription>Você será redirecionado para nosso sistema de agendamento.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="lg">
                <a href={safeUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Acessar Agendamento
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Calendar mode
  if (venue.booking_mode === 'calendar') {
    // Success state for calendar booking
    if (submitted) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center shadow-lg">
            <CardHeader className="space-y-4">
              {venue.logo_url && (
                <div className="flex justify-center">
                  <img src={venue.logo_url} alt={venue.name} className="h-16 w-auto object-contain" />
                </div>
              )}
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle>Reserva Solicitada!</CardTitle>
              <CardDescription>
                Sua reserva foi recebida e está aguardando confirmação. Você receberá um email quando for confirmada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => { setSubmitted(false); resetCalendar(); }}>
                Fazer nova reserva
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="min-h-screen bg-slate-50 py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center space-y-4 pb-4">
              {venue.logo_url && (
                <div className="flex justify-center">
                  <img src={venue.logo_url} alt={venue.name} className="h-12 w-auto object-contain" />
                </div>
              )}
              <div>
                <CardTitle className="text-xl">{venue.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Agende seu horário online</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className={cn("flex items-center gap-1", calendarStep === 'space' ? 'text-primary font-medium' : 'text-muted-foreground')}>
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs", calendarStep === 'space' ? 'bg-primary text-white' : 'bg-muted')}>1</div>
                  <span className="hidden sm:inline">Espaço</span>
                </div>
                <div className="w-8 h-px bg-muted" />
                <div className={cn("flex items-center gap-1", calendarStep === 'datetime' ? 'text-primary font-medium' : 'text-muted-foreground')}>
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs", calendarStep === 'datetime' ? 'bg-primary text-white' : 'bg-muted')}>2</div>
                  <span className="hidden sm:inline">Data/Hora</span>
                </div>
                <div className="w-8 h-px bg-muted" />
                <div className={cn("flex items-center gap-1", calendarStep === 'info' ? 'text-primary font-medium' : 'text-muted-foreground')}>
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs", calendarStep === 'info' ? 'bg-primary text-white' : 'bg-muted')}>3</div>
                  <span className="hidden sm:inline">Seus dados</span>
                </div>
              </div>

              {/* Step 1: Space selection */}
              {calendarStep === 'space' && (
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Selecione o espaço
                  </h3>
                  {spacesLoading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {spaces?.map((space) => (
                        <button
                          key={space.id}
                          onClick={() => { setSelectedSpace(space); setCalendarStep('datetime'); }}
                          className="w-full p-4 text-left border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          <div className="font-medium">{space.name}</div>
                          {space.description && (
                            <div className="text-sm text-muted-foreground mt-1">{space.description}</div>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {space.price_per_hour && (
                              <span>R$ {space.price_per_hour.toFixed(2)}/hora</span>
                            )}
                            {space.capacity && (
                              <span>Até {space.capacity} pessoas</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Date and time selection */}
              {calendarStep === 'datetime' && selectedSpace && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setCalendarStep('space')}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Voltar
                    </Button>
                    <span className="text-sm font-medium">{selectedSpace.name}</span>
                  </div>

                  {/* Week navigation */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setWeekStart(addDays(weekStart, -7))}
                        disabled={isBefore(addDays(weekStart, -1), startOfDay(new Date()))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium">
                        {format(weekStart, "MMM yyyy", { locale: ptBR })}
                      </span>
                      <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Week days */}
                    <div className="grid grid-cols-7 gap-1">
                      {weekDays.map((day) => {
                        const isPast = isBefore(day, startOfDay(new Date()));
                        const isSelected = isSameDay(day, selectedDate);
                        return (
                          <button
                            key={day.toISOString()}
                            onClick={() => { if (!isPast) { setSelectedDate(day); setSelectedSlots([]); } }}
                            disabled={isPast}
                            className={cn(
                              "p-2 rounded-lg text-center transition-colors",
                              isPast && "opacity-40 cursor-not-allowed",
                              isSelected && "bg-primary text-white",
                              !isSelected && !isPast && "hover:bg-muted"
                            )}
                          >
                            <div className="text-xs uppercase">{format(day, 'EEE', { locale: ptBR })}</div>
                            <div className="text-lg font-medium">{format(day, 'd')}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horários disponíveis - {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                    </h4>
                    {slotsLoading ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {TIME_SLOTS.map((slot) => {
                          const isBooked = isSlotBooked(slot.start);
                          const isPast = isSlotPast(slot.start);
                          const isSelected = selectedSlots.includes(slot.start);
                          const isDisabled = isBooked || isPast;
                          return (
                            <button
                              key={slot.start}
                              onClick={() => !isDisabled && toggleSlot(slot.start)}
                              disabled={isDisabled}
                              className={cn(
                                "p-2 text-sm rounded-lg border transition-colors",
                                isDisabled && "opacity-40 cursor-not-allowed bg-muted line-through",
                                isSelected && "bg-primary text-white border-primary",
                                !isDisabled && !isSelected && "hover:border-primary"
                              )}
                            >
                              {slot.start}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected time summary */}
                  {selectedSlots.length > 0 && (
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <div className="text-sm">
                        <strong>Selecionado:</strong> {getBookingTimeRange()?.start} - {getBookingTimeRange()?.end} ({selectedSlots.length}h)
                        {selectedSpace.price_per_hour && (
                          <span className="ml-2">
                            • R$ {(selectedSlots.length * selectedSpace.price_per_hour).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    disabled={selectedSlots.length === 0}
                    onClick={() => setCalendarStep('info')}
                  >
                    Continuar
                  </Button>
                </div>
              )}

              {/* Step 3: Customer info */}
              {calendarStep === 'info' && selectedSpace && (
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" type="button" onClick={() => setCalendarStep('datetime')}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Voltar
                    </Button>
                  </div>

                  {/* Booking summary */}
                  <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                    <div><strong>Espaço:</strong> {selectedSpace.name}</div>
                    <div><strong>Data:</strong> {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</div>
                    <div><strong>Horário:</strong> {getBookingTimeRange()?.start} - {getBookingTimeRange()?.end}</div>
                    {selectedSpace.price_per_hour && (
                      <div><strong>Valor:</strong> R$ {(selectedSlots.length * selectedSpace.price_per_hour).toFixed(2)}</div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="customer_name" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Nome completo *
                      </Label>
                      <Input
                        id="customer_name"
                        required
                        minLength={2}
                        maxLength={200}
                        value={formData.customer_name}
                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                        placeholder="Seu nome"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="customer_email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email *
                      </Label>
                      <Input
                        id="customer_email"
                        type="email"
                        required
                        maxLength={254}
                        value={formData.customer_email}
                        onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                        placeholder="seu@email.com"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="customer_phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Telefone
                      </Label>
                      <Input
                        id="customer_phone"
                        type="tel"
                        maxLength={20}
                        value={formData.customer_phone}
                        onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea
                        id="notes"
                        maxLength={1000}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Alguma informação adicional..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={createBooking.isPending}>
                    {createBooking.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Confirmar Reserva'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Powered by AgendaCerta
          </p>
        </div>
      </div>
    );
  }

  // Inquiry mode - show form
  const settings = venue.public_settings || {};
  const pageTitle = settings.page_title || 'Solicite seu orçamento';
  const pageInstruction = settings.page_instruction || 'Preencha o formulário abaixo e entraremos em contato.';

  // Success state for inquiry
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardHeader className="space-y-4">
            {venue.logo_url && (
              <div className="flex justify-center">
                <img src={venue.logo_url} alt={venue.name} className="h-16 w-auto object-contain" />
              </div>
            )}
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle>Solicitação Enviada!</CardTitle>
            <CardDescription>Obrigado pelo interesse! Entraremos em contato em breve.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSubmitted(false);
                setFormData({ customer_name: '', customer_email: '', customer_phone: '', problem_description: '', notes: '' });
                setPhotos([]);
              }}
            >
              Fazer nova solicitação
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSubmitting = createInquiry.isPending || uploadingPhotos;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            {venue.logo_url && (
              <div className="flex justify-center">
                <img src={venue.logo_url} alt={venue.name} className="h-16 w-auto object-contain" />
              </div>
            )}
            <div>
              <CardTitle className="text-xl">{venue.name}</CardTitle>
              <p className="text-lg font-medium text-primary mt-2">{pageTitle}</p>
            </div>
            <CardDescription>{pageInstruction}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleInquirySubmit} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="customer_name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nome completo *
                  </Label>
                  <Input
                    id="customer_name"
                    required
                    minLength={2}
                    maxLength={200}
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Seu nome"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="customer_email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email *
                  </Label>
                  <Input
                    id="customer_email"
                    type="email"
                    required
                    maxLength={254}
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    placeholder="seu@email.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="customer_phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </Label>
                  <Input
                    id="customer_phone"
                    type="tel"
                    maxLength={20}
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="problem_description" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Descrição do problema *
                </Label>
                <Textarea
                  id="problem_description"
                  required
                  maxLength={5000}
                  value={formData.problem_description}
                  onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
                  placeholder="Descreva o problema ou serviço que você precisa..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <ImagePlus className="h-4 w-4" />
                  Fotos (opcional - máx. 5)
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square">
                        <img src={photo.preview} alt={`Foto ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {photos.length < 5 && (
                  <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                    <ImagePlus className="h-4 w-4 mr-2" />
                    {photos.length === 0 ? 'Adicionar fotos' : 'Adicionar mais fotos'}
                  </Button>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {uploadingPhotos ? 'Enviando fotos...' : 'Enviando...'}
                  </>
                ) : (
                  'Enviar Solicitação'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by AgendaCerta
        </p>
      </div>
    </div>
  );
}

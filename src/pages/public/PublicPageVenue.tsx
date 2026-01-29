import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, ExternalLink, Mail, Phone, User, CheckCircle2, ImagePlus, X, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PublicPageSections, DEFAULT_SECTIONS } from '@/types/public-page';
import {
  HeroSection,
  GallerySection,
  TestimonialsSection,
  StatsSection,
  FaqSection,
  LocationSection,
  HoursSection,
  SocialSection,
} from '@/components/public-page';

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
  public_page_sections: PublicPageSections | null;
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
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bookingFormRef = useRef<HTMLDivElement>(null);

  // Calendar mode state
  const [calendarStep, setCalendarStep] = useState<'space' | 'datetime' | 'info'>('space');
  const [selectedSpace, setSelectedSpace] = useState<PublicSpace | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(startOfDay(new Date()));

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    problem_description: '',
    notes: '',
  });

  const { data: venue, isLoading: venueLoading, error: venueError } = useQuery({
    queryKey: ['public-venue', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase.rpc('get_public_venue_by_slug', { p_slug: slug });
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const raw = data[0];
      return {
        ...raw,
        booking_mode: raw.booking_mode as PublicVenue['booking_mode'],
        public_settings: raw.public_settings as PublicVenue['public_settings'],
        public_page_sections: raw.public_page_sections as unknown as PublicPageSections | null,
      } as PublicVenue;
    },
    enabled: !!slug,
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

  useEffect(() => {
    return () => {
      photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    };
  }, []);

  const scrollToBooking = () => {
    setShowBookingForm(true);
    setTimeout(() => {
      bookingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

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

  const isSlotPast = (slotStart: string) => {
    if (!isToday(selectedDate)) return false;
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
    const newPhotos = Array.from(files).slice(0, 5 - photos.length).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 5));
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
    for (const photo of photos) {
      const fileExt = photo.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${venue?.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('inquiry-photos').upload(filePath, photo.file);
      if (uploadError) continue;
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

  const sections: PublicPageSections = venue?.public_page_sections
    ? { ...DEFAULT_SECTIONS, ...venue.public_page_sections }
    : DEFAULT_SECTIONS;

  if (venueLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!venue || venueError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Página não encontrada</CardTitle>
            <CardDescription>Esta página pública não existe ou não está disponível.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // External link redirect mode
  if (venue.booking_mode === 'external_link') {
    const externalUrl = venue.public_settings?.external_link_url;
    if (externalUrl) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
                <a href={externalUrl} target="_blank" rel="noopener noreferrer">
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

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardHeader className="space-y-4">
            {venue.logo_url && (
              <div className="flex justify-center">
                <img src={venue.logo_url} alt={venue.name} className="h-16 w-auto object-contain" />
              </div>
            )}
            <div className="flex justify-center">
              <div className="rounded-full bg-success/10 p-3">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </div>
            <CardTitle>
              {venue.booking_mode === 'calendar' ? 'Reserva Solicitada!' : 'Solicitação Enviada!'}
            </CardTitle>
            <CardDescription>
              {venue.booking_mode === 'calendar'
                ? 'Sua reserva foi recebida e está aguardando confirmação. Você receberá um email quando for confirmada.'
                : 'Sua solicitação foi recebida. Entraremos em contato em breve.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => { setSubmitted(false); resetCalendar(); setShowBookingForm(false); }}>
              Fazer nova solicitação
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSection
        section={sections.hero}
        venueName={venue.name}
        logoUrl={venue.logo_url}
        onCtaClick={scrollToBooking}
      />

      {/* Gallery Section */}
      <GallerySection section={sections.gallery} />

      {/* Stats Section */}
      <StatsSection section={sections.stats} />

      {/* Testimonials Section */}
      <TestimonialsSection section={sections.testimonials} />

      {/* Hours Section */}
      <HoursSection section={sections.hours} />

      {/* FAQ Section */}
      <FaqSection section={sections.faq} />

      {/* Location Section */}
      <LocationSection section={sections.location} />

      {/* Social Section */}
      <SocialSection section={sections.social} />

      {/* Booking Form */}
      <div ref={bookingFormRef} className="py-16 md:py-24 px-4 bg-muted/30">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center space-y-4 pb-4">
              <div>
                <CardTitle className="text-xl">
                  {venue.booking_mode === 'calendar' ? 'Agendar Horário' : 'Solicitar Serviço'}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {venue.public_settings?.page_instruction || 'Preencha os dados abaixo'}
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {venue.booking_mode === 'calendar' ? (
                <>
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
                      ) : spaces && spaces.length > 0 ? (
                        <div className="grid gap-3">
                          {spaces.map((space) => (
                            <button
                              key={space.id}
                              type="button"
                              onClick={() => { setSelectedSpace(space); setCalendarStep('datetime'); }}
                              className="w-full p-4 text-left rounded-lg border hover:border-primary hover:bg-primary/5 transition-all"
                            >
                              <div className="font-medium">{space.name}</div>
                              {space.description && (
                                <p className="text-sm text-muted-foreground mt-1">{space.description}</p>
                              )}
                              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                {space.capacity && <span>Capacidade: {space.capacity}</span>}
                                {space.price_per_hour && (
                                  <span>R$ {space.price_per_hour.toFixed(2)}/hora</span>
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

                      {/* Week navigation */}
                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setWeekStart(addDays(weekStart, -7))}
                          disabled={startOfDay(weekStart) <= startOfDay(new Date())}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-medium">
                          {format(weekStart, "d 'de' MMMM", { locale: ptBR })} - {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: ptBR })}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Day selector */}
                      <div className="grid grid-cols-7 gap-1">
                        {weekDays.map((day) => {
                          const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                          const isPast = day < startOfDay(new Date());
                          return (
                            <button
                              key={day.toISOString()}
                              type="button"
                              disabled={isPast}
                              onClick={() => { setSelectedDate(day); setSelectedSlots([]); }}
                              className={cn(
                                "flex flex-col items-center p-2 rounded-lg text-xs",
                                isSelected ? "bg-primary text-white" : "hover:bg-muted",
                                isPast && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <span className="uppercase">{format(day, 'EEE', { locale: ptBR })}</span>
                              <span className="text-lg font-semibold">{format(day, 'd')}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Time slots */}
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Selecione o horário
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                                  "py-2 px-3 rounded-lg text-sm border transition-all",
                                  selected && "bg-primary text-white border-primary",
                                  !selected && !booked && !past && "hover:border-primary",
                                  (booked || past) && "opacity-50 cursor-not-allowed bg-muted"
                                )}
                              >
                                {slot.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {selectedSlots.length > 0 && (
                        <Button className="w-full" onClick={() => setCalendarStep('info')}>
                          Continuar ({selectedSlots.length}h selecionada{selectedSlots.length > 1 ? 's' : ''})
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
                        <p><strong>{selectedSpace?.name}</strong></p>
                        <p>{format(selectedDate, "d 'de' MMMM", { locale: ptBR })} • {getBookingTimeRange()?.start} às {getBookingTimeRange()?.end}</p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="name">Nome completo *</Label>
                          <Input
                            id="name"
                            value={formData.customer_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.customer_email}
                            onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Telefone</Label>
                          <Input
                            id="phone"
                            value={formData.customer_phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="notes">Observações</Label>
                          <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                          />
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={createBooking.isPending}>
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
                      <Label htmlFor="name">Nome completo *</Label>
                      <Input
                        id="name"
                        value={formData.customer_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.customer_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="problem">Descrição do problema/serviço</Label>
                      <Textarea
                        id="problem"
                        value={formData.problem_description}
                        onChange={(e) => setFormData(prev => ({ ...prev, problem_description: e.target.value }))}
                        rows={4}
                      />
                    </div>

                    {/* Photo upload */}
                    <div>
                      <Label>Fotos (opcional - máx. 5)</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {photos.map((photo, i) => (
                          <div key={i} className="relative">
                            <img src={photo.preview} alt="" className="h-16 w-16 object-cover rounded-lg border" />
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
                          <label className="h-16 w-16 flex items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                            <ImagePlus className="h-5 w-5 text-muted-foreground" />
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={handlePhotoSelect}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={createInquiry.isPending || uploadingPhotos}>
                    {(createInquiry.isPending || uploadingPhotos) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enviar Solicitação
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-sm text-muted-foreground border-t">
        <p>© {new Date().getFullYear()} {venue.name}. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

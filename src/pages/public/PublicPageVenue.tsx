import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, ExternalLink, Mail, Phone, User, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
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

export default function PublicPageVenue() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  // Form state for inquiry mode
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    space_id: '',
    start_date: '',
    start_time: '',
    end_time: '',
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

  // Fetch spaces for the venue
  const { data: spaces, isLoading: spacesLoading } = useQuery({
    queryKey: ['public-spaces', venue?.id],
    queryFn: async () => {
      if (!venue?.id) return [];

      const { data, error } = await supabase.rpc('get_public_spaces_by_venue', { p_venue_id: venue.id });

      if (error) throw error;
      return (data || []) as PublicSpace[];
    },
    enabled: !!venue?.id && venue.booking_mode === 'inquiry',
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
      // Reset to default on unmount
      document.documentElement.style.removeProperty('--primary');
    };
  }, [venue?.primary_color]);

  // Create inquiry mutation
  const createInquiry = useMutation({
    mutationFn: async () => {
      if (!venue?.id || !formData.space_id) {
        throw new Error('Dados incompletos');
      }

      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.start_date}T${formData.end_time}`);

      const { data, error } = await supabase.rpc('create_public_inquiry', {
        p_venue_id: venue.id,
        p_space_id: formData.space_id,
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
      toast({
        title: 'Solicitação enviada!',
        description: 'Entraremos em contato em breve.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar solicitação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInquiry.mutate();
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
            <CardDescription>
              Esta página pública não existe ou não está disponível.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // External link redirect mode
  if (venue.booking_mode === 'external_link') {
    const externalUrl = venue.public_settings?.external_link_url;

    if (externalUrl) {
      // Auto redirect after showing brief message
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center shadow-lg">
            <CardHeader className="space-y-4">
              {venue.logo_url && (
                <div className="flex justify-center">
                  <img
                    src={venue.logo_url}
                    alt={venue.name}
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
              <CardTitle>{venue.name}</CardTitle>
              <CardDescription>
                Você será redirecionado para nosso sistema de agendamento.
              </CardDescription>
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

  // Calendar mode (placeholder for future implementation)
  if (venue.booking_mode === 'calendar') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardHeader className="space-y-4">
            {venue.logo_url && (
              <div className="flex justify-center">
                <img
                  src={venue.logo_url}
                  alt={venue.name}
                  className="h-16 w-auto object-contain"
                />
              </div>
            )}
            <CardTitle>{venue.name}</CardTitle>
            <CardDescription>
              Agendamento online em breve disponível.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
              <Calendar className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Em breve você poderá visualizar nossa agenda e fazer reservas diretamente por aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inquiry mode - show form
  const settings = venue.public_settings || {};
  const pageTitle = settings.page_title || `Solicite seu orçamento`;
  const pageInstruction = settings.page_instruction || `Preencha o formulário abaixo e entraremos em contato para confirmar sua reserva.`;

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardHeader className="space-y-4">
            {venue.logo_url && (
              <div className="flex justify-center">
                <img
                  src={venue.logo_url}
                  alt={venue.name}
                  className="h-16 w-auto object-contain"
                />
              </div>
            )}
            <div className="flex justify-center">
              <div className="rounded-full bg-success-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-success-600" />
              </div>
            </div>
            <CardTitle>Solicitação Enviada!</CardTitle>
            <CardDescription>
              Obrigado pelo interesse! Entraremos em contato em breve para confirmar sua reserva.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSubmitted(false);
                setFormData({
                  customer_name: '',
                  customer_email: '',
                  customer_phone: '',
                  space_id: '',
                  start_date: '',
                  start_time: '',
                  end_time: '',
                  notes: '',
                });
              }}
            >
              Fazer nova solicitação
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            {venue.logo_url && (
              <div className="flex justify-center">
                <img
                  src={venue.logo_url}
                  alt={venue.name}
                  className="h-16 w-auto object-contain"
                />
              </div>
            )}
            <div>
              <CardTitle className="text-xl">{venue.name}</CardTitle>
              <p className="text-lg font-medium text-primary mt-2">{pageTitle}</p>
            </div>
            <CardDescription>{pageInstruction}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Customer Info */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="customer_name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nome completo *
                  </Label>
                  <Input
                    id="customer_name"
                    required
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
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Space Selection */}
              <div>
                <Label htmlFor="space_id" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Espaço desejado *
                </Label>
                {spacesLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <Select
                    value={formData.space_id}
                    onValueChange={(value) => setFormData({ ...formData, space_id: value })}
                    required
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione um espaço" />
                    </SelectTrigger>
                    <SelectContent>
                      {spaces?.map((space) => (
                        <SelectItem key={space.id} value={space.id}>
                          <div className="flex flex-col">
                            <span>{space.name}</span>
                            {space.price_per_hour && (
                              <span className="text-xs text-muted-foreground">
                                R$ {space.price_per_hour.toFixed(2)}/hora
                                {space.capacity && ` • Até ${space.capacity} pessoas`}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Date and Time */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="start_date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data desejada *
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="start_time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Início *
                    </Label>
                    <Input
                      id="start_time"
                      type="time"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Término *
                    </Label>
                    <Input
                      id="end_time"
                      type="time"
                      required
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detalhes adicionais sobre sua reserva..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={createInquiry.isPending}
              >
                {createInquiry.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Solicitação'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by AgendaCerta
        </p>
      </div>
    </div>
  );
}

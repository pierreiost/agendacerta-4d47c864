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
import { Loader2, Calendar, ExternalLink, Mail, Phone, User, CheckCircle2, FileText, ImagePlus, X } from 'lucide-react';
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
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for inquiry mode
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    problem_description: '',
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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files).slice(0, 5 - photos.length).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPhotos(prev => [...prev, ...newPhotos].slice(0, 5));

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const photo = prev[index];
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
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

      const { error: uploadError } = await supabase.storage
        .from('inquiry-photos')
        .upload(filePath, photo.file);

      if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('inquiry-photos')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  // Create inquiry mutation
  const createInquiry = useMutation({
    mutationFn: async () => {
      if (!venue?.id) {
        throw new Error('Dados incompletos');
      }

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
  const pageInstruction = settings.page_instruction || `Preencha o formulário abaixo e entraremos em contato.`;

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
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle>Solicitação Enviada!</CardTitle>
            <CardDescription>
              Obrigado pelo interesse! Entraremos em contato em breve.
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
                  problem_description: '',
                });
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

              {/* Problem Description */}
              <div>
                <Label htmlFor="problem_description" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Descrição do problema *
                </Label>
                <Textarea
                  id="problem_description"
                  required
                  value={formData.problem_description}
                  onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
                  placeholder="Descreva o problema ou serviço que você precisa..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <ImagePlus className="h-4 w-4" />
                  Fotos (opcional - máx. 5)
                </Label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {/* Photo previews */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={photo.preview}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
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
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4 mr-2" />
                    {photos.length === 0 ? 'Adicionar fotos' : 'Adicionar mais fotos'}
                  </Button>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
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

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by AgendaCerta
        </p>
      </div>
    </div>
  );
}

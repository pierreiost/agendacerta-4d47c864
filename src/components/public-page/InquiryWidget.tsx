import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  ImagePlus,
  X,
  Clock,
  Wrench,
  MessageCircle,
  RotateCcw,
} from 'lucide-react';
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

interface InquiryWidgetProps {
  venue: PublicVenue;
  whatsappPhone?: string | null;
}

export function InquiryWidget({ venue, whatsappPhone }: InquiryWidgetProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deviceModel, setDeviceModel] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((f) => {
      if (!f.type.startsWith('image/')) {
        toast({ title: 'Arquivo inválido', description: 'Apenas imagens são aceitas.', variant: 'destructive' });
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast({ title: 'Arquivo muito grande', description: 'Máximo 5MB por imagem.', variant: 'destructive' });
        return false;
      }
      return true;
    });

    const remaining = 5 - photos.length;
    const toAdd = validFiles.slice(0, remaining);
    if (toAdd.length < validFiles.length) {
      toast({ title: 'Limite de fotos', description: 'Máximo 5 fotos permitidas.' });
    }

    setPhotos((prev) => [...prev, ...toAdd]);
    toAdd.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPhotoPreviewUrls((prev) => [...prev, url]);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Upload photos
      const uploadedUrls: string[] = [];
      for (const photo of photos) {
        const ext = photo.name.split('.').pop();
        const path = `${venue.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('inquiry-photos')
          .upload(path, photo, { contentType: photo.type });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('inquiry-photos')
          .getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      // Use email if provided, otherwise use a placeholder with phone
      const email = customerEmail.trim() || `${customerPhone.replace(/\D/g, '')}@sem-email.com`;

      const { data, error } = await supabase.rpc('create_service_inquiry', {
        p_venue_id: venue.id,
        p_customer_name: customerName.trim(),
        p_customer_email: email,
        p_customer_phone: customerPhone.trim(),
        p_problem_description: problemDescription.trim(),
        p_photo_urls: uploadedUrls,
        p_device_model: deviceModel.trim(),
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setIsSuccess(true);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!deviceModel.trim()) {
      toast({ title: 'Modelo obrigatório', description: 'Informe o modelo do equipamento.', variant: 'destructive' });
      return;
    }
    if (!problemDescription.trim()) {
      toast({ title: 'Descrição obrigatória', description: 'Descreva o defeito do equipamento.', variant: 'destructive' });
      return;
    }
    if (!customerName.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (phoneDigits.length < 8) {
      toast({ title: 'WhatsApp inválido', description: 'Informe um número válido com pelo menos 8 dígitos.', variant: 'destructive' });
      return;
    }

    submitMutation.mutate();
  };

  const handleReset = () => {
    setDeviceModel('');
    setProblemDescription('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setPhotos([]);
    photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPhotoPreviewUrls([]);
    setIsSuccess(false);
  };

  const cleanPhone = whatsappPhone?.replace(/\D/g, '') || '';
  const hasWhatsApp = cleanPhone.length >= 8;

  if (isSuccess) {
    const whatsAppMessage = encodeURIComponent(
      `Olá! Acabei de enviar uma solicitação de orçamento para ${deviceModel}. Aguardo retorno!`
    );

    return (
      <div className="p-6 sm:p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">Solicitação Recebida!</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Nossa equipe técnica analisará seu relato e entrará em contato pelo WhatsApp informado.
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 text-left space-y-1">
          <p className="text-sm font-medium text-foreground">{deviceModel}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{problemDescription}</p>
        </div>

        <div className="space-y-3">
          {hasWhatsApp && (
            <Button asChild className="w-full" size="lg">
              <a
                href={`https://wa.me/${cleanPhone}?text=${whatsAppMessage}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Enviar Mensagem via WhatsApp
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={handleReset} className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Nova Solicitação
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Wrench className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            {venue.public_settings?.page_title || 'Solicitar Orçamento'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {venue.public_settings?.page_instruction || 'Preencha os dados do equipamento'}
          </p>
        </div>
      </div>

      {/* Device Info */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          Dados do Equipamento
        </h4>

        <div className="space-y-2">
          <Label htmlFor="device-model">Modelo do Equipamento *</Label>
          <Input
            id="device-model"
            placeholder="Ex: iPhone 13, MacBook Pro 2021"
            value={deviceModel}
            onChange={(e) => setDeviceModel(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="problem-desc">Descrição do Defeito *</Label>
          <Textarea
            id="problem-desc"
            placeholder="Descreva o problema: o que aconteceu, quando começou, etc."
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            className="min-h-[100px]"
            required
          />
        </div>
      </div>

      {/* Photo Upload */}
      <div className="space-y-3">
        <Label>Fotos do Defeito (opcional, máx. 5)</Label>

        {photoPreviewUrls.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {photoPreviewUrls.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
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
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <ImagePlus className="h-4 w-4" />
            Adicionar Foto
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoSelect}
          className="hidden"
        />
      </div>

      {/* Contact Info */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Seus Dados de Contato</h4>

        <div className="space-y-2">
          <Label htmlFor="inquiry-name">Nome Completo *</Label>
          <Input
            id="inquiry-name"
            placeholder="Seu nome"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inquiry-whatsapp">WhatsApp *</Label>
          <Input
            id="inquiry-whatsapp"
            placeholder="(51) 99999-9999"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inquiry-email">E-mail (opcional)</Label>
          <Input
            id="inquiry-email"
            type="email"
            placeholder="seu@email.com"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={submitMutation.isPending}
      >
        {submitMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enviando...
          </>
        ) : (
          'Solicitar Orçamento'
        )}
      </Button>
    </form>
  );
}

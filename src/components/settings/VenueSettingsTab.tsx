import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVenue } from '@/contexts/VenueContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFormPersist } from '@/hooks/useFormPersist';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { maskCPFCNPJ, maskPhone, unmask, isValidCPFCNPJ } from '@/lib/masks';
import { MultiPhoneInput } from './MultiPhoneInput';
import {
  Loader2,
  Building2,
  ImageIcon,
  Upload,
  Link,
  X,
  Copy,
  CheckCircle2,
  MapPin,
  Mail,
  FileText,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { ChangePasswordDialog } from './ChangePasswordDialog';

const venueFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().optional(),
  cnpj_cpf: z.string()
    .optional()
    .refine((val) => !val || isValidCPFCNPJ(val), {
      message: 'CPF ou CNPJ inválido',
    }),
  whatsapp: z.string()
    .optional()
    .refine((val) => !val || unmask(val).length >= 10, {
      message: 'WhatsApp inválido (mínimo 10 dígitos)',
    }),
  address: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phones: z.array(z.string().max(20)).max(5, 'Máximo de 5 telefones').default([]),
  logo_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

type VenueFormData = z.infer<typeof venueFormSchema>;

export function VenueSettingsTab() {
  const { currentVenue, refetchVenues } = useVenue();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [logoInputMode, setLogoInputMode] = useState<'url' | 'file'>('url');
  const [linkCopied, setLinkCopied] = useState(false);
  
  const { upload, isUploading } = useFileUpload();
  const { status, daysRemaining, isPlanMax } = useSubscriptionStatus(currentVenue);
  
  const isAdmin = currentVenue?.role === 'admin' || currentVenue?.role === 'superadmin';

  const venueForm = useForm<VenueFormData>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      cnpj_cpf: '',
      whatsapp: '',
      address: '',
      email: '',
      phones: [],
      logo_url: '',
    },
  });

  // Watch for changes to enable dirty state
  const formValues = venueForm.watch();
  
  // Calculate if form is dirty (has changes)
  const isDirty = useMemo(() => {
    if (!currentVenue) return false;
    
    // Get phones from venue (with fallback to legacy phone field)
    const venuePhones = (currentVenue as { phones?: string[] }).phones;
    const originalPhones = venuePhones?.length
      ? venuePhones.map((p: string) => maskPhone(p))
      : currentVenue.phone 
        ? [maskPhone(currentVenue.phone)]
        : [];
    
    const original = {
      name: currentVenue.name || '',
      slug: currentVenue.slug || '',
      cnpj_cpf: currentVenue.cnpj_cpf ? maskCPFCNPJ(currentVenue.cnpj_cpf) : '',
      whatsapp: currentVenue.whatsapp ? maskPhone(currentVenue.whatsapp) : '',
      address: currentVenue.address || '',
      email: currentVenue.email || '',
      logo_url: currentVenue.logo_url || '',
    };
    
    // Check phones separately (array comparison)
    const currentPhones = formValues.phones || [];
    const phonesChanged = JSON.stringify(currentPhones) !== JSON.stringify(originalPhones);
    
    const otherFieldsChanged = Object.keys(original).some(
      key => formValues[key as keyof VenueFormData] !== original[key as keyof typeof original]
    );
    
    return phonesChanged || otherFieldsChanged;
  }, [formValues, currentVenue]);

  // Track venue ID to detect actual venue changes vs re-renders
  const prevVenueIdRef = useRef<string | null>(null);
  const skipDataLoadRef = useRef(false);

  // Form persistence for venue settings
  const { clearDraft: clearVenueDraft } = useFormPersist({
    form: venueForm,
    key: `venue_settings_${currentVenue?.id || 'default'}`,
    debounceMs: 500,
    showRecoveryToast: true,
    onRestore: () => {
      // Mark that we restored from draft - skip overwriting with DB data
      skipDataLoadRef.current = true;
    },
  });

  // Reset form when currentVenue changes (but respect restored drafts)
  useEffect(() => {
    if (!currentVenue) return;
    
    // Check if this is a real venue change
    const venueChanged = prevVenueIdRef.current !== null && prevVenueIdRef.current !== currentVenue.id;
    prevVenueIdRef.current = currentVenue.id;
    
    // If venue changed, clear the skip flag (new venue = fresh start)
    if (venueChanged) {
      skipDataLoadRef.current = false;
    }
    
    // If we restored a draft, don't overwrite with DB data
    if (skipDataLoadRef.current) {
      return;
    }
    
    // Get phones from venue (with fallback to legacy phone field)
    const venuePhones = (currentVenue as { phones?: string[] }).phones;
    const initialPhones = venuePhones?.length
      ? venuePhones.map((p: string) => maskPhone(p))
      : currentVenue.phone 
        ? [maskPhone(currentVenue.phone)]
        : [];
    
    venueForm.reset({
      name: currentVenue.name || '',
      slug: currentVenue.slug || '',
      cnpj_cpf: currentVenue.cnpj_cpf ? maskCPFCNPJ(currentVenue.cnpj_cpf) : '',
      whatsapp: currentVenue.whatsapp ? maskPhone(currentVenue.whatsapp) : '',
      address: currentVenue.address || '',
      email: currentVenue.email || '',
      phones: initialPhones,
      logo_url: currentVenue.logo_url || '',
    });
  }, [currentVenue?.id, currentVenue, venueForm]);

  const onSubmit = async (data: VenueFormData) => {
    if (!currentVenue?.id) return;
    setIsLoading(true);

    // Clean and filter phones
    const cleanedPhones = (data.phones || [])
      .map(p => unmask(p))
      .filter(p => p.length > 0);

    const { error } = await supabase
      .from('venues')
      .update({
        name: data.name,
        address: data.address || null,
        phones: cleanedPhones,
        phone: cleanedPhones[0] || null, // Keep first phone in legacy field for compatibility
        email: data.email || null,
        logo_url: data.logo_url || null,
        cnpj_cpf: data.cnpj_cpf ? unmask(data.cnpj_cpf) : null,
        whatsapp: data.whatsapp ? unmask(data.whatsapp) : null,
      })
      .eq('id', currentVenue.id);

    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Configurações salvas!' });
      clearVenueDraft();
      refetchVenues();
    }
  };

  const copyPortalLink = () => {
    if (!currentVenue?.slug) return;
    const link = `${window.location.origin}/${currentVenue.slug}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    toast({ title: 'Link copiado!' });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'active':
        return { label: 'Ativo', variant: 'default' as const };
      case 'trialing':
        return { label: `Trial (${daysRemaining}d)`, variant: 'secondary' as const };
      case 'overdue':
        return { label: 'Pendente', variant: 'destructive' as const };
      case 'suspended':
        return { label: 'Suspenso', variant: 'destructive' as const };
      default:
        return { label: 'Desconhecido', variant: 'outline' as const };
    }
  };

  const statusInfo = getStatusLabel();

  return (
    <Form {...venueForm}>
      <form onSubmit={venueForm.handleSubmit(onSubmit)} className="space-y-6">
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={isPlanMax ? 'default' : 'secondary'}>
            Plano {isPlanMax ? 'Max' : 'Basic'}
          </Badge>
          <Badge variant={statusInfo.variant}>
            {statusInfo.label}
          </Badge>
        </div>

        {/* Card: Identificação */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Identificação
            </CardTitle>
            <CardDescription>
              Dados básicos da sua unidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={venueForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Unidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da unidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={venueForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug do Portal</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          {...field} 
                          readOnly 
                          className="bg-muted"
                          placeholder="minha-unidade"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={copyPortalLink}
                        disabled={!currentVenue?.slug}
                        title="Copiar link do portal"
                      >
                        {linkCopied ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      {currentVenue?.slug && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          asChild
                          title="Abrir portal"
                        >
                          <a
                            href={`/v/${currentVenue.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                    <FormDescription>
                      URL da sua página pública de agendamento
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            {/* Logo - apenas para header do sistema */}
            {isAdmin && (
              <FormField
                control={venueForm.control}
                name="logo_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logotipo do Sistema</FormLabel>
                    <FormDescription>
                      Aparece no header da sidebar do sistema administrativo
                    </FormDescription>
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <Avatar className="h-16 w-16 border">
                          <AvatarImage src={field.value || undefined} alt="Logo" />
                          <AvatarFallback>
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        {field.value && (
                          <button
                            type="button"
                            onClick={() => field.onChange('')}
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                            title="Remover logo"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={logoInputMode === 'url' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setLogoInputMode('url')}
                          >
                            <Link className="h-4 w-4 mr-1" />
                            URL
                          </Button>
                          <Button
                            type="button"
                            variant={logoInputMode === 'file' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setLogoInputMode('file')}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Arquivo
                          </Button>
                        </div>

                        {logoInputMode === 'url' ? (
                          <FormControl>
                            <Input
                              placeholder="https://exemplo.com/logo.png"
                              {...field}
                            />
                          </FormControl>
                        ) : (
                          <div>
                            <Label
                              htmlFor="logo-upload"
                              className={`flex flex-col items-center justify-center w-full h-16 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                                isUploading ? 'opacity-50 pointer-events-none' : ''
                              }`}
                            >
                              {isUploading ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="text-xs">Enviando...</span>
                                </div>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    PNG, JPG ou SVG
                                  </span>
                                </>
                              )}
                            </Label>
                            <Input
                              id="logo-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isUploading}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !currentVenue?.id) return;

                                const result = await upload(file, {
                                  bucket: 'venue-logos',
                                  folder: currentVenue.id,
                                });

                                if (result) {
                                  field.onChange(result.url);
                                  toast({ title: 'Logo enviado!' });
                                }
                                e.target.value = '';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Card: Dados Fiscais e Contato */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dados Fiscais e Contato
            </CardTitle>
            <CardDescription>
              Informações para cobrança e comunicação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={venueForm.control}
                name="cnpj_cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF/CNPJ</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="000.000.000-00"
                        {...field}
                        onChange={(e) => {
                          const masked = maskCPFCNPJ(e.target.value);
                          field.onChange(masked);
                        }}
                        maxLength={18}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={venueForm.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(11) 99999-9999"
                        {...field}
                        onChange={(e) => {
                          const masked = maskPhone(e.target.value);
                          field.onChange(masked);
                        }}
                        maxLength={15}
                      />
                    </FormControl>
                    <FormDescription>
                      Usado para contato sobre cobranças
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card: Localização */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Localização
            </CardTitle>
            <CardDescription>
              Endereço da sua unidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={venueForm.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua, número, bairro, cidade - UF" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Card: Comunicação */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Comunicação
            </CardTitle>
            <CardDescription>
              Canais de contato da unidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={venueForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contato@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={venueForm.control}
                name="phones"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Telefones da Empresa (máx. 5)</FormLabel>
                    <FormControl>
                      <MultiPhoneInput
                        value={field.value || []}
                        onChange={field.onChange}
                        max={5}
                      />
                    </FormControl>
                    <FormDescription>
                      Todos os telefones aparecerão na Ordem de Serviço
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Segurança da Conta
            </CardTitle>
            <CardDescription>
              Gerencie a segurança da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Senha de Acesso</p>
                <p className="text-xs text-muted-foreground">
                  Altere sua senha para manter sua conta segura
                </p>
              </div>
              <ChangePasswordDialog />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading || !isDirty}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </form>
    </Form>
  );
}

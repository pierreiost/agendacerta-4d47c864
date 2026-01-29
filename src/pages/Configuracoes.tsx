import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useFileUpload } from '@/hooks/useFileUpload';
import {
  Loader2,
  Building2,
  Bell,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Globe,
  Lock,
  Palette,
  ImageIcon,
  Upload,
  Link,
  X,
  ExternalLink,
  Mail,
  FileText,
  Sparkles,
} from 'lucide-react';

// Cores predefinidas para identidade visual
const PRESET_COLORS = [
  { color: '#6366f1', name: 'Indigo' },
  { color: '#22c55e', name: 'Verde' },
  { color: '#f59e0b', name: 'Âmbar' },
  { color: '#ef4444', name: 'Vermelho' },
  { color: '#8b5cf6', name: 'Violeta' },
  { color: '#06b6d4', name: 'Ciano' },
  { color: '#ec4899', name: 'Rosa' },
  { color: '#f97316', name: 'Laranja' },
];

// Regex para validações
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

// =====================
// SCHEMAS ZOD
// =====================

const venueFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  logo_url: z.string().url('URL inválida').optional().or(z.literal('')),
  primary_color: z.string().regex(hexColorRegex, 'Cor hexadecimal inválida').optional().or(z.literal('')),
});

const reminderFormSchema = z.object({
  reminder_hours_before: z.coerce.number().min(1).max(72),
});

const publicPageFormSchema = z.object({
  slug: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(slugRegex, 'Use apenas letras minúsculas, números e hífens')
    .optional()
    .or(z.literal('')),
  public_page_enabled: z.boolean(),
  booking_mode: z.enum(['calendar', 'inquiry', 'external_link']).optional(),
  // Campos dinâmicos
  external_link_url: z.string().url('URL inválida').optional().or(z.literal('')),
  inquiry_notification_email: z.string().email('Email inválido').optional().or(z.literal('')),
  page_title: z.string().max(100, 'Máximo 100 caracteres').optional(),
  page_instruction: z.string().max(500, 'Máximo 500 caracteres').optional(),
}).superRefine((data, ctx) => {
  // Validações condicionais
  if (data.booking_mode === 'external_link' && !data.external_link_url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'URL externa é obrigatória para este modo',
      path: ['external_link_url'],
    });
  }
  if (data.booking_mode === 'inquiry' && !data.inquiry_notification_email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Email para notificações é obrigatório para este modo',
      path: ['inquiry_notification_email'],
    });
  }
});

type VenueFormData = z.infer<typeof venueFormSchema>;
type ReminderFormData = z.infer<typeof reminderFormSchema>;
type PublicPageFormData = z.infer<typeof publicPageFormSchema>;

export default function Configuracoes() {
  const { currentVenue, refetchVenues } = useVenue();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPublicPageLoading, setIsPublicPageLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [logoInputMode, setLogoInputMode] = useState<'url' | 'file'>('url');
  const { upload, isUploading } = useFileUpload();
  const {
    isConnected,
    connection,
    isLoading: isGoogleLoading,
    connect,
    isConnecting,
    disconnect,
    isDisconnecting,
  } = useGoogleCalendar();

  // Verificar se o utilizador tem permissão de admin/superadmin
  const isAdmin = currentVenue?.role === 'admin' || currentVenue?.role === 'superadmin';
  const isMaxPlan = currentVenue?.plan_type === 'max';
  const isBookingModeLocked = !!currentVenue?.booking_mode;

  // Handle Google OAuth callback
  useEffect(() => {
    const googleSuccess = searchParams.get('google_success');
    const googleError = searchParams.get('google_error');

    if (googleSuccess) {
      toast({ title: 'Google Calendar conectado com sucesso!' });
      setSearchParams({});
    } else if (googleError) {
      const errorMessages: Record<string, string> = {
        access_denied: 'Acesso negado pelo usuário',
        token_exchange_failed: 'Falha na autenticação',
        save_failed: 'Falha ao salvar as credenciais',
        missing_params: 'Parâmetros inválidos',
        unknown: 'Erro desconhecido',
      };
      toast({
        title: 'Erro ao conectar Google Calendar',
        description: errorMessages[googleError] || googleError,
        variant: 'destructive',
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast]);

  // =====================
  // FORM: Venue
  // =====================
  const venueForm = useForm<VenueFormData>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: {
      name: currentVenue?.name ?? '',
      address: currentVenue?.address ?? '',
      phone: currentVenue?.phone ?? '',
      email: currentVenue?.email ?? '',
      logo_url: currentVenue?.logo_url ?? '',
      primary_color: currentVenue?.primary_color ?? '',
    },
  });

  // Atualizar form quando venue mudar
  useEffect(() => {
    if (currentVenue) {
      venueForm.reset({
        name: currentVenue.name ?? '',
        address: currentVenue.address ?? '',
        phone: currentVenue.phone ?? '',
        email: currentVenue.email ?? '',
        logo_url: currentVenue.logo_url ?? '',
        primary_color: currentVenue.primary_color ?? '',
      });
    }
  }, [currentVenue, venueForm]);

  // =====================
  // FORM: Reminder
  // =====================
  const reminderForm = useForm<ReminderFormData>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      reminder_hours_before: currentVenue?.reminder_hours_before ?? 24,
    },
  });

  // =====================
  // FORM: Public Page
  // =====================
  const publicPageForm = useForm<PublicPageFormData>({
    resolver: zodResolver(publicPageFormSchema),
    defaultValues: {
      slug: currentVenue?.slug ?? '',
      public_page_enabled: currentVenue?.public_page_enabled ?? false,
      booking_mode: currentVenue?.booking_mode ?? undefined,
      external_link_url: currentVenue?.public_settings?.external_link_url ?? '',
      inquiry_notification_email: currentVenue?.public_settings?.inquiry_notification_email ?? '',
      page_title: currentVenue?.public_settings?.page_title ?? '',
      page_instruction: currentVenue?.public_settings?.page_instruction ?? '',
    },
  });

  // Atualizar form quando venue mudar
  useEffect(() => {
    if (currentVenue) {
      publicPageForm.reset({
        slug: currentVenue.slug ?? '',
        public_page_enabled: currentVenue.public_page_enabled ?? false,
        booking_mode: currentVenue.booking_mode ?? undefined,
        external_link_url: currentVenue.public_settings?.external_link_url ?? '',
        inquiry_notification_email: currentVenue.public_settings?.inquiry_notification_email ?? '',
        page_title: currentVenue.public_settings?.page_title ?? '',
        page_instruction: currentVenue.public_settings?.page_instruction ?? '',
      });
    }
  }, [currentVenue, publicPageForm]);

  // Watch booking_mode para renderização condicional
  const watchedBookingMode = useWatch({
    control: publicPageForm.control,
    name: 'booking_mode',
  });

  // =====================
  // SUBMIT HANDLERS
  // =====================

  const onVenueSubmit = async (data: VenueFormData) => {
    if (!currentVenue?.id) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('venues')
      .update({
        name: data.name,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        logo_url: data.logo_url || null,
        primary_color: data.primary_color || null,
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
      refetchVenues();
    }
  };

  const onReminderSubmit = async (data: ReminderFormData) => {
    if (!currentVenue?.id) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('venues')
      .update({
        reminder_hours_before: data.reminder_hours_before,
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
      toast({ title: 'Configuração de lembrete salva!' });
      refetchVenues();
    }
  };

  const onPublicPageSubmit = async (data: PublicPageFormData) => {
    if (!currentVenue?.id) return;
    setIsPublicPageLoading(true);

    // Montar objeto public_settings
    const publicSettings = {
      external_link_url: data.external_link_url || undefined,
      inquiry_notification_email: data.inquiry_notification_email || undefined,
      page_title: data.page_title || undefined,
      page_instruction: data.page_instruction || undefined,
    };

    const { error } = await supabase
      .from('venues')
      .update({
        slug: data.slug || null,
        public_page_enabled: data.public_page_enabled,
        booking_mode: data.booking_mode || null,
        public_settings: publicSettings,
      })
      .eq('id', currentVenue.id);

    setIsPublicPageLoading(false);

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        toast({
          title: 'Slug já em uso',
          description: 'Este endereço já está sendo usado por outro estabelecimento.',
          variant: 'destructive',
        });
      } else if (error.message.includes('Slug inválido')) {
        toast({
          title: 'Slug inválido',
          description: 'Use apenas letras minúsculas, números e hífens.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao atualizar',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({ title: 'Página Online configurada!' });
      refetchVenues();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações da sua unidade
          </p>
        </div>

        <Tabs defaultValue="venue" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="venue">
              <Building2 className="mr-2 h-4 w-4" />
              Unidade
            </TabsTrigger>
            <TabsTrigger value="public-page">
              <Globe className="mr-2 h-4 w-4" />
              Página Online
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Calendar className="mr-2 h-4 w-4" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="reminders">
              <Bell className="mr-2 h-4 w-4" />
              Lembretes
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users className="mr-2 h-4 w-4" />
              Equipe
            </TabsTrigger>
          </TabsList>

          {/* ===================== */}
          {/* TAB: UNIDADE */}
          {/* ===================== */}
          <TabsContent value="venue">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Unidade</CardTitle>
                <CardDescription>
                  Informações básicas sobre sua unidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...venueForm}>
                  <form onSubmit={venueForm.handleSubmit(onVenueSubmit)} className="space-y-6">
                    {/* Informações básicas */}
                    <FormField
                      control={venueForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome da unidade" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={venueForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input placeholder="Endereço completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={venueForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(11) 99999-9999" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
                    </div>

                    {/* Secção de Identidade Visual - apenas para admin/superadmin */}
                    {isAdmin && (
                      <>
                        <Separator className="my-6" />
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Palette className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-medium">Identidade Visual</h3>
                          </div>

                          {/* Logo */}
                          <FormField
                            control={venueForm.control}
                            name="logo_url"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Logotipo</FormLabel>
                                <div className="flex items-start gap-4">
                                  <div className="relative">
                                    <Avatar className="h-20 w-20 border">
                                      <AvatarImage src={field.value || undefined} alt="Logo" />
                                      <AvatarFallback>
                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
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
                                  <div className="flex-1 space-y-3">
                                    {/* Toggle entre URL e Upload */}
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
                                      <div>
                                        <FormControl>
                                          <Input
                                            placeholder="https://exemplo.com/logo.png"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormDescription className="mt-1">
                                          Cole a URL de uma imagem
                                        </FormDescription>
                                      </div>
                                    ) : (
                                      <div>
                                        <Label
                                          htmlFor="logo-upload"
                                          className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                                            isUploading ? 'opacity-50 pointer-events-none' : ''
                                          }`}
                                        >
                                          {isUploading ? (
                                            <div className="flex items-center gap-2">
                                              <Loader2 className="h-5 w-5 animate-spin" />
                                              <span className="text-sm">Enviando...</span>
                                            </div>
                                          ) : (
                                            <>
                                              <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                                              <span className="text-sm text-muted-foreground">
                                                Clique para selecionar
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                PNG, JPG, GIF ou SVG (max. 5MB)
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
                                              toast({ title: 'Logo enviado com sucesso!' });
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

                          {/* Cor Primária */}
                          <FormField
                            control={venueForm.control}
                            name="primary_color"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cor Principal</FormLabel>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {PRESET_COLORS.map((preset) => (
                                    <button
                                      key={preset.color}
                                      type="button"
                                      className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                                        field.value === preset.color ? 'border-foreground scale-110 ring-2 ring-offset-2' : 'border-transparent'
                                      }`}
                                      style={{ backgroundColor: preset.color }}
                                      onClick={() => field.onChange(preset.color)}
                                      title={preset.name}
                                    />
                                  ))}
                                  <FormControl>
                                    <Input
                                      type="color"
                                      className="h-8 w-8 p-0 border-0 cursor-pointer rounded-full overflow-hidden"
                                      value={field.value || '#6366f1'}
                                      onChange={(e) => field.onChange(e.target.value)}
                                    />
                                  </FormControl>
                                  {field.value && (
                                    <>
                                      <span className="text-sm text-muted-foreground ml-2 font-mono">
                                        {field.value}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => field.onChange('')}
                                        className="text-muted-foreground hover:text-foreground"
                                        title="Remover cor"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                                <FormDescription>
                                  Esta cor será utilizada para personalizar a interface
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}

                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== */}
          {/* TAB: PÁGINA ONLINE */}
          {/* ===================== */}
          <TabsContent value="public-page">
            {!isMaxPlan ? (
              // Feature Bloqueada - Não é plano Max
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <Lock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-xl mb-2">Funcionalidade Exclusiva</h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                      Tenha seu próprio site de agendamento online com sua marca.
                      Disponível apenas no <strong>Plano Max</strong>.
                    </p>
                    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground mb-6">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span>Página personalizada com sua marca</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        <span>URL exclusiva: agendacerta.com/seu-negocio</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>Clientes agendam diretamente</span>
                      </div>
                    </div>
                    <Button disabled>
                      <Lock className="mr-2 h-4 w-4" />
                      Upgrade para Plano Max
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Formulário da Página Pública
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Página Online
                  </CardTitle>
                  <CardDescription>
                    Configure sua página de agendamento para clientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...publicPageForm}>
                    <form onSubmit={publicPageForm.handleSubmit(onPublicPageSubmit)} className="space-y-6">
                      {/* Ativar/Desativar Página */}
                      <FormField
                        control={publicPageForm.control}
                        name="public_page_enabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Página Ativa</FormLabel>
                              <FormDescription>
                                Quando ativada, sua página estará acessível publicamente
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Slug */}
                      <FormField
                        control={publicPageForm.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Endereço da Página</FormLabel>
                            <div className="flex items-center">
                              <span className="inline-flex items-center px-3 h-10 border border-r-0 rounded-l-md bg-muted text-sm text-muted-foreground">
                                agendacerta.com/
                              </span>
                              <FormControl>
                                <Input
                                  placeholder="seu-negocio"
                                  className="rounded-l-none"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                />
                              </FormControl>
                            </div>
                            <FormDescription>
                              Use apenas letras minúsculas, números e hífens
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Modo de Operação */}
                      <FormField
                        control={publicPageForm.control}
                        name="booking_mode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Modo de Operação
                              {isBookingModeLocked && (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              )}
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isBookingModeLocked}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o modo de operação" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="calendar">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>Agenda Online</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="inquiry">
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    <span>Solicitação de Orçamento</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="external_link">
                                  <div className="flex items-center gap-2">
                                    <ExternalLink className="h-4 w-4" />
                                    <span>Redirecionar para Link Externo</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {isBookingModeLocked ? (
                              <FormDescription className="flex items-center gap-1 text-warning-600">
                                <Lock className="h-3 w-3" />
                                O modo de operação não pode ser alterado após definido. Contate o suporte para mudanças.
                              </FormDescription>
                            ) : (
                              <FormDescription>
                                Define como clientes interagem com sua página
                              </FormDescription>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Campos Dinâmicos baseados no booking_mode */}
                      {watchedBookingMode === 'calendar' && (
                        <div className="rounded-lg border p-4 bg-muted/30">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span>Seus serviços e espaços serão listados automaticamente na agenda pública.</span>
                          </div>
                        </div>
                      )}

                      {watchedBookingMode === 'inquiry' && (
                        <div className="space-y-4 rounded-lg border p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">Configurações de Orçamento</span>
                          </div>

                          <FormField
                            control={publicPageForm.control}
                            name="inquiry_notification_email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email para Notificações *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="orcamentos@seudominio.com"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Você receberá as solicitações neste email
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={publicPageForm.control}
                            name="page_title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Título da Página</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Solicite seu orçamento"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={publicPageForm.control}
                            name="page_instruction"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Instruções para o Cliente</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Descreva o que você precisa e entraremos em contato em até 24h..."
                                    rows={3}
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Texto que aparece no formulário de orçamento
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {watchedBookingMode === 'external_link' && (
                        <div className="space-y-4 rounded-lg border p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">Configurações de Redirecionamento</span>
                          </div>

                          <FormField
                            control={publicPageForm.control}
                            name="external_link_url"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>URL de Destino *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="url"
                                    placeholder="https://seusite.com/agendamento"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Visitantes serão redirecionados para este link
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {/* Preview da URL */}
                      {publicPageForm.watch('slug') && (
                        <div className="rounded-lg border p-4 bg-primary/5">
                          <p className="text-sm text-muted-foreground mb-1">Sua página estará disponível em:</p>
                          <a
                            href={`https://agendacerta.com/${publicPageForm.watch('slug')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            agendacerta.com/{publicPageForm.watch('slug')}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      <Button type="submit" disabled={isPublicPageLoading}>
                        {isPublicPageLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Configurações
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===================== */}
          {/* TAB: INTEGRAÇÕES */}
          {/* ===================== */}
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Google Calendar</CardTitle>
                <CardDescription>
                  Sincronize suas reservas com o Google Calendar automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isGoogleLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : isConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800 dark:text-green-200">
                          Conectado ao Google Calendar
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Calendário: {connection?.calendar_id || 'Primário'}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Suas reservas serão sincronizadas automaticamente com seu Google Calendar.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => disconnect()}
                      disabled={isDisconnecting}
                    >
                      {isDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <XCircle className="mr-2 h-4 w-4" />
                      Desconectar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">Não conectado</p>
                        <p className="text-sm text-muted-foreground">
                          Conecte sua conta para sincronizar reservas
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => connect()}
                      disabled={isConnecting}
                    >
                      {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Calendar className="mr-2 h-4 w-4" />
                      Conectar Google Calendar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== */}
          {/* TAB: LEMBRETES */}
          {/* ===================== */}
          <TabsContent value="reminders">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Lembretes</CardTitle>
                <CardDescription>
                  Configure quando os lembretes devem ser enviados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...reminderForm}>
                  <form onSubmit={reminderForm.handleSubmit(onReminderSubmit)} className="space-y-4">
                    <FormField
                      control={reminderForm.control}
                      name="reminder_hours_before"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Antecedência do Lembrete</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[200px]">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 hora antes</SelectItem>
                              <SelectItem value="2">2 horas antes</SelectItem>
                              <SelectItem value="6">6 horas antes</SelectItem>
                              <SelectItem value="12">12 horas antes</SelectItem>
                              <SelectItem value="24">24 horas antes</SelectItem>
                              <SelectItem value="48">48 horas antes</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Quanto tempo antes da reserva o cliente receberá um lembrete
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== */}
          {/* TAB: EQUIPE */}
          {/* ===================== */}
          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Equipe</CardTitle>
                <CardDescription>
                  Convide membros para ajudar a gerenciar a unidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg">Em breve</h3>
                  <p className="text-muted-foreground mt-1 max-w-sm">
                    A funcionalidade de convite de membros estará disponível em uma próxima atualização
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

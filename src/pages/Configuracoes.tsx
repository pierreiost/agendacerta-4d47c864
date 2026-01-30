import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ImageIcon,
  Upload,
  Link,
  X,
} from 'lucide-react';

const venueFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  logo_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

const reminderFormSchema = z.object({
  reminder_hours_before: z.coerce.number().min(1).max(72),
});

type VenueFormData = z.infer<typeof venueFormSchema>;
type ReminderFormData = z.infer<typeof reminderFormSchema>;

export default function Configuracoes() {
  const { currentVenue, refetchVenues } = useVenue();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
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

  const isAdmin = currentVenue?.role === 'admin' || currentVenue?.role === 'superadmin';

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

  const venueForm = useForm<VenueFormData>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: {
      name: currentVenue?.name ?? '',
      address: currentVenue?.address ?? '',
      phone: currentVenue?.phone ?? '',
      email: currentVenue?.email ?? '',
      logo_url: currentVenue?.logo_url ?? '',
    },
  });

  // Form persistence for venue settings
  const { clearDraft: clearVenueDraft } = useFormPersist({
    form: venueForm,
    key: `venue_settings_${currentVenue?.id || 'default'}`,
    debounceMs: 500,
    showRecoveryToast: true,
  });

  useEffect(() => {
    if (currentVenue) {
      venueForm.reset({
        name: currentVenue.name ?? '',
        address: currentVenue.address ?? '',
        phone: currentVenue.phone ?? '',
        email: currentVenue.email ?? '',
        logo_url: currentVenue.logo_url ?? '',
      });
    }
  }, [currentVenue, venueForm]);

  const reminderForm = useForm<ReminderFormData>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      reminder_hours_before: currentVenue?.reminder_hours_before ?? 24,
    },
  });

  // Form persistence for reminder settings
  const { clearDraft: clearReminderDraft } = useFormPersist({
    form: reminderForm,
    key: `reminder_settings_${currentVenue?.id || 'default'}`,
    debounceMs: 500,
    showRecoveryToast: false, // Avoid multiple toasts
  });

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
      clearVenueDraft(); // Clear draft on successful save
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
      clearReminderDraft(); // Clear draft on successful save
      refetchVenues();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie as configurações da sua unidade
          </p>
        </div>

        <Tabs defaultValue="venue" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="venue">
              <Building2 className="mr-2 h-4 w-4" />
              Unidade
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

          {/* TAB: UNIDADE */}
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
                  <form onSubmit={venueForm.handleSubmit(onVenueSubmit)} className="space-y-4">
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

                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: INTEGRAÇÕES */}
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
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <div className="flex-1">
                        <p className="font-medium text-emerald-800 dark:text-emerald-200">
                          Conectado ao Google Calendar
                        </p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">
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

          {/* TAB: LEMBRETES */}
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

          {/* TAB: EQUIPE */}
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
                  <h3 className="font-semibold">Em breve</h3>
                  <p className="text-muted-foreground mt-1 text-sm max-w-sm">
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

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
import { Loader2, Building2, Bell, Users, Calendar, CheckCircle2, XCircle } from 'lucide-react';

const venueFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
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
  const {
    isConnected,
    connection,
    isLoading: isGoogleLoading,
    connect,
    isConnecting,
    disconnect,
    isDisconnecting,
  } = useGoogleCalendar();

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

  const venueForm = useForm<VenueFormData>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: {
      name: currentVenue?.name ?? '',
      address: currentVenue?.address ?? '',
      phone: currentVenue?.phone ?? '',
      email: currentVenue?.email ?? '',
    },
  });

  const reminderForm = useForm<ReminderFormData>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      reminder_hours_before: currentVenue?.reminder_hours_before ?? 24,
    },
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
          <TabsList>
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

                    <div className="grid grid-cols-2 gap-4">
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

                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

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

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTabPersist } from '@/hooks/useTabPersist';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useVenue } from '@/contexts/VenueContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFormPersist } from '@/hooks/useFormPersist';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useProfessionals } from '@/hooks/useProfessionals';
import { ProfessionalFormDialog } from '@/components/team/ProfessionalFormDialog';
import { TeamMembersList } from '@/components/team/TeamMembersList';
import { CreateMemberDialog } from '@/components/team/CreateMemberDialog';
import { VenueSettingsTab } from '@/components/settings/VenueSettingsTab';
import type { BookableMember } from '@/types/services';
import { getServiceIcon, getClientsLabel } from '@/lib/segment-utils';
import {
  Loader2,
  Building2,
  Bell,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Settings2,
  Scissors,
  Heart,
  Shield,
  UserPlus,
} from 'lucide-react';

const reminderFormSchema = z.object({
  reminder_hours_before: z.coerce.number().min(1).max(72),
});

type ReminderFormData = z.infer<typeof reminderFormSchema>;

export default function Configuracoes() {
  const { currentVenue, refetchVenues } = useVenue();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMember, setSelectedMember] = useState<BookableMember | null>(null);
  const [professionalDialogOpen, setProfessionalDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  
  const { activeTab, onTabChange } = useTabPersist({ key: 'configuracoes', defaultValue: 'venue' });
  
  const { professionals, isLoading: loadingProfessionals } = useProfessionals();
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
  
  // Check venue segment for conditional UI
  const venueSegment = (currentVenue as { segment?: string })?.segment;
  const isServiceVenue = venueSegment && venueSegment !== 'sports';
  const ServiceIcon = getServiceIcon(venueSegment);

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

  const reminderForm = useForm<ReminderFormData>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      reminder_hours_before: currentVenue?.reminder_hours_before ?? 24,
    },
  });

  // Reset reminder form when venue changes
  useEffect(() => {
    if (currentVenue) {
      reminderForm.reset({
        reminder_hours_before: currentVenue.reminder_hours_before ?? 24,
      });
    }
  }, [currentVenue?.id, currentVenue, reminderForm]);

  // Form persistence for reminder settings
  const { clearDraft: clearReminderDraft } = useFormPersist({
    form: reminderForm,
    key: `reminder_settings_${currentVenue?.id || 'default'}`,
    debounceMs: 500,
    showRecoveryToast: false, // Avoid multiple toasts
  });

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

        <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="venue">
              <Building2 className="mr-2 h-4 w-4" />
              Unidade
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Calendar className="mr-2 h-4 w-4" />
              Integrações
            </TabsTrigger>
{/* Aba de lembretes oculta para futuras implementações
            <TabsTrigger value="reminders">
              <Bell className="mr-2 h-4 w-4" />
              Lembretes
            </TabsTrigger>
*/}
            <TabsTrigger value="team">
              <Users className="mr-2 h-4 w-4" />
              Equipe
            </TabsTrigger>
          </TabsList>

          {/* TAB: UNIDADE */}
          <TabsContent value="venue">
            <VenueSettingsTab />
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

{/* TAB: LEMBRETES - Oculta para futuras implementações
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
*/}

          {/* TAB: EQUIPE */}
          <TabsContent value="team" className="space-y-6">
            {/* Seção: Permissões e Funções */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Membros e Permissões</CardTitle>
                      <CardDescription>
                        Gerencie os membros da equipe e suas permissões de acesso
                      </CardDescription>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button onClick={() => setInviteDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Adicionar Usuário
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <TeamMembersList />
              </CardContent>
            </Card>

            {/* Seção: Profissionais (apenas para venues de serviço) */}
            {isServiceVenue && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ServiceIcon className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Profissionais que Atendem</CardTitle>
                      <CardDescription>
                        Configure quais membros realizam atendimentos e seus serviços
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingProfessionals ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : professionals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="rounded-full bg-muted p-4 mb-4">
                        <ServiceIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold">Nenhum profissional configurado</h3>
                      <p className="text-muted-foreground mt-1 text-sm max-w-sm">
                        Configure os membros da equipe que realizam atendimentos
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Profissional</TableHead>
                          <TableHead>Atende {getClientsLabel(venueSegment, true)}</TableHead>
                          <TableHead>Serviços</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {professionals.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  {member.avatar_url ? (
                                    <AvatarImage src={member.avatar_url} />
                                  ) : null}
                                  <AvatarFallback>
                                    {(member.display_name || member.profile?.full_name || 'M')[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {member.display_name || member.profile?.full_name || 'Membro'}
                                  </p>
                                  {member.profile?.phone && (
                                    <p className="text-xs text-muted-foreground">
                                      {member.profile.phone}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={member.is_bookable ? 'default' : 'outline'}>
                                {member.is_bookable ? (
                                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Sim</>
                                ) : (
                                  <><XCircle className="h-3 w-3 mr-1" /> Não</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {member.services && member.services.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {member.services.slice(0, 2).map((s) => (
                                    <Badge key={s.id} variant="outline" className="text-xs">
                                      <ServiceIcon className="h-2 w-2 mr-1" />
                                      {s.title}
                                    </Badge>
                                  ))}
                                  {member.services.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{member.services.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMember(member);
                                  setProfessionalDialogOpen(true);
                                }}
                              >
                                <Settings2 className="h-4 w-4 mr-1" />
                                Configurar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>
      </div>

      <ProfessionalFormDialog
        open={professionalDialogOpen}
        onOpenChange={setProfessionalDialogOpen}
        member={selectedMember}
      />

      <CreateMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </AppLayout>
  );
}

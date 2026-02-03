import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin, SubscriptionStatus, VenueWithSubscription, VenueSegment, PlanType } from '@/hooks/useSuperAdmin';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Loader2, Building2, Users, AlertTriangle, CheckCircle2, XCircle, Clock, Ban, Scissors, Dumbbell, Heart, Sparkles, Send, Edit2, Phone, Mail, FileText, Calendar, Crown, Star, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const statusConfig: Record<SubscriptionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  trialing: { label: 'Trial', variant: 'secondary', icon: Clock },
  active: { label: 'Ativo', variant: 'default', icon: CheckCircle2 },
  overdue: { label: 'Inadimplente', variant: 'destructive', icon: AlertTriangle },
  suspended: { label: 'Suspenso', variant: 'outline', icon: XCircle },
};

const segmentConfig: Record<VenueSegment, { label: string; icon: typeof Dumbbell }> = {
  sports: { label: 'Esportes', icon: Dumbbell },
  beauty: { label: 'Barbearia/Beleza', icon: Scissors },
  health: { label: 'Clínica/Saúde', icon: Heart },
  custom: { label: 'Personalizado', icon: Sparkles },
};

const planConfig: Record<PlanType, { label: string; icon: typeof Star }> = {
  basic: { label: 'Basic', icon: Star },
  max: { label: 'Max', icon: Crown },
};

// Edit Expiration Modal
function EditExpirationModal({
  venue,
  isOpen,
  onClose,
  onSave,
}: {
  venue: VenueWithSubscription | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (venueId: string, trialEndsAt: string | null, subscriptionEndsAt: string | null) => void;
}) {
  const [trialEndsAt, setTrialEndsAt] = useState(venue?.trial_ends_at?.split('T')[0] || '');
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState(venue?.subscription_ends_at?.split('T')[0] || '');

  if (!venue) return null;

  const handleSave = () => {
    onSave(
      venue.id,
      trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
      subscriptionEndsAt ? new Date(subscriptionEndsAt).toISOString() : null
    );
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Datas de Expiração</DialogTitle>
          <DialogDescription>
            Altere as datas de expiração para {venue.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="trial_ends_at">Fim do Trial</Label>
            <Input
              id="trial_ends_at"
              type="date"
              value={trialEndsAt}
              onChange={(e) => setTrialEndsAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subscription_ends_at">Fim da Assinatura</Label>
            <Input
              id="subscription_ends_at"
              type="date"
              value={subscriptionEndsAt}
              onChange={(e) => setSubscriptionEndsAt(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Invoice Modal
function InvoiceModal({
  venue,
  isOpen,
  onClose,
}: {
  venue: VenueWithSubscription | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();

  if (!venue) return null;

  const handleSendInvoice = () => {
    // Simulate sending invoice
    toast({
      title: 'Fatura enviada!',
      description: `Fatura simulada enviada para ${venue.email || venue.whatsapp || 'cliente'}.`,
    });
    onClose();
  };

  const handleCopyWhatsAppMessage = async () => {
    const paymentLink = 'https://pay.agendacerta.com/invoice'; // Placeholder link
    const message = `Olá ${venue.name}, identificamos que a sua assinatura do Agenda Certa expirou. Para evitar bloqueios, regularize em ${paymentLink}. Dados: ${venue.cnpj_cpf || 'Não informado'}`;
    
    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: 'Mensagem copiada!',
        description: 'Agora é só colar no WhatsApp.',
      });
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar a mensagem.',
        variant: 'destructive',
      });
    }
  };

  const planPrice = venue.plan_type === 'max' ? 'R$ 199,00' : 'R$ 99,00';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Fatura</DialogTitle>
          <DialogDescription>
            Dados do cliente para cobrança
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{venue.name}</span>
            </div>
            
            {venue.cnpj_cpf && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>CPF/CNPJ: {venue.cnpj_cpf}</span>
              </div>
            )}
            
            {venue.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{venue.email}</span>
              </div>
            )}
            
            {venue.whatsapp && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{venue.whatsapp}</span>
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Plano:</span>
                <Badge variant="outline">{venue.plan_type === 'max' ? 'Max' : 'Basic'}</Badge>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-muted-foreground">Valor:</span>
                <span className="font-bold text-lg">{planPrice}/mês</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 p-3 text-sm text-yellow-800 dark:text-yellow-200">
            <p className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Simulação: A integração com ASAAS enviará a fatura automaticamente quando ativada.
            </p>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            variant="secondary" 
            onClick={handleCopyWhatsAppMessage}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Copiar Mensagem WhatsApp
          </Button>
          <Button onClick={handleSendInvoice} className="gap-2">
            <Send className="h-4 w-4" />
            Simular Envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VenueTable({ 
  venues, 
  onStatusChange,
  onSegmentChange,
  onPlanChange,
  onEditExpiration,
  onSendInvoice,
  isUpdating,
}: { 
  venues: VenueWithSubscription[];
  onStatusChange: (venueId: string, status: SubscriptionStatus) => void;
  onSegmentChange: (venueId: string, segment: VenueSegment) => void;
  onPlanChange: (venueId: string, plan: PlanType) => void;
  onEditExpiration: (venue: VenueWithSubscription) => void;
  onSendInvoice: (venue: VenueWithSubscription) => void;
  isUpdating: boolean;
}) {
  if (venues.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum cliente encontrado nesta categoria.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>CPF/CNPJ</TableHead>
          <TableHead>Contato</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Plano</TableHead>
          <TableHead>Período</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {venues.map((venue) => {
          const config = statusConfig[venue.status];
          const StatusIcon = config.icon;
          const isTrialExpired = venue.status === 'trialing' && 
            venue.trial_ends_at && 
            new Date(venue.trial_ends_at) < new Date();
          const planCfg = planConfig[venue.plan_type] || planConfig.basic;
          const PlanIcon = planCfg.icon;

          return (
            <TableRow key={venue.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{venue.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Criado {formatDistanceToNow(new Date(venue.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm">{venue.cnpj_cpf || '-'}</span>
              </TableCell>
              <TableCell>
                <div className="text-sm space-y-1">
                  {venue.whatsapp && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-green-600" />
                      <span>{venue.whatsapp}</span>
                    </div>
                  )}
                  {venue.email && <p className="text-muted-foreground">{venue.email}</p>}
                  {!venue.email && !venue.whatsapp && <span className="text-muted-foreground">-</span>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={isTrialExpired ? 'destructive' : config.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {isTrialExpired ? 'Trial Expirado' : config.label}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={venue.plan_type === 'max' ? 'default' : 'outline'} className="gap-1">
                  <PlanIcon className="h-3 w-3" />
                  {planCfg.label}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {venue.status === 'trialing' && venue.trial_ends_at && (
                    <div className={isTrialExpired ? 'text-destructive' : ''}>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(venue.trial_ends_at), 'dd/MM/yyyy')}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {isTrialExpired ? 'Expirou ' : 'Expira '}
                        {formatDistanceToNow(new Date(venue.trial_ends_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  )}
                  {venue.status === 'active' && venue.subscription_ends_at && (
                    <div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(venue.subscription_ends_at), 'dd/MM/yyyy')}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Renova {formatDistanceToNow(new Date(venue.subscription_ends_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  )}
                  {!venue.trial_ends_at && !venue.subscription_ends_at && '-'}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onSendInvoice(venue)}
                    className="gap-1"
                  >
                    <Send className="h-3 w-3" />
                    Fatura
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isUpdating}>
                        Ações
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Status da Assinatura</DropdownMenuLabel>
                      <DropdownMenuItem 
                        onClick={() => onStatusChange(venue.id, 'active')}
                        disabled={venue.status === 'active'}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                        Ativar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onStatusChange(venue.id, 'overdue')}
                        disabled={venue.status === 'overdue'}
                      >
                        <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />
                        Marcar Inadimplente
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onStatusChange(venue.id, 'suspended')}
                        disabled={venue.status === 'suspended'}
                      >
                        <Ban className="mr-2 h-4 w-4 text-destructive" />
                        Suspender
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Crown className="mr-2 h-4 w-4" />
                          Alterar Plano
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem
                            onClick={() => onPlanChange(venue.id, 'basic')}
                            disabled={venue.plan_type === 'basic'}
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Basic (R$ 99/mês)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onPlanChange(venue.id, 'max')}
                            disabled={venue.plan_type === 'max'}
                          >
                            <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                            Max (R$ 199/mês)
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Building2 className="mr-2 h-4 w-4" />
                          Alterar Segmento
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {(Object.keys(segmentConfig) as VenueSegment[]).map((seg) => {
                            const segCfg = segmentConfig[seg];
                            const SegIcon = segCfg.icon;
                            return (
                              <DropdownMenuItem
                                key={seg}
                                onClick={() => onSegmentChange(venue.id, seg)}
                                disabled={venue.segment === seg}
                              >
                                <SegIcon className="mr-2 h-4 w-4" />
                                {segCfg.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={() => onEditExpiration(venue)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Editar Datas
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function SuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const {
    isSuperAdmin,
    checkingRole,
    venues,
    loadingVenues,
    activeVenues,
    trialVenues,
    overdueVenues,
    suspendedVenues,
    expiredTrials,
    updateSubscriptionStatus,
    updateVenueSegment,
    updateVenuePlan,
    updateVenueExpiration,
  } = useSuperAdmin();

  const [editingVenue, setEditingVenue] = useState<VenueWithSubscription | null>(null);
  const [invoiceVenue, setInvoiceVenue] = useState<VenueWithSubscription | null>(null);

  if (authLoading || checkingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleStatusChange = (venueId: string, status: SubscriptionStatus) => {
    updateSubscriptionStatus.mutate({ venueId, status });
  };

  const handleSegmentChange = (venueId: string, segment: VenueSegment) => {
    updateVenueSegment.mutate({ venueId, segment });
  };

  const handlePlanChange = (venueId: string, plan: PlanType) => {
    updateVenuePlan.mutate({ venueId, plan });
  };

  const handleExpirationSave = (venueId: string, trialEndsAt: string | null, subscriptionEndsAt: string | null) => {
    updateVenueExpiration.mutate({ venueId, trialEndsAt, subscriptionEndsAt });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Painel SuperAdmin</h1>
              <p className="text-muted-foreground">
                CRM Financeiro - Gerencie clientes, assinaturas e cobranças.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-5 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{venues.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeVenues.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Em Trial</CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{trialVenues.length}</div>
                  {expiredTrials.length > 0 && (
                    <p className="text-xs text-destructive">
                      {expiredTrials.length} expirado(s)
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Inadimplentes</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overdueVenues.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Suspensos</CardTitle>
                  <XCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{suspendedVenues.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* ASAAS Integration Notice */}
            <Card className="mb-8 border-dashed border-2 border-muted-foreground/25">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Integração ASAAS
                </CardTitle>
                <CardDescription>
                  A integração com ASAAS para cobrança automática está preparada. 
                  Quando ativada, os campos <code className="text-xs bg-muted px-1 rounded">asaas_customer_id</code> e 
                  <code className="text-xs bg-muted px-1 rounded">asaas_subscription_id</code> serão usados para gerenciar assinaturas.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Venues Tabs */}
            <Card>
              <CardHeader>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>
                  Visualize e gerencie o status de todos os clientes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingVenues ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="all">Todos ({venues.length})</TabsTrigger>
                      <TabsTrigger value="active">Ativos ({activeVenues.length})</TabsTrigger>
                      <TabsTrigger value="trial">Trial ({trialVenues.length})</TabsTrigger>
                      <TabsTrigger value="overdue">Inadimplentes ({overdueVenues.length})</TabsTrigger>
                      <TabsTrigger value="suspended">Suspensos ({suspendedVenues.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all">
                      <VenueTable 
                        venues={venues} 
                        onStatusChange={handleStatusChange}
                        onSegmentChange={handleSegmentChange}
                        onPlanChange={handlePlanChange}
                        onEditExpiration={setEditingVenue}
                        onSendInvoice={setInvoiceVenue}
                        isUpdating={updateSubscriptionStatus.isPending || updateVenueSegment.isPending || updateVenuePlan.isPending}
                      />
                    </TabsContent>
                    <TabsContent value="active">
                      <VenueTable 
                        venues={activeVenues} 
                        onStatusChange={handleStatusChange}
                        onSegmentChange={handleSegmentChange}
                        onPlanChange={handlePlanChange}
                        onEditExpiration={setEditingVenue}
                        onSendInvoice={setInvoiceVenue}
                        isUpdating={updateSubscriptionStatus.isPending || updateVenueSegment.isPending || updateVenuePlan.isPending}
                      />
                    </TabsContent>
                    <TabsContent value="trial">
                      <VenueTable 
                        venues={trialVenues} 
                        onStatusChange={handleStatusChange}
                        onSegmentChange={handleSegmentChange}
                        onPlanChange={handlePlanChange}
                        onEditExpiration={setEditingVenue}
                        onSendInvoice={setInvoiceVenue}
                        isUpdating={updateSubscriptionStatus.isPending || updateVenueSegment.isPending || updateVenuePlan.isPending}
                      />
                    </TabsContent>
                    <TabsContent value="overdue">
                      <VenueTable 
                        venues={overdueVenues} 
                        onStatusChange={handleStatusChange}
                        onSegmentChange={handleSegmentChange}
                        onPlanChange={handlePlanChange}
                        onEditExpiration={setEditingVenue}
                        onSendInvoice={setInvoiceVenue}
                        isUpdating={updateSubscriptionStatus.isPending || updateVenueSegment.isPending || updateVenuePlan.isPending}
                      />
                    </TabsContent>
                    <TabsContent value="suspended">
                      <VenueTable 
                        venues={suspendedVenues} 
                        onStatusChange={handleStatusChange}
                        onSegmentChange={handleSegmentChange}
                        onPlanChange={handlePlanChange}
                        onEditExpiration={setEditingVenue}
                        onSendInvoice={setInvoiceVenue}
                        isUpdating={updateSubscriptionStatus.isPending || updateVenueSegment.isPending || updateVenuePlan.isPending}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Modals */}
      <EditExpirationModal
        venue={editingVenue}
        isOpen={!!editingVenue}
        onClose={() => setEditingVenue(null)}
        onSave={handleExpirationSave}
      />

      <InvoiceModal
        venue={invoiceVenue}
        isOpen={!!invoiceVenue}
        onClose={() => setInvoiceVenue(null)}
      />
    </SidebarProvider>
  );
}

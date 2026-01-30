import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin, SubscriptionStatus, VenueWithSubscription, VenueSegment } from '@/hooks/useSuperAdmin';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Loader2, Building2, Users, AlertTriangle, CheckCircle2, XCircle, Clock, Ban, Scissors, Dumbbell, Heart, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<SubscriptionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  trial: { label: 'Trial', variant: 'secondary', icon: Clock },
  active: { label: 'Ativo', variant: 'default', icon: CheckCircle2 },
  suspended: { label: 'Suspenso', variant: 'destructive', icon: AlertTriangle },
  cancelled: { label: 'Cancelado', variant: 'outline', icon: XCircle },
};

const segmentConfig: Record<VenueSegment, { label: string; icon: typeof Dumbbell }> = {
  sports: { label: 'Esportes', icon: Dumbbell },
  beauty: { label: 'Barbearia/Beleza', icon: Scissors },
  health: { label: 'Clínica/Saúde', icon: Heart },
  custom: { label: 'Personalizado', icon: Sparkles },
};

function VenueTable({ 
  venues, 
  onStatusChange,
  onSegmentChange,
  isUpdating,
}: { 
  venues: VenueWithSubscription[];
  onStatusChange: (venueId: string, status: SubscriptionStatus) => void;
  onSegmentChange: (venueId: string, segment: VenueSegment) => void;
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
          <TableHead>Segmento</TableHead>
          <TableHead>Contato</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Período</TableHead>
          <TableHead>Membros</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {venues.map((venue) => {
          const config = statusConfig[venue.subscription_status];
          const StatusIcon = config.icon;
          const isTrialExpired = venue.subscription_status === 'trial' && 
            venue.trial_ends_at && 
            new Date(venue.trial_ends_at) < new Date();

          return (
            <TableRow key={venue.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{venue.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Criado {formatDistanceToNow(new Date(venue.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {(() => {
                  const segConfig = segmentConfig[venue.segment] || segmentConfig.sports;
                  const SegIcon = segConfig.icon;
                  return (
                    <Badge variant="outline" className="gap-1">
                      <SegIcon className="h-3 w-3" />
                      {segConfig.label}
                    </Badge>
                  );
                })()}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {venue.email && <p>{venue.email}</p>}
                  {venue.phone && <p className="text-muted-foreground">{venue.phone}</p>}
                  {!venue.email && !venue.phone && <span className="text-muted-foreground">-</span>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={isTrialExpired ? 'destructive' : config.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {isTrialExpired ? 'Trial Expirado' : config.label}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {venue.subscription_status === 'trial' && venue.trial_ends_at && (
                    <span className={isTrialExpired ? 'text-destructive' : ''}>
                      {isTrialExpired ? 'Expirou ' : 'Expira '}
                      {formatDistanceToNow(new Date(venue.trial_ends_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  )}
                  {venue.subscription_status === 'active' && venue.subscription_ends_at && (
                    <span>
                      Renova {format(new Date(venue.subscription_ends_at), 'dd/MM/yyyy')}
                    </span>
                  )}
                  {!venue.trial_ends_at && !venue.subscription_ends_at && '-'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{venue.members.length}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isUpdating}>
                      Ações
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Status da Assinatura</DropdownMenuLabel>
                    <DropdownMenuItem 
                      onClick={() => onStatusChange(venue.id, 'active')}
                      disabled={venue.subscription_status === 'active'}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      Ativar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onStatusChange(venue.id, 'suspended')}
                      disabled={venue.subscription_status === 'suspended'}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />
                      Suspender
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onStatusChange(venue.id, 'cancelled')}
                      disabled={venue.subscription_status === 'cancelled'}
                    >
                      <Ban className="mr-2 h-4 w-4 text-destructive" />
                      Cancelar
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
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
                  </DropdownMenuContent>
                </DropdownMenu>
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
    suspendedVenues,
    cancelledVenues,
    expiredTrials,
    updateSubscriptionStatus,
    updateVenueSegment,
  } = useSuperAdmin();

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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Painel SuperAdmin</h1>
              <p className="text-muted-foreground">
                Gerencie todos os clientes e assinaturas da plataforma.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
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
                  <CardTitle className="text-sm font-medium">Suspensos</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
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
                      <TabsTrigger value="suspended">Suspensos ({suspendedVenues.length})</TabsTrigger>
                      <TabsTrigger value="cancelled">Cancelados ({cancelledVenues.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all">
                      <VenueTable 
                        venues={venues} 
                        onStatusChange={handleStatusChange}
                        onSegmentChange={handleSegmentChange}
                        isUpdating={updateSubscriptionStatus.isPending || updateVenueSegment.isPending}
                      />
                    </TabsContent>
                    <TabsContent value="active">
                      <VenueTable 
                        venues={activeVenues} 
                        onStatusChange={handleStatusChange}
                        onSegmentChange={handleSegmentChange}
                        isUpdating={updateSubscriptionStatus.isPending || updateVenueSegment.isPending}
                      />
                    </TabsContent>
                    <TabsContent value="trial">
                      <VenueTable 
                        venues={trialVenues} 
                        onStatusChange={handleStatusChange}
                        onSegmentChange={handleSegmentChange}
                        isUpdating={updateSubscriptionStatus.isPending || updateVenueSegment.isPending}
                      />
                    </TabsContent>
                    <TabsContent value="suspended">
                      <VenueTable 
                        venues={suspendedVenues} 
                        onStatusChange={handleStatusChange}
                        onSegmentChange={handleSegmentChange}
                        isUpdating={updateSubscriptionStatus.isPending || updateVenueSegment.isPending}
                      />
                    </TabsContent>
                    <TabsContent value="cancelled">
                      <VenueTable 
                        venues={cancelledVenues} 
                        onStatusChange={handleStatusChange}
                        onSegmentChange={handleSegmentChange}
                        isUpdating={updateSubscriptionStatus.isPending || updateVenueSegment.isPending}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

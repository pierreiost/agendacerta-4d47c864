import { useState } from 'react';
import { useSuperAdmin, SubscriptionStatus, VenueWithSubscription, VenueSegment, PlanType } from '@/hooks/useSuperAdmin';
import { Building2, Users, AlertTriangle, CheckCircle2, XCircle, Clock, Ban, Scissors, Dumbbell, Heart, Sparkles, Send, Edit2, Phone, Mail, FileText, Calendar, Crown, Star, Copy, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
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

function EditExpirationModal({
  venue, isOpen, onClose, onSave,
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
    onSave(venue.id, trialEndsAt ? new Date(trialEndsAt).toISOString() : null, subscriptionEndsAt ? new Date(subscriptionEndsAt).toISOString() : null);
    onClose();
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent><DialogHeader><DialogTitle>Editar Datas de Expiração</DialogTitle><DialogDescription>Altere as datas de expiração para {venue.name}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label htmlFor="trial_ends_at">Fim do Trial</Label><Input id="trial_ends_at" type="date" value={trialEndsAt} onChange={(e) => setTrialEndsAt(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="subscription_ends_at">Fim da Assinatura</Label><Input id="subscription_ends_at" type="date" value={subscriptionEndsAt} onChange={(e) => setSubscriptionEndsAt(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceModal({ venue, isOpen, onClose }: { venue: VenueWithSubscription | null; isOpen: boolean; onClose: () => void }) {
  const { toast } = useToast();
  if (!venue) return null;
  const handleSendInvoice = () => { toast({ title: 'Fatura enviada!', description: `Fatura simulada enviada para ${venue.email || venue.whatsapp || 'cliente'}.` }); onClose(); };
  const handleCopyWhatsAppMessage = async () => {
    const message = `Olá ${venue.name}, identificamos que a sua assinatura do Agenda Certa expirou. Para evitar bloqueios, regularize em https://pay.agendacerta.com/invoice. Dados: ${venue.cnpj_cpf || 'Não informado'}`;
    try { await navigator.clipboard.writeText(message); toast({ title: 'Mensagem copiada!' }); } catch { toast({ title: 'Erro ao copiar', variant: 'destructive' }); }
  };
  const planPrice = venue.plan_type === 'max' ? 'R$ 199,00' : 'R$ 99,00';
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Enviar Fatura</DialogTitle><DialogDescription>Dados do cliente para cobrança</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{venue.name}</span></div>
            {venue.cnpj_cpf && <div className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-muted-foreground" /><span>CPF/CNPJ: {venue.cnpj_cpf}</span></div>}
            {venue.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span>{venue.email}</span></div>}
            {venue.whatsapp && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{venue.whatsapp}</span></div>}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Plano:</span><Badge variant="outline">{venue.plan_type === 'max' ? 'Max' : 'Basic'}</Badge></div>
              <div className="flex justify-between items-center mt-1"><span className="text-sm text-muted-foreground">Valor:</span><span className="font-bold text-lg">{planPrice}/mês</span></div>
            </div>
          </div>
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 p-3 text-sm text-yellow-800 dark:text-yellow-200">
            <p className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Simulação: A integração com ASAAS enviará a fatura automaticamente quando ativada.</p>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="secondary" onClick={handleCopyWhatsAppMessage} className="gap-2"><Copy className="h-4 w-4" />Copiar Mensagem WhatsApp</Button>
          <Button onClick={handleSendInvoice} className="gap-2"><Send className="h-4 w-4" />Simular Envio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VenueTable({ venues, onStatusChange, onSegmentChange, onPlanChange, onEditExpiration, onSendInvoice, isUpdating }: {
  venues: VenueWithSubscription[];
  onStatusChange: (venueId: string, status: SubscriptionStatus) => void;
  onSegmentChange: (venueId: string, segment: VenueSegment) => void;
  onPlanChange: (venueId: string, plan: PlanType) => void;
  onEditExpiration: (venue: VenueWithSubscription) => void;
  onSendInvoice: (venue: VenueWithSubscription) => void;
  isUpdating: boolean;
}) {
  if (venues.length === 0) return <div className="text-center py-8 text-white/40">Nenhum cliente encontrado nesta categoria.</div>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="text-white/50">Cliente</TableHead>
            <TableHead className="text-white/50">CPF/CNPJ</TableHead>
            <TableHead className="text-white/50">Contato</TableHead>
            <TableHead className="text-white/50">Status</TableHead>
            <TableHead className="text-white/50">Plano</TableHead>
            <TableHead className="text-white/50">Período</TableHead>
            <TableHead className="text-right text-white/50">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {venues.map((venue) => {
            const config = statusConfig[venue.status];
            const StatusIcon = config.icon;
            const isTrialExpired = venue.status === 'trialing' && venue.trial_ends_at && new Date(venue.trial_ends_at) < new Date();
            const planCfg = planConfig[venue.plan_type] || planConfig.basic;
            const PlanIcon = planCfg.icon;
            return (
              <TableRow key={venue.id} className="border-white/5 hover:bg-white/5">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20"><Building2 className="h-5 w-5 text-indigo-400" /></div>
                    <div><p className="font-medium text-white/90">{venue.name}</p><p className="text-xs text-white/40">Criado {formatDistanceToNow(new Date(venue.created_at), { addSuffix: true, locale: ptBR })}</p></div>
                  </div>
                </TableCell>
                <TableCell><span className="font-mono text-sm text-white/70">{venue.cnpj_cpf || '-'}</span></TableCell>
                <TableCell>
                  <div className="text-sm space-y-1">
                    {venue.whatsapp && <div className="flex items-center gap-1 text-white/70"><Phone className="h-3 w-3 text-green-400" /><span>{venue.whatsapp}</span></div>}
                    {venue.email && <p className="text-white/50">{venue.email}</p>}
                    {!venue.email && !venue.whatsapp && <span className="text-white/30">-</span>}
                  </div>
                </TableCell>
                <TableCell><Badge variant={isTrialExpired ? 'destructive' : config.variant} className="gap-1"><StatusIcon className="h-3 w-3" />{isTrialExpired ? 'Trial Expirado' : config.label}</Badge></TableCell>
                <TableCell><Badge variant={venue.plan_type === 'max' ? 'default' : 'outline'} className="gap-1"><PlanIcon className="h-3 w-3" />{planCfg.label}</Badge></TableCell>
                <TableCell>
                  <div className="text-sm text-white/70">
                    {venue.status === 'trialing' && venue.trial_ends_at && (
                      <div className={isTrialExpired ? 'text-red-400' : ''}>
                        <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(venue.trial_ends_at), 'dd/MM/yyyy')}</div>
                        <span className="text-xs text-white/40">{isTrialExpired ? 'Expirou ' : 'Expira '}{formatDistanceToNow(new Date(venue.trial_ends_at), { addSuffix: true, locale: ptBR })}</span>
                      </div>
                    )}
                    {venue.status === 'active' && venue.subscription_ends_at && (
                      <div><div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(venue.subscription_ends_at), 'dd/MM/yyyy')}</div><span className="text-xs text-white/40">Renova {formatDistanceToNow(new Date(venue.subscription_ends_at), { addSuffix: true, locale: ptBR })}</span></div>
                    )}
                    {!venue.trial_ends_at && !venue.subscription_ends_at && '-'}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onSendInvoice(venue)} className="gap-1 border-white/20 text-white/70 hover:bg-white/10"><Send className="h-3 w-3" />Fatura</Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" size="sm" disabled={isUpdating} className="border-white/20 text-white/70 hover:bg-white/10">Ações</Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Status da Assinatura</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onStatusChange(venue.id, 'active')} disabled={venue.status === 'active'}><CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />Ativar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange(venue.id, 'overdue')} disabled={venue.status === 'overdue'}><AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />Marcar Inadimplente</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange(venue.id, 'suspended')} disabled={venue.status === 'suspended'}><Ban className="mr-2 h-4 w-4 text-destructive" />Suspender</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger><Crown className="mr-2 h-4 w-4" />Alterar Plano</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => onPlanChange(venue.id, 'basic')} disabled={venue.plan_type === 'basic'}><Star className="mr-2 h-4 w-4" />Basic (R$ 99/mês)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onPlanChange(venue.id, 'max')} disabled={venue.plan_type === 'max'}><Crown className="mr-2 h-4 w-4 text-yellow-500" />Max (R$ 199/mês)</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger><Building2 className="mr-2 h-4 w-4" />Alterar Segmento</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {(Object.keys(segmentConfig) as VenueSegment[]).map((seg) => {
                              const segCfg = segmentConfig[seg];
                              const SegIcon = segCfg.icon;
                              return <DropdownMenuItem key={seg} onClick={() => onSegmentChange(venue.id, seg)} disabled={venue.segment === seg}><SegIcon className="mr-2 h-4 w-4" />{segCfg.label}</DropdownMenuItem>;
                            })}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEditExpiration(venue)}><Edit2 className="mr-2 h-4 w-4" />Editar Datas</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function VenueClientsTab() {
  const {
    venues, loadingVenues, activeVenues, trialVenues, overdueVenues, suspendedVenues, expiredTrials,
    updateSubscriptionStatus, updateVenueSegment, updateVenuePlan, updateVenueExpiration,
  } = useSuperAdmin();

  const [editingVenue, setEditingVenue] = useState<VenueWithSubscription | null>(null);
  const [invoiceVenue, setInvoiceVenue] = useState<VenueWithSubscription | null>(null);

  const handleStatusChange = (venueId: string, status: SubscriptionStatus) => updateSubscriptionStatus.mutate({ venueId, status });
  const handleSegmentChange = (venueId: string, segment: VenueSegment) => updateVenueSegment.mutate({ venueId, segment });
  const handlePlanChange = (venueId: string, plan: PlanType) => updateVenuePlan.mutate({ venueId, plan });
  const handleExpirationSave = (venueId: string, trialEndsAt: string | null, subscriptionEndsAt: string | null) => updateVenueExpiration.mutate({ venueId, trialEndsAt, subscriptionEndsAt });
  const isUpdating = updateSubscriptionStatus.isPending || updateVenueSegment.isPending || updateVenuePlan.isPending;

  if (loadingVenues) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-400" /></div>;
  }

  return (
    <>
      {/* Stats row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5 mb-6">
        {[
          { label: 'Total', value: venues.length, color: 'text-white/80' },
          { label: 'Ativos', value: activeVenues.length, color: 'text-green-400' },
          { label: 'Trial', value: trialVenues.length, color: 'text-blue-400', sub: expiredTrials.length > 0 ? `${expiredTrials.length} expirado(s)` : undefined },
          { label: 'Inadimplentes', value: overdueVenues.length, color: 'text-yellow-400' },
          { label: 'Suspensos', value: suspendedVenues.length, color: 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-white/50">{s.label}</p>
            {s.sub && <p className="text-[10px] text-red-400 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
        <Tabs defaultValue="all" className="w-full">
          <div className="px-4 pt-4">
            <TabsList className="bg-white/10 border border-white/10">
              <TabsTrigger value="all" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">Todos ({venues.length})</TabsTrigger>
              <TabsTrigger value="active" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">Ativos ({activeVenues.length})</TabsTrigger>
              <TabsTrigger value="trial" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">Trial ({trialVenues.length})</TabsTrigger>
              <TabsTrigger value="overdue" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">Inadimplentes ({overdueVenues.length})</TabsTrigger>
              <TabsTrigger value="suspended" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">Suspensos ({suspendedVenues.length})</TabsTrigger>
            </TabsList>
          </div>
          {['all', 'active', 'trial', 'overdue', 'suspended'].map((tab) => {
            const map: Record<string, VenueWithSubscription[]> = { all: venues, active: activeVenues, trial: trialVenues, overdue: overdueVenues, suspended: suspendedVenues };
            return (
              <TabsContent key={tab} value={tab} className="p-0 mt-0">
                <VenueTable venues={map[tab]} onStatusChange={handleStatusChange} onSegmentChange={handleSegmentChange} onPlanChange={handlePlanChange} onEditExpiration={setEditingVenue} onSendInvoice={setInvoiceVenue} isUpdating={isUpdating} />
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      <EditExpirationModal venue={editingVenue} isOpen={!!editingVenue} onClose={() => setEditingVenue(null)} onSave={handleExpirationSave} />
      <InvoiceModal venue={invoiceVenue} isOpen={!!invoiceVenue} onClose={() => setInvoiceVenue(null)} />
    </>
  );
}

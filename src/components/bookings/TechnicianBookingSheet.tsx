import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBooking, useBookings, type Booking } from '@/hooks/useBookings';
import { useLinkedServiceOrder } from '@/hooks/useLinkedServiceOrder';
import { useRegisterCustomer } from '@/hooks/useRegisterCustomer';
import { DuplicateCustomerDialog } from './DuplicateCustomerDialog';
import { format, parseISO, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  User,
  Phone,
  Mail,
  Clock,
  FileText,
  ExternalLink,
  Plus,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  UserPlus,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { 
  label: string; 
  className: string;
}> = {
  PENDING: { 
    label: 'Pendente', 
    className: 'bg-warning-100 text-warning-800 border-warning-300 hover:bg-warning-200'
  },
  CONFIRMED: { 
    label: 'Confirmado', 
    className: 'bg-success-100 text-success-800 border-success-300 hover:bg-success-200'
  },
  CANCELLED: { 
    label: 'Cancelado', 
    className: 'bg-error-100 text-error-800 border-error-300 hover:bg-error-200'
  },
  FINALIZED: { 
    label: 'Finalizado', 
    className: 'bg-primary-100 text-primary-800 border-primary-300 hover:bg-primary-200'
  },
};

const OS_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  open: { label: 'Aberta', variant: 'secondary' },
  finished: { label: 'Finalizada', variant: 'default' },
  invoiced: { label: 'Faturada', variant: 'outline' },
  draft: { label: 'Rascunho', variant: 'secondary' },
  approved: { label: 'Aprovada', variant: 'default' },
  in_progress: { label: 'Em Andamento', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'outline' },
};

interface TechnicianBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
}

export function TechnicianBookingSheet({
  open,
  onOpenChange,
  booking: initialBooking,
}: TechnicianBookingSheetProps) {
  const navigate = useNavigate();
  const { data: booking, isLoading: bookingLoading } = useBooking(initialBooking?.id ?? null);
  const { serviceOrder, hasLinkedOrder, isLoading: osLoading } = useLinkedServiceOrder(booking ?? null);
  const { updateBooking } = useBookings();
  const { registerCustomerFromBooking, isRegistering, duplicates, linkExistingCustomer, forceCreate, dismissDuplicates } = useRegisterCustomer();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const isLoading = bookingLoading || osLoading;

  if (!booking) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:w-[540px]">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const startTime = parseISO(booking.start_time);
  const endTime = parseISO(booking.end_time);
  const duration = differenceInHours(endTime, startTime);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleConfirm = async () => {
    await updateBooking.mutateAsync({ id: booking.id, status: 'CONFIRMED' });
  };

  const handleCancel = async () => {
    await updateBooking.mutateAsync({ id: booking.id, status: 'CANCELLED' });
    setCancelDialogOpen(false);
  };

  const handleFinalize = async () => {
    await updateBooking.mutateAsync({ id: booking.id, status: 'FINALIZED' });
  };

  const handleCreateOS = () => {
    // Navigate to create OS with pre-filled data
    const metadata = booking.metadata as Record<string, unknown> | null;
    const customerId = metadata?.customer_id || booking.customer_id;
    const params = new URLSearchParams();
    params.set('bookingId', booking.id);
    if (customerId) params.set('customerId', String(customerId));
    navigate(`/ordens-servico/nova?${params.toString()}`);
    onOpenChange(false);
  };

  const handleOpenOS = () => {
    if (serviceOrder) {
      navigate(`/ordens-servico/${serviceOrder.id}`);
      onOpenChange(false);
    }
  };

  const isFinalized = booking.status === 'FINALIZED';
  const isCancelled = booking.status === 'CANCELLED';
  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;

  const getOsStatus = () => {
    if (!serviceOrder) return null;
    const status = serviceOrder.order_type === 'simple' 
      ? serviceOrder.status_simple 
      : serviceOrder.status_complete;
    return status ? OS_STATUS_CONFIG[status] : null;
  };

  const osStatus = getOsStatus();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:w-[540px] flex flex-col p-0 bg-background/80 backdrop-blur-xl border-l border-border/50 shadow-2xl">
          <SheetHeader className="px-6 py-5 border-b border-border/50 bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold">Detalhes do Atendimento</SheetTitle>
              <Badge 
                variant="outline" 
                className={cn("font-semibold border-2 px-3 py-1", statusConfig.className)}
              >
                {statusConfig.label}
              </Badge>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Cliente
                  </h3>
                  {!booking.customer_id && !isFinalized && !isCancelled && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => registerCustomerFromBooking(booking)}
                      disabled={isRegistering}
                    >
                      <UserPlus className="h-3 w-3" />
                      Cadastrar Cliente
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{booking.customer_name}</span>
                  </div>
                  {booking.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{booking.customer_phone}</span>
                    </div>
                  )}
                  {booking.customer_email && !booking.customer_email.includes('@agendamento.local') && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{booking.customer_email}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Scheduling Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Agendamento
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(startTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-sm font-medium">
                      {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')} ({duration}h)
                    </span>
                  </div>
                </div>

                {booking.notes && (
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    <p className="text-muted-foreground">{booking.notes}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Service Order Section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Ordem de Serviço
                </h3>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : hasLinkedOrder && serviceOrder ? (
                  <Card className="border-primary/20">
                    <CardContent className="p-4 space-y-4">
                      {/* OS Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <span className="font-semibold">OS #{serviceOrder.order_number}</span>
                        </div>
                        {osStatus && (
                          <Badge variant={osStatus.variant}>{osStatus.label}</Badge>
                        )}
                      </div>

                      {/* OS Items Preview */}
                      {serviceOrder.items.length > 0 && (
                        <div className="space-y-1">
                          {serviceOrder.items.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-muted-foreground truncate flex-1">
                                {item.quantity}x {item.description}
                              </span>
                              <span className="ml-2">{formatCurrency(item.subtotal)}</span>
                            </div>
                          ))}
                          {serviceOrder.items.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{serviceOrder.items.length - 3} itens...
                            </p>
                          )}
                        </div>
                      )}

                      <Separator />

                      {/* OS Totals */}
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>{formatCurrency(serviceOrder.subtotal)}</span>
                        </div>
                        {(serviceOrder.discount ?? 0) > 0 && (
                          <div className="flex justify-between text-success-600">
                            <span>Desconto</span>
                            <span>-{formatCurrency(serviceOrder.discount ?? 0)}</span>
                          </div>
                        )}
                        {serviceOrder.order_type === 'complete' && (serviceOrder.tax_amount ?? 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              ISS ({((serviceOrder.tax_rate ?? 0) * 100).toFixed(0)}%)
                            </span>
                            <span>{formatCurrency(serviceOrder.tax_amount ?? 0)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold text-base pt-1 border-t">
                          <span>Total</span>
                          <span className="text-primary">{formatCurrency(serviceOrder.total)}</span>
                        </div>
                      </div>

                      {/* Open OS Button */}
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={handleOpenOS}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir OS Completa
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="p-6 text-center space-y-3">
                      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Nenhuma OS vinculada</p>
                        <p className="text-sm text-muted-foreground">
                          Crie uma ordem de serviço para este atendimento
                        </p>
                      </div>
                      <Button onClick={handleCreateOS} className="mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Ordem de Serviço
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Actions */}
          {!isFinalized && !isCancelled && (
            <div className="p-4 border-t space-y-2">
              {hasLinkedOrder && serviceOrder && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleFinalize}
                  disabled={updateBooking.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Finalizar Atendimento
                </Button>
              )}
              <div className="flex gap-2">
                {booking.status === 'PENDING' && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleConfirm}
                    disabled={updateBooking.isPending}
                  >
                    Confirmar
                  </Button>
                )}
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {isFinalized && (
            <div className="p-4 border-t">
              <div className="flex items-center justify-center gap-2 text-success-600 py-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Atendimento concluído</span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar atendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este atendimento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar Atendimento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DuplicateCustomerDialog
        open={duplicates.length > 0}
        duplicates={duplicates}
        onLinkExisting={linkExistingCustomer}
        onForceCreate={forceCreate}
        onCancel={dismissDuplicates}
      />
    </>
  );
}

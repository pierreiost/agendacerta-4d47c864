import { useState } from 'react';
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
import { useBookingServices } from '@/hooks/useBookingServices';
import { useOrderItems } from '@/hooks/useOrderItems';
import { OrderItemsList } from './OrderItemsList';
import { AddProductDialog } from './AddProductDialog';
import { AddCustomItemDialog } from './AddCustomItemDialog';
import { CheckoutDialog } from './CheckoutDialog';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  User,
  Phone,
  Mail,
  Clock,
  Plus,
  ShoppingBag,
  CreditCard,
  Loader2,
  X,
  Scissors,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  PENDING: {
    label: 'Pendente',
    variant: 'secondary',
    className: 'bg-warning-100 text-warning-800 border-warning-300 hover:bg-warning-200',
  },
  CONFIRMED: {
    label: 'Confirmado',
    variant: 'default',
    className: 'bg-success-100 text-success-800 border-success-300 hover:bg-success-200',
  },
  CANCELLED: {
    label: 'Cancelado',
    variant: 'destructive',
    className: 'bg-error-100 text-error-800 border-error-300 hover:bg-error-200',
  },
  FINALIZED: {
    label: 'Finalizado',
    variant: 'outline',
    className: 'bg-primary-100 text-primary-800 border-primary-300 hover:bg-primary-200',
  },
};

interface BeautyBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
}

export function BeautyBookingSheet({
  open,
  onOpenChange,
  booking: initialBooking,
}: BeautyBookingSheetProps) {
  const { data: booking, isLoading } = useBooking(initialBooking?.id ?? null);
  const { services, servicesTotal, totalDuration } = useBookingServices(booking?.id ?? null);
  const { orderItems, itemsTotal, removeOrderItem } = useOrderItems(booking?.id ?? null);
  const { updateBooking } = useBookings();

  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addCustomOpen, setAddCustomOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  if (!booking) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const startTime = parseISO(booking.start_time);
  const grandTotal = servicesTotal + itemsTotal;

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

  const isFinalized = booking.status === 'FINALIZED';
  const isCancelled = booking.status === 'CANCELLED';
  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0 bg-background/80 backdrop-blur-xl border-l border-border/50 shadow-2xl">
          <SheetHeader className="px-6 py-5 border-b border-border/50 bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold">Detalhes do Agendamento</SheetTitle>
              <Badge
                variant="outline"
                className={cn('font-semibold border-2 px-3 py-1', statusConfig.className)}
              >
                {statusConfig.label}
              </Badge>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Cliente
                </h3>
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
                  {booking.customer_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{booking.customer_email}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Appointment Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Agendamento
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(startTime, "d 'de' MMMM, yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-sm">
                      {format(startTime, 'HH:mm')} · {totalDuration} min
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

              {/* Services */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Serviços
                </h3>
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum serviço registrado.</p>
                ) : (
                  <div className="space-y-2">
                    {services.map((s) => {
                      const profName =
                        s.professional?.display_name ||
                        s.professional?.profile?.full_name ||
                        null;
                      return (
                        <div key={s.id} className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Scissors className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium truncate">
                                {s.service?.title}
                              </span>
                            </div>
                            {profName && (
                              <span className="text-xs text-muted-foreground pl-5">
                                {profName} · {s.duration_minutes} min
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium whitespace-nowrap">
                            {formatCurrency(s.price)}
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm font-medium">Subtotal Serviços</span>
                      <span className="font-medium">{formatCurrency(servicesTotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Order Items (Products) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Consumo
                  </h3>
                  {!isFinalized && !isCancelled && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddProductOpen(true)}
                      >
                        <ShoppingBag className="h-4 w-4 mr-1" />
                        Produto
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddCustomOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Avulso
                      </Button>
                    </div>
                  )}
                </div>

                <OrderItemsList
                  items={orderItems}
                  onRemove={(id) => removeOrderItem.mutate(id)}
                  disabled={isFinalized || isCancelled}
                />

                {orderItems.length > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Subtotal Consumo</span>
                    <span className="font-medium">{formatCurrency(itemsTotal)}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Total */}
              <div className="rounded-lg bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Actions */}
          {!isFinalized && !isCancelled && (
            <div className="p-4 border-t space-y-2">
              <Button
                className="w-full"
                size="lg"
                onClick={() => setCheckoutOpen(true)}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Fechar Comanda
              </Button>
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
        </SheetContent>
      </Sheet>

      <AddProductDialog
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        bookingId={booking.id}
      />

      <AddCustomItemDialog
        open={addCustomOpen}
        onOpenChange={setAddCustomOpen}
        bookingId={booking.id}
      />

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        booking={booking}
        orderItems={orderItems}
        spaceTotal={servicesTotal}
        itemsTotal={itemsTotal}
        grandTotal={grandTotal}
        summaryLabel={`Serviços (${services.length} ${services.length === 1 ? 'item' : 'itens'})`}
        onSuccess={() => {
          setCheckoutOpen(false);
          onOpenChange(false);
        }}
      />

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? O horário será liberado na agenda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar Agendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

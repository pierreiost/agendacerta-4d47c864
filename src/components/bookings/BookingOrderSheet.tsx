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
import { useOrderItems } from '@/hooks/useOrderItems';
import { useRegisterCustomer } from '@/hooks/useRegisterCustomer';
import { DuplicateCustomerDialog } from './DuplicateCustomerDialog';
import { OrderItemsList } from './OrderItemsList';
import { AddProductDialog } from './AddProductDialog';
import { AddCustomItemDialog } from './AddCustomItemDialog';
import { CheckoutDialog } from './CheckoutDialog';
import { format, parseISO, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  Plus,
  ShoppingBag,
  CreditCard,
  Loader2,
  X,
  UserPlus,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { 
  label: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  PENDING: { 
    label: 'Pendente', 
    variant: 'secondary',
    className: 'bg-warning-100 text-warning-800 border-warning-300 hover:bg-warning-200'
  },
  CONFIRMED: { 
    label: 'Confirmado', 
    variant: 'default',
    className: 'bg-success-100 text-success-800 border-success-300 hover:bg-success-200'
  },
  CANCELLED: { 
    label: 'Cancelado', 
    variant: 'destructive',
    className: 'bg-error-100 text-error-800 border-error-300 hover:bg-error-200'
  },
  FINALIZED: { 
    label: 'Finalizado', 
    variant: 'outline',
    className: 'bg-primary-100 text-primary-800 border-primary-300 hover:bg-primary-200'
  },
};

interface BookingOrderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
}

export function BookingOrderSheet({
  open,
  onOpenChange,
  booking: initialBooking,
}: BookingOrderSheetProps) {
  const { data: booking, isLoading } = useBooking(initialBooking?.id ?? null);
  const { orderItems, itemsTotal, removeOrderItem } = useOrderItems(booking?.id ?? null);
  const { updateBooking, deleteBooking } = useBookings();
  const { registerCustomerFromBooking, isRegistering, duplicates, linkExistingCustomer, forceCreate, dismissDuplicates } = useRegisterCustomer();

  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addCustomOpen, setAddCustomOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

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

  const spaceTotal = Number(booking.space_total) || 0;
  const grandTotal = spaceTotal + itemsTotal;

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
        <SheetContent className="w-full sm:w-[540px] flex flex-col p-0 bg-background/80 backdrop-blur-xl border-l border-border/50 shadow-2xl">
          <SheetHeader className="px-6 py-5 border-b border-border/50 bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold">Detalhes da Reserva</SheetTitle>
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

              {/* Booking Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Reserva
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.space?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(startTime, "d 'de' MMMM, yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-sm">
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

              {/* Space Cost */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Espaço
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {booking.space?.name} ({duration}h × {formatCurrency(Number(booking.space?.price_per_hour ?? 0))})
                  </span>
                  <span className="font-medium">{formatCurrency(spaceTotal)}</span>
                </div>
              </div>

              <Separator />

              {/* Order Items */}
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
        spaceTotal={spaceTotal}
        itemsTotal={itemsTotal}
        grandTotal={grandTotal}
        onSuccess={() => {
          setCheckoutOpen(false);
          onOpenChange(false);
        }}
      />

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta reserva? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar Reserva
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

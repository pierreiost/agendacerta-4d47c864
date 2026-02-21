import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePayments, PAYMENT_METHODS, type PaymentMethod } from '@/hooks/usePayments';
import { useStockMovements } from '@/hooks/useStockMovements';
import type { Booking } from '@/hooks/useBookings';
import type { OrderItem } from '@/hooks/useOrderItems';
import { Plus, Trash2, AlertCircle, Loader2, Check } from 'lucide-react';

interface PaymentEntry {
  id: string;
  method: PaymentMethod;
  amount: number;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking;
  orderItems: OrderItem[];
  spaceTotal: number;
  itemsTotal: number;
  grandTotal: number;
  onSuccess: () => void;
  summaryLabel?: string;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  booking,
  orderItems,
  spaceTotal,
  itemsTotal,
  grandTotal,
  onSuccess,
  summaryLabel,
}: CheckoutDialogProps) {
  const { finalizeBooking } = usePayments(booking.id);
  const { deductStockForSale } = useStockMovements();
  const [payments, setPayments] = useState<PaymentEntry[]>([
    { id: '1', method: 'PIX', amount: grandTotal },
  ]);

  // Sync payment amount when dialog opens or grandTotal changes
  useEffect(() => {
    if (open) {
      setPayments([{ id: '1', method: 'PIX', amount: grandTotal }]);
    }
  }, [open, grandTotal]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const paymentsTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = grandTotal - paymentsTotal;
  const isValid = Math.abs(remaining) < 0.01;

  const addPayment = () => {
    setPayments([
      ...payments,
      { id: Date.now().toString(), method: 'CASH', amount: Math.max(0, remaining) },
    ]);
  };

  const removePayment = (id: string) => {
    if (payments.length > 1) {
      setPayments(payments.filter(p => p.id !== id));
    }
  };

  const updatePayment = (id: string, field: 'method' | 'amount', value: string | number) => {
    setPayments(payments.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleSubmit = async () => {
    await finalizeBooking.mutateAsync({
      bookingId: booking.id,
      payments: payments.map(p => ({
        amount: p.amount,
        method: p.method,
      })),
      grandTotal,
    });

    // Auto-deduct stock for products with track_stock enabled
    const stockItems = orderItems
      .filter((item) => item.product_id && item.product?.track_stock)
      .map((item) => ({
        productId: item.product_id!,
        quantity: item.quantity,
        bookingId: booking.id,
      }));

    if (stockItems.length > 0) {
      await deductStockForSale.mutateAsync(stockItems);
    }

    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Fechar Comanda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>{summaryLabel || `Espaço (${booking.space?.name})`}</span>
              <span>{formatCurrency(spaceTotal)}</span>
            </div>
            {orderItems.length > 0 && (
              <div className="flex justify-between text-sm">
                <span>Consumo ({orderItems.length} itens)</span>
                <span>{formatCurrency(itemsTotal)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Payments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Formas de Pagamento</Label>
              <Button variant="ghost" size="sm" onClick={addPayment}>
                <Plus className="h-4 w-4 mr-1" />
                Dividir
              </Button>
            </div>

            {payments.map((payment, index) => (
              <div key={payment.id} className="flex items-center gap-2">
                <Select
                  value={payment.method}
                  onValueChange={(value) => updatePayment(payment.id, 'method', value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={payment.amount === 0 ? '' : payment.amount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                      if (raw === '' || raw === '.') {
                        updatePayment(payment.id, 'amount', 0);
                      } else {
                        const parsed = parseFloat(raw);
                        if (!isNaN(parsed)) {
                          updatePayment(payment.id, 'amount', parsed);
                        }
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    className="pl-10"
                  />
                </div>
                {payments.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePayment(payment.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            {/* Remaining */}
            {!isValid && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {remaining > 0 
                    ? `Faltam ${formatCurrency(remaining)} para completar o pagamento`
                    : `Valor excede em ${formatCurrency(Math.abs(remaining))}`
                  }
                </AlertDescription>
              </Alert>
            )}

            {isValid && (
              <Alert className="border-success bg-success/10 text-success-foreground">
                <Check className="h-4 w-4" />
                <AlertDescription>
                  Pagamento completo! Pronto para finalizar.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || finalizeBooking.isPending}
          >
            {finalizeBooking.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Finalizar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

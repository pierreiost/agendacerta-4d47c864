import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';
import { useStockMovements } from '@/hooks/useStockMovements';
import type { Product } from '@/hooks/useProducts';

const TYPE_OPTIONS = [
  { value: 'IN', label: 'Entrada', icon: ArrowDownCircle, color: 'text-green-600' },
  { value: 'OUT', label: 'Saída', icon: ArrowUpCircle, color: 'text-red-600' },
  { value: 'ADJUSTMENT', label: 'Ajuste', icon: RefreshCw, color: 'text-blue-600' },
] as const;

const REASON_MAP: Record<string, { value: string; label: string }[]> = {
  IN: [
    { value: 'purchase', label: 'Compra' },
    { value: 'return', label: 'Devolução' },
    { value: 'initial', label: 'Estoque Inicial' },
  ],
  OUT: [
    { value: 'sale', label: 'Venda' },
    { value: 'loss', label: 'Perda/Quebra' },
  ],
  ADJUSTMENT: [
    { value: 'adjustment', label: 'Ajuste de Inventário' },
  ],
};

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
}

export function StockMovementDialog({ open, onOpenChange, product }: StockMovementDialogProps) {
  const { createMovement } = useStockMovements();
  const [type, setType] = useState<string>('IN');
  const [reason, setReason] = useState<string>('purchase');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const reasons = REASON_MAP[type] ?? [];

  const previewBalance = useMemo(() => {
    const current = product.stock_quantity ?? 0;
    if (type === 'IN') return current + quantity;
    if (type === 'OUT') return current - quantity;
    if (type === 'ADJUSTMENT') return quantity;
    return current;
  }, [type, quantity, product.stock_quantity]);

  const handleTypeChange = (val: string) => {
    setType(val);
    const firstReason = REASON_MAP[val]?.[0]?.value ?? 'adjustment';
    setReason(firstReason);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMovement.mutateAsync({
      productId: product.id,
      type: type as 'IN' | 'OUT' | 'ADJUSTMENT',
      reason,
      quantity,
      unitCost: type === 'IN' ? unitCost : undefined,
      notes: notes || undefined,
    });
    onOpenChange(false);
    // Reset
    setType('IN');
    setReason('purchase');
    setQuantity(1);
    setUnitCost(0);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Movimentar Estoque — {product.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4 rounded-lg border p-3 bg-muted/50">
            <div className="text-sm">
              <span className="text-muted-foreground">Saldo atual:</span>{' '}
              <strong>{product.stock_quantity ?? 0} {product.unit ?? 'un'}</strong>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Após:</span>{' '}
              <strong className={previewBalance < 0 ? 'text-destructive' : ''}>{previewBalance} {product.unit ?? 'un'}</strong>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <opt.icon className={`h-4 w-4 ${opt.color}`} />
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{type === 'ADJUSTMENT' ? 'Novo saldo' : 'Quantidade'}</Label>
            <Input
              type="number"
              min={type === 'ADJUSTMENT' ? 0 : 1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>

          {type === 'IN' && (
            <div className="space-y-2">
              <Label>Custo unitário (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Opcional..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMovement.isPending || quantity <= 0}>
              {createMovement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useStockMovements } from '@/hooks/useStockMovements';
import type { Product } from '@/hooks/useProducts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TYPE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  IN: { label: 'Entrada', variant: 'default' },
  OUT: { label: 'Saída', variant: 'destructive' },
  ADJUSTMENT: { label: 'Ajuste', variant: 'secondary' },
};

const REASON_LABELS: Record<string, string> = {
  purchase: 'Compra',
  sale: 'Venda',
  loss: 'Perda/Quebra',
  return: 'Devolução',
  adjustment: 'Ajuste',
  initial: 'Estoque Inicial',
};

interface StockHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
}

export function StockHistoryDialog({ open, onOpenChange, product }: StockHistoryDialogProps) {
  const { movements, isLoading } = useStockMovements(open ? product.id : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Histórico de Estoque — {product.name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : movements.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma movimentação registrada.
          </p>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {movements.map((m) => {
                const typeInfo = TYPE_LABELS[m.type] ?? { label: m.type, variant: 'secondary' as const };
                return (
                  <div key={m.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {REASON_LABELS[m.reason] ?? m.reason}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>
                          {m.type === 'ADJUSTMENT' ? 'Novo saldo' : 'Qtd'}: <strong>{m.quantity}</strong>
                        </span>
                        <span>
                          Saldo após: <strong>{m.balance_after}</strong>
                        </span>
                        {m.unit_cost != null && m.unit_cost > 0 && (
                          <span className="text-muted-foreground">
                            Custo: R$ {Number(m.unit_cost).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {m.notes && (
                        <p className="text-xs text-muted-foreground">{m.notes}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(m.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

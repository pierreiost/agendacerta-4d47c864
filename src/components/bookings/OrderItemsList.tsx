import { Button } from '@/components/ui/button';
import type { OrderItem } from '@/hooks/useOrderItems';
import { Trash2, Package } from 'lucide-react';

interface OrderItemsListProps {
  items: OrderItem[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function OrderItemsList({ items, onRemove, disabled }: OrderItemsListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-full bg-muted p-3 mb-2">
          <Package className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhum item de consumo
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {item.product?.name ?? item.description}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.quantity}x {formatCurrency(Number(item.unit_price))}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {formatCurrency(Number(item.subtotal))}
            </span>
            {!disabled && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

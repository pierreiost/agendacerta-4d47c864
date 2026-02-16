import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/hooks/useProducts';
import { useOrderItems } from '@/hooks/useOrderItems';
import { useVenue } from '@/contexts/VenueContext';
import { Search, Plus, Minus, Loader2, AlertTriangle } from 'lucide-react';

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
}

export function AddProductDialog({
  open,
  onOpenChange,
  bookingId,
}: AddProductDialogProps) {
  const { products, isLoading } = useProducts();
  const { addOrderItem } = useOrderItems(bookingId);
  const { currentVenue } = useVenue();
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const allowNegative = (currentVenue as any)?.allow_negative_stock ?? false;

  const activeProducts = products.filter(p => p.is_active);
  const filteredProducts = activeProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getQuantity = (productId: string) => quantities[productId] ?? 0;

  const canIncrement = (product: typeof products[0]) => {
    if (!product.track_stock) return true;
    if (allowNegative) return true;
    const currentQty = getQuantity(product.id);
    return currentQty < (product.stock_quantity ?? 0);
  };

  const getStockLabel = (product: typeof products[0]) => {
    if (!product.track_stock) return null;
    const stock = product.stock_quantity ?? 0;
    const unit = product.unit ?? 'un';
    return `${stock} ${unit}`;
  };

  const setQuantity = (productId: string, qty: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, qty),
    }));
  };

  const handleAdd = async () => {
    const itemsToAdd = Object.entries(quantities).filter(([_, qty]) => qty > 0);
    
    for (const [productId, quantity] of itemsToAdd) {
      const product = products.find(p => p.id === productId);
      if (product) {
        await addOrderItem.mutateAsync({
          booking_id: bookingId,
          product_id: productId,
          description: product.name,
          unit_price: Number(product.price),
          quantity,
        });
      }
    }

    setQuantities({});
    onOpenChange(false);
  };

  const hasItems = Object.values(quantities).some(q => q > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Produtos</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum produto encontrado
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {filteredProducts.map((product) => {
                const qty = getQuantity(product.id);
                const stockLabel = getStockLabel(product);
                const blocked = !canIncrement(product) && qty === 0;
                const atLimit = !canIncrement(product);

                return (
                  <div
                    key={product.id}
                    className={`flex items-center justify-between rounded-lg border p-3 ${blocked ? 'opacity-50' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        {product.category && (
                          <Badge variant="secondary" className="text-xs">
                            {product.category.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-primary font-medium">
                          {formatCurrency(Number(product.price))}
                        </p>
                        {stockLabel && (
                          <span className={`text-xs ${(product.stock_quantity ?? 0) <= 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            • Estoque: {stockLabel}
                          </span>
                        )}
                      </div>
                      {blocked && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          Sem estoque disponível
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQuantity(product.id, qty - 1)}
                        disabled={qty === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQuantity(product.id, qty + 1)}
                        disabled={atLimit}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!hasItems || addOrderItem.isPending}
          >
            {addOrderItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

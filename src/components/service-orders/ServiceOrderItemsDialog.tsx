import { useState } from 'react';
import { Trash2, Plus, Package, Wrench } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useServiceOrders, type ServiceOrder } from '@/hooks/useServiceOrders';
import { ServiceOrderItemForm } from './ServiceOrderItemForm';

interface ServiceOrderItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ServiceOrder;
}

export function ServiceOrderItemsDialog({
  open,
  onOpenChange,
  order,
}: ServiceOrderItemsDialogProps) {
  const { addItem, removeItem } = useServiceOrders();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddItem = async (item: {
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    service_code?: string | null;
  }) => {
    try {
      await addItem({
        service_order_id: order.id,
        ...item,
      });
      setIsAdding(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const items = order.items ?? [];

  // Identify item type by description for visual badges
  const getItemType = (description: string): 'labor' | 'part' | 'other' => {
    const laborKeywords = ['mão de obra', 'serviço', 'instalação', 'manutenção', 'limpeza', 'reparo'];
    const lowerDesc = description.toLowerCase();
    if (laborKeywords.some((kw) => lowerDesc.includes(kw))) {
      return 'labor';
    }
    return 'part';
  };

  // Calculate totals by type
  const laborTotal = items
    .filter((item) => getItemType(item.description) === 'labor')
    .reduce((sum, item) => sum + Number(item.subtotal), 0);
  
  const partsTotal = items
    .filter((item) => getItemType(item.description) !== 'labor')
    .reduce((sum, item) => sum + Number(item.subtotal), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Itens da OS #{order.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards */}
          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Peças/Produtos</p>
                  <p className="font-semibold">{formatCurrency(partsTotal)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Mão de Obra</p>
                  <p className="font-semibold">{formatCurrency(laborTotal)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          {items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  {order.order_type === 'complete' && (
                    <TableHead>Cód. Serviço</TableHead>
                  )}
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Preço Un.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const itemType = getItemType(item.description);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {itemType === 'labor' ? (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800">
                            <Wrench className="h-3 w-3 mr-1" />
                            Serviço
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                            <Package className="h-3 w-3 mr-1" />
                            Peça
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      {order.order_type === 'complete' && (
                        <TableCell>{item.service_code || '-'}</TableCell>
                      )}
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(item.unit_price))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(item.subtotal))}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum item adicionado
            </p>
          )}

          {/* Add Item Form */}
          {isAdding ? (
            <ServiceOrderItemForm
              orderType={order.order_type}
              onAddItem={handleAddItem}
              onCancel={() => setIsAdding(false)}
            />
          ) : (
            <Button onClick={() => setIsAdding(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Item
            </Button>
          )}

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(order.subtotal))}</span>
            </div>
            {order.order_type === 'complete' && (
              <>
                <div className="flex justify-between text-sm">
                  <span>Desconto</span>
                  <span>- {formatCurrency(Number(order.discount))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>ISS ({(Number(order.tax_rate) * 100).toFixed(2)}%)</span>
                  <span>{formatCurrency(Number(order.tax_amount))}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(Number(order.total))}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

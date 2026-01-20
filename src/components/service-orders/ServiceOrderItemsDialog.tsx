import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Trash2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useServiceOrders, type ServiceOrder } from '@/hooks/useServiceOrders';

const itemSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  quantity: z.coerce.number().min(1, 'Mínimo 1'),
  unit_price: z.coerce.number().min(0, 'Preço inválido'),
  service_code: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

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

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      description: '',
      quantity: 1,
      unit_price: 0,
      service_code: '',
    },
  });

  const onSubmit = async (data: ItemFormData) => {
    try {
      await addItem({
        service_order_id: order.id,
        description: data.description,
        quantity: data.quantity,
        unit_price: data.unit_price,
        subtotal: data.quantity * data.unit_price,
        service_code: data.service_code || null,
      });
      form.reset();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Itens da OS #{order.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
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
                {items.map((item) => (
                  <TableRow key={item.id}>
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
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum item adicionado
            </p>
          )}

          {isAdding ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="border rounded-lg p-4 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Descrição *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {order.order_type === 'complete' && (
                    <FormField
                      control={form.control}
                      name="service_code"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Código do Serviço (Municipal)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: 14.01" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Unitário *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.reset();
                      setIsAdding(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Adicionar</Button>
                </div>
              </form>
            </Form>
          ) : (
            <Button onClick={() => setIsAdding(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Item
            </Button>
          )}

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

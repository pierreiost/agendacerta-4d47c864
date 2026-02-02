import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVenue } from '@/contexts/VenueContext';
import { useCustomers } from '@/hooks/useCustomers';
import { useServiceOrders, type ServiceOrder } from '@/hooks/useServiceOrders';
import { maskPhone, maskCPFCNPJ, maskCEP } from '@/lib/masks';
import { useFormPersist } from '@/hooks/useFormPersist';

const formSchema = z.object({
  order_type: z.enum(['simple', 'complete']),
  customer_id: z.string().optional(),
  customer_name: z.string().min(1, 'Nome obrigatório'),
  customer_document: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  customer_city: z.string().optional(),
  customer_state: z.string().optional(),
  customer_zip_code: z.string().optional(),
  description: z.string().min(1, 'Descrição obrigatória'),
  notes: z.string().optional(),
  discount: z.coerce.number().min(0).optional(),
  tax_rate: z.coerce.number().min(0).max(1).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ServiceOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: ServiceOrder | null;
}

export function ServiceOrderFormDialog({
  open,
  onOpenChange,
  order,
}: ServiceOrderFormDialogProps) {
  const { currentVenue } = useVenue();
  const { customers } = useCustomers();
  const { createOrder, updateOrder, isCreating, isUpdating } = useServiceOrders();
  const [orderType, setOrderType] = useState<'simple' | 'complete'>('simple');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      order_type: 'simple',
      customer_name: '',
      customer_document: '',
      customer_email: '',
      customer_phone: '',
      customer_address: '',
      customer_city: 'Pelotas',
      customer_state: 'RS',
      customer_zip_code: '',
      description: '',
      notes: '',
      discount: 0,
      tax_rate: 0,
    },
  });

  const isEditing = !!order;

  // Form persistence - only for new orders
  const { clearDraft } = useFormPersist({
    form,
    key: `service_order_form_${currentVenue?.id}`,
    showRecoveryToast: !isEditing && open,
  });

  useEffect(() => {
    if (order) {
      clearDraft();
      form.reset({
        order_type: order.order_type as 'simple' | 'complete',
        customer_id: order.customer_id ?? undefined,
        customer_name: order.customer_name,
        customer_document: order.customer_document ?? '',
        customer_email: order.customer_email ?? '',
        customer_phone: order.customer_phone ?? '',
        customer_address: order.customer_address ?? '',
        customer_city: order.customer_city ?? 'Pelotas',
        customer_state: order.customer_state ?? 'RS',
        customer_zip_code: order.customer_zip_code ?? '',
        description: order.description,
        notes: order.notes ?? '',
        discount: Number(order.discount) || 0,
        tax_rate: Number(order.tax_rate) || 0,
      });
      setOrderType(order.order_type as 'simple' | 'complete');
    } else if (!open) {
      form.reset();
      setOrderType('simple');
    }
  }, [order, form, open, clearDraft]);

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      form.setValue('customer_id', customerId);
      form.setValue('customer_name', customer.name);
      form.setValue('customer_document', customer.document ?? '');
      form.setValue('customer_email', customer.email ?? '');
      form.setValue('customer_phone', customer.phone ?? '');
      form.setValue('customer_address', customer.address ?? '');
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!currentVenue?.id) return;

    const payload = {
      venue_id: currentVenue.id,
      order_type: data.order_type as 'simple' | 'complete',
      customer_id: data.customer_id || null,
      customer_name: data.customer_name,
      customer_document: data.customer_document || null,
      customer_email: data.customer_email || null,
      customer_phone: data.customer_phone || null,
      customer_address: data.customer_address || null,
      customer_city: data.customer_city || null,
      customer_state: data.customer_state || null,
      customer_zip_code: data.customer_zip_code || null,
      description: data.description,
      notes: data.notes || null,
      discount: data.discount || 0,
      tax_rate: data.order_type === 'complete' ? (data.tax_rate || 0) : 0,
      status_simple: data.order_type === 'simple' ? 'open' as const : null,
      status_complete: data.order_type === 'complete' ? 'draft' as const : null,
    };

    try {
      if (order) {
        await updateOrder({ id: order.id, ...payload });
      } else {
        await createOrder(payload);
      }
      clearDraft();
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order ? `Editar OS #${order.order_number}` : 'Nova Ordem de Serviço'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="order_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de OS</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value: 'simple' | 'complete') => {
                      field.onChange(value);
                      setOrderType(value);
                    }}
                    disabled={!!order}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="simple">Simples</SelectItem>
                      <SelectItem value="complete">Completa (NFS-e)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs defaultValue="customer" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="customer">Cliente</TabsTrigger>
                <TabsTrigger value="service">Serviço</TabsTrigger>
              </TabsList>

              <TabsContent value="customer" className="space-y-4 pt-4">
                <FormItem>
                  <FormLabel>Selecionar cliente existente</FormLabel>
                  <Select onValueChange={handleCustomerSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione ou preencha manualmente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>

                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {orderType === 'complete' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customer_document"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF/CNPJ</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                onChange={(e) => field.onChange(maskCPFCNPJ(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customer_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                onChange={(e) => field.onChange(maskPhone(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="customer_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customer_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="customer_city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customer_state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                              <Input {...field} maxLength={2} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customer_zip_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                onChange={(e) => field.onChange(maskCEP(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="service" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição do serviço *</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {orderType === 'complete' && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Desconto (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tax_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alíquota ISS (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={(Number(field.value) * 100).toFixed(2)}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value) / 100)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {order ? 'Salvar' : 'Criar OS'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useProducts, type Product } from '@/hooks/useProducts';
import { useStockMovements } from '@/hooks/useStockMovements';
import type { Tables } from '@/integrations/supabase/types';
import { Loader2 } from 'lucide-react';
import { useFormPersist } from '@/hooks/useFormPersist';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  category_id: z.string().optional(),
  price: z.coerce.number().min(0, 'Preço não pode ser negativo'),
  is_active: z.boolean(),
  // Stock fields
  track_stock: z.boolean(),
  sku: z.string().optional(),
  unit: z.string().optional(),
  cost_price: z.coerce.number().min(0).optional(),
  min_stock: z.coerce.number().min(0).optional().nullable(),
  initial_stock: z.coerce.number().min(0).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  venueId: string;
  categories: Tables<'product_categories'>[];
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  venueId,
  categories,
}: ProductFormDialogProps) {
  const { createProduct, updateProduct } = useProducts();
  const { createMovement } = useStockMovements();
  const isEditing = !!product;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category_id: '',
      price: 0,
      is_active: true,
      track_stock: false,
      sku: '',
      unit: 'un',
      cost_price: 0,
      min_stock: null,
      initial_stock: 0,
    },
  });

  const trackStock = form.watch('track_stock');

  const { clearDraft } = useFormPersist({
    form,
    key: `product_form_${venueId}`,
    showRecoveryToast: !isEditing && open,
  });

  useEffect(() => {
    if (product) {
      clearDraft();
      form.reset({
        name: product.name,
        category_id: product.category_id ?? '',
        price: Number(product.price) ?? 0,
        is_active: product.is_active ?? true,
        track_stock: product.track_stock ?? false,
        sku: product.sku ?? '',
        unit: product.unit ?? 'un',
        cost_price: Number(product.cost_price) ?? 0,
        min_stock: product.min_stock ?? null,
        initial_stock: 0,
      });
    } else if (!open) {
      form.reset({
        name: '',
        category_id: '',
        price: 0,
        is_active: true,
        track_stock: false,
        sku: '',
        unit: 'un',
        cost_price: 0,
        min_stock: null,
        initial_stock: 0,
      });
    }
  }, [product, form, open, clearDraft]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      category_id: data.category_id || null,
      price: data.price,
      is_active: data.is_active,
      venue_id: venueId,
      track_stock: data.track_stock,
      sku: data.sku || null,
      unit: data.unit || 'un',
      cost_price: data.cost_price ?? 0,
      min_stock: data.track_stock ? (data.min_stock ?? null) : null,
    };

    if (isEditing) {
      await updateProduct.mutateAsync({ id: product.id, ...payload });
    } else {
      const created = await createProduct.mutateAsync(payload);
      // Create initial stock movement if tracking and initial_stock > 0
      if (data.track_stock && data.initial_stock && data.initial_stock > 0) {
        await createMovement.mutateAsync({
          productId: created.id,
          type: 'IN',
          reason: 'initial',
          quantity: data.initial_stock,
          unitCost: data.cost_price,
        });
      }
    }

    clearDraft();
    onOpenChange(false);
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Água Mineral 500ml" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço de venda (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Ativo</FormLabel>
                    <p className="text-sm text-muted-foreground">Produto disponível para venda</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="track_stock"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Controle de Estoque</FormLabel>
                    <p className="text-sm text-muted-foreground">Rastrear entradas e saídas</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {trackStock && (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU / Código</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: SKU-001" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="un">Unidade (un)</SelectItem>
                            <SelectItem value="kg">Quilograma (kg)</SelectItem>
                            <SelectItem value="L">Litro (L)</SelectItem>
                            <SelectItem value="m">Metro (m)</SelectItem>
                            <SelectItem value="cx">Caixa (cx)</SelectItem>
                            <SelectItem value="pct">Pacote (pct)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cost_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.01" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="min_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estoque mínimo (alerta)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Ex: 5"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {!isEditing && (
                  <FormField
                    control={form.control}
                    name="initial_stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estoque inicial</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} placeholder="0" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

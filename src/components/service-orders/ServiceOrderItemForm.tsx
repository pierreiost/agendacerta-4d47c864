import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Search, Package, Wrench, Plus, X } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProducts } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

const manualItemSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  quantity: z.coerce.number().min(1, 'Mínimo 1'),
  unit_price: z.coerce.number().min(0, 'Preço inválido'),
  service_code: z.string().optional(),
});

const laborSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  value: z.coerce.number().min(0.01, 'Valor inválido'),
});

type ManualItemData = z.infer<typeof manualItemSchema>;
type LaborData = z.infer<typeof laborSchema>;

interface ServiceOrderItemFormProps {
  orderType: 'simple' | 'complete';
  onAddItem: (item: {
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    service_code?: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

export function ServiceOrderItemForm({
  orderType,
  onAddItem,
  onCancel,
}: ServiceOrderItemFormProps) {
  const { products, isLoading: loadingProducts } = useProducts();
  const [productSearch, setProductSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState<string>('products');

  // Filter active products only
  const activeProducts = products.filter((p) => p.is_active !== false);

  // Filter products based on search
  const filteredProducts = activeProducts.filter((product) =>
    product.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const manualForm = useForm<ManualItemData>({
    resolver: zodResolver(manualItemSchema),
    defaultValues: {
      description: '',
      quantity: 1,
      unit_price: 0,
      service_code: '',
    },
  });

  const laborForm = useForm<LaborData>({
    resolver: zodResolver(laborSchema),
    defaultValues: {
      description: 'Mão de Obra - Serviço Técnico',
      value: 0,
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const handleAddProduct = async (product: typeof activeProducts[0]) => {
    await onAddItem({
      description: product.name,
      quantity: 1,
      unit_price: product.price,
      subtotal: product.price,
      service_code: null,
    });
  };

  const handleAddManualItem = async (data: ManualItemData) => {
    await onAddItem({
      description: data.description,
      quantity: data.quantity,
      unit_price: data.unit_price,
      subtotal: data.quantity * data.unit_price,
      service_code: data.service_code || null,
    });
    manualForm.reset();
  };

  const handleAddLabor = async (data: LaborData) => {
    await onAddItem({
      description: data.description,
      quantity: 1,
      unit_price: data.value,
      subtotal: data.value,
      service_code: orderType === 'complete' ? '14.01' : null, // Código ISS para manutenção
    });
    laborForm.reset({ description: 'Mão de Obra - Serviço Técnico', value: 0 });
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Adicionar Item</h4>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Peças
          </TabsTrigger>
          <TabsTrigger value="labor" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Mão de Obra
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Manual
          </TabsTrigger>
        </TabsList>

        {/* Products Tab - Search Inventory */}
        <TabsContent value="products" className="space-y-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar peça/produto..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loadingProducts ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Carregando produtos...
            </p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {productSearch
                ? 'Nenhum produto encontrado'
                : 'Nenhum produto cadastrado'}
            </p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddProduct(product)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-md text-left',
                      'hover:bg-accent transition-colors',
                      'border border-transparent hover:border-border'
                    )}
                  >
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      {product.category && (
                        <p className="text-xs text-muted-foreground">
                          {product.category.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {formatCurrency(product.price)}
                      </p>
                      <p className="text-xs text-muted-foreground">Clique para adicionar</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Labor Tab - Quick Labor Entry */}
        <TabsContent value="labor" className="mt-4">
          <Form {...laborForm}>
            <form
              onSubmit={laborForm.handleSubmit(handleAddLabor)}
              className="space-y-4"
            >
              <FormField
                control={laborForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Serviço</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Instalação de ar-condicionado split"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={laborForm.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da Mão de Obra (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">
                  <Wrench className="h-4 w-4 mr-2" />
                  Adicionar Mão de Obra
                </Button>
              </div>

              {/* Common labor presets */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Serviços comuns:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Instalação Split', desc: 'Instalação de ar-condicionado split' },
                    { label: 'Manutenção Preventiva', desc: 'Manutenção preventiva de ar-condicionado' },
                    { label: 'Limpeza', desc: 'Limpeza e higienização de ar-condicionado' },
                    { label: 'Carga de Gás', desc: 'Recarga de gás refrigerante' },
                  ].map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => laborForm.setValue('description', preset.desc)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </form>
          </Form>
        </TabsContent>

        {/* Manual Tab - Custom Entry */}
        <TabsContent value="manual" className="mt-4">
          <Form {...manualForm}>
            <form
              onSubmit={manualForm.handleSubmit(handleAddManualItem)}
              className="space-y-4"
            >
              <FormField
                control={manualForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Descrição do item" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {orderType === 'complete' && (
                <FormField
                  control={manualForm.control}
                  name="service_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código do Serviço (Municipal)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: 14.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={manualForm.control}
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
                  control={manualForm.control}
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

              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item Manual
              </Button>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

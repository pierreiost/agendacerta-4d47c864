import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Package, Wrench, Plus, X, Briefcase } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/hooks/useProducts";
import { useServices } from "@/hooks/useServices";
import { cn } from "@/lib/utils";

const manualItemSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória"),
  quantity: z.coerce.number().min(1, "Mínimo 1"),
  unit_price: z.coerce.number().min(0, "Preço inválido"),
  service_code: z.string().optional(),
});

const laborSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória"),
  value: z.coerce.number().min(0.01, "Valor inválido"),
});

type ManualItemData = z.infer<typeof manualItemSchema>;
type LaborData = z.infer<typeof laborSchema>;

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  type: 'product' | 'service';
  category?: string | null;
}

interface ServiceOrderItemFormProps {
  orderType: "simple" | "complete";
  onAddItem: (item: {
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    service_code?: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

export function ServiceOrderItemForm({ orderType, onAddItem, onCancel }: ServiceOrderItemFormProps) {
  const { products, isLoading: loadingProducts } = useProducts();
  const { services, isLoading: loadingServices } = useServices();
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<'products' | 'services' | 'all'>('products');
  const [selectedTab, setSelectedTab] = useState<string>("catalog");

  const activeProducts = products.filter((p) => p.is_active !== false);
  const activeServices = services.filter((s) => s.is_active !== false);

  // Combined catalog items
  const catalogItems = useMemo<CatalogItem[]>(() => {
    const prods: CatalogItem[] = catalogFilter !== 'services' 
      ? activeProducts.map(p => ({ 
          id: p.id, 
          name: p.name, 
          price: p.price, 
          type: 'product' as const,
          category: p.category?.name || null
        })) 
      : [];
    
    const servs: CatalogItem[] = catalogFilter !== 'products' 
      ? activeServices.map(s => ({ 
          id: s.id, 
          name: s.title, 
          price: s.price, 
          type: 'service' as const,
          category: null 
        })) 
      : [];
    
    return [...prods, ...servs];
  }, [activeProducts, activeServices, catalogFilter]);

  const filteredCatalog = catalogItems.filter((item) =>
    item.name.toLowerCase().includes(catalogSearch.toLowerCase()),
  );

  const manualForm = useForm<ManualItemData>({
    resolver: zodResolver(manualItemSchema),
    defaultValues: {
      description: "",
      quantity: 1,
      unit_price: 0,
      service_code: "",
    },
  });

  const laborForm = useForm<LaborData>({
    resolver: zodResolver(laborSchema),
    defaultValues: {
      description: "Mão de Obra - Serviço Técnico",
      value: 0,
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const handleAddCatalogItem = async (item: CatalogItem) => {
    await onAddItem({
      description: item.name,
      quantity: 1,
      unit_price: item.price,
      subtotal: item.price,
      service_code: item.type === 'service' && orderType === 'complete' ? '14.01' : null,
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
      service_code: orderType === "complete" ? "14.01" : null,
    });
    laborForm.reset({ description: "Mão de Obra - Serviço Técnico", value: 0 });
  };

  const isLoadingCatalog = loadingProducts || loadingServices;

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
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Catálogo
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

        <TabsContent value="catalog" className="space-y-3 mt-4">
          {/* Filter toggle */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium text-muted-foreground">Exibir:</span>
            <RadioGroup 
              value={catalogFilter} 
              onValueChange={(value) => setCatalogFilter(value as typeof catalogFilter)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="products" id="filter-products" />
                <Label htmlFor="filter-products" className="text-sm cursor-pointer flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Produtos
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="services" id="filter-services" />
                <Label htmlFor="filter-services" className="text-sm cursor-pointer flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  Serviços
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="filter-all" />
                <Label htmlFor="filter-all" className="text-sm cursor-pointer">Todos</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar no catálogo..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoadingCatalog ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando catálogo...</p>
          ) : filteredCatalog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {catalogSearch ? "Nenhum item encontrado" : "Nenhum item cadastrado"}
            </p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {filteredCatalog.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleAddCatalogItem(item)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-md text-left",
                      "hover:bg-accent transition-colors",
                      "border border-transparent hover:border-border",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={item.type === 'product' ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {item.type === 'product' ? (
                          <><Package className="h-2.5 w-2.5 mr-1" />Peça</>
                        ) : (
                          <><Briefcase className="h-2.5 w-2.5 mr-1" />Serviço</>
                        )}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{formatCurrency(item.price)}</p>
                      <p className="text-xs text-muted-foreground">Clique para adicionar</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="labor" className="mt-4">
          <Form {...laborForm}>
            <div className="space-y-4">
              <FormField
                control={laborForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Serviço</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Instalação de ar-condicionado split" />
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
                      <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
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

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Serviços comuns:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Instalação Split", desc: "Instalação de ar-condicionado split" },
                    { label: "Manutenção Preventiva", desc: "Manutenção preventiva de ar-condicionado" },
                    { label: "Limpeza", desc: "Limpeza e higienização de ar-condicionado" },
                    { label: "Carga de Gás", desc: "Recarga de gás refrigerante" },
                  ].map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => laborForm.setValue("description", preset.desc)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <Form {...manualForm}>
            <form onSubmit={manualForm.handleSubmit(handleAddManualItem)} className="space-y-4">
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

              {orderType === "complete" && (
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

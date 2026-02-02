import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useServices } from "@/hooks/useServices";

const formSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  quantity: z.coerce.number().min(1, "Quantidade mínima é 1"),
  unit_price: z.coerce.number().min(0, "Preço deve ser maior ou igual a 0"),
});

// Interface ajustada para bater com o uso em OrdemServicoForm e ServiceOrderItemsDialog
interface ServiceOrderItemFormProps {
  orderType?: "simple" | "complete";
  onAddItem: (data: {
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    service_code?: string | null;
  }) => void;
  onCancel: () => void;
  defaultValues?: {
    description?: string;
    quantity?: number;
    unit_price?: number;
  };
  isSubmitting?: boolean;
}

export function ServiceOrderItemForm({
  orderType,
  onAddItem,
  onCancel,
  defaultValues,
  isSubmitting,
}: ServiceOrderItemFormProps) {
  const { toast } = useToast();
  // Busca os serviços do catálogo
  const { services } = useServices();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: defaultValues?.description || "",
      quantity: defaultValues?.quantity || 1,
      unit_price: defaultValues?.unit_price || 0,
    },
  });

  // Monitora valores para o cálculo visual do subtotal
  const quantity = form.watch("quantity");
  const unitPrice = form.watch("unit_price");
  const currentSubtotal = (quantity || 0) * (unitPrice || 0);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const subtotal = values.quantity * values.unit_price;

    onAddItem({
      description: values.description,
      quantity: values.quantity,
      unit_price: values.unit_price,
      subtotal: subtotal,
      service_code: null, // Pode ser expandido futuramente se o serviço tiver código
    });
  }

  // Função para preencher dados ao selecionar do catálogo
  const handleServiceSelect = (serviceId: string) => {
    const selectedService = services.find((s) => s.id === serviceId);

    if (selectedService) {
      // Correção: Usando 'title' em vez de 'name'
      form.setValue("description", selectedService.title);
      form.setValue("unit_price", Number(selectedService.price));

      toast({
        title: "Serviço selecionado",
        description: "Descrição e preço preenchidos automaticamente.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border rounded-md p-4 bg-background">
        {/* === SELETOR DE CATÁLOGO === */}
        <div className="p-3 bg-muted/30 rounded-md border border-dashed mb-4">
          <FormLabel className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">
            Catálogo de Serviços (Opcional)
          </FormLabel>
          <Select onValueChange={handleServiceSelect}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Selecione para preencher automaticamente..." />
            </SelectTrigger>
            <SelectContent>
              {services?.length > 0 ? (
                services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {/* Correção: Usando 'title' em vez de 'name' */}
                    {service.title} -{" "}
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.price)}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground text-center">Nenhum serviço cadastrado.</div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* === CAMPOS DO FORMULÁRIO === */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição do Item</FormLabel>
              <FormControl>
                <Textarea placeholder="Ex: Formatação, Troca de Peça X..." className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade</FormLabel>
                <FormControl>
                  <Input type="number" min="1" step="1" {...field} />
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
                <FormLabel>Preço Unitário (R$)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-2 flex items-center justify-between border-t mt-4">
          <span className="text-sm font-medium text-muted-foreground">Subtotal:</span>
          <span className="text-lg font-bold">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(currentSubtotal)}
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adicionando..." : "Adicionar Item"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

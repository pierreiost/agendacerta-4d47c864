import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ServiceOrderItemInsert } from "@/hooks/useServiceOrders";
import { useServices } from "@/hooks/useServices"; // Hook do módulo de serviços

const formSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  quantity: z.coerce.number().min(1, "Quantidade mínima é 1"),
  unit_price: z.coerce.number().min(0, "Preço deve ser maior ou igual a 0"),
});

interface ServiceOrderItemFormProps {
  orderId: string;
  onSuccess: (data: ServiceOrderItemInsert) => void;
  onCancel: () => void;
  defaultValues?: Partial<ServiceOrderItemInsert>;
  isSubmitting?: boolean;
}

export function ServiceOrderItemForm({
  orderId,
  onSuccess,
  onCancel,
  defaultValues,
  isSubmitting,
}: ServiceOrderItemFormProps) {
  const { toast } = useToast();
  // Busca os serviços cadastrados no módulo de Serviços
  const { services } = useServices();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: defaultValues?.description || "",
      quantity: defaultValues?.quantity || 1,
      unit_price: defaultValues?.unit_price || 0,
    },
  });

  // Monitora mudanças no formulário para calcular subtotal em tempo real (visual apenas)
  const quantity = form.watch("quantity");
  const unitPrice = form.watch("unit_price");
  const currentSubtotal = (quantity || 0) * (unitPrice || 0);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const subtotal = values.quantity * values.unit_price;

    onSuccess({
      service_order_id: orderId,
      description: values.description,
      quantity: values.quantity,
      unit_price: values.unit_price,
      subtotal: subtotal,
    });
  }

  // Função para preencher automaticamente quando selecionar do catálogo
  const handleServiceSelect = (serviceId: string) => {
    const selectedService = services.find((s) => s.id === serviceId);

    if (selectedService) {
      form.setValue("description", selectedService.name);
      // Converte para número caso venha como string do banco
      form.setValue("unit_price", Number(selectedService.price));

      toast({
        title: "Serviço importado",
        description: "Descrição e preço foram preenchidos automaticamente.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* === SELETOR DE CATÁLOGO (NOVO) === */}
        <div className="p-3 bg-muted/30 rounded-md border border-dashed mb-4">
          <FormLabel className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">
            Importar do Catálogo (Opcional)
          </FormLabel>
          <Select onValueChange={handleServiceSelect}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Selecione um serviço para preencher..." />
            </SelectTrigger>
            <SelectContent>
              {services?.length > 0 ? (
                services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} -{" "}
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.price)}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  Nenhum serviço cadastrado no catálogo.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* === CAMPOS ORIGINAIS (MANTÉM FUNCIONALIDADE AVULSA) === */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição do Item</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ex: Formatação de Computador, Instalação de Ar Condicionado..."
                  className="resize-none"
                  {...field}
                />
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
          <span className="text-sm font-medium text-muted-foreground">Subtotal estimado:</span>
          <span className="text-lg font-bold">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(currentSubtotal)}
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Adicionar Item"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

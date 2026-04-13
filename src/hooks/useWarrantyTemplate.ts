import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVenue } from "@/contexts/VenueContext";
import { useToast } from "@/hooks/use-toast";
import type { ServiceOrder } from "@/hooks/useServiceOrders";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DEFAULT_TEMPLATE = `TERMO DE GARANTIA E ENTREGA DE EQUIPAMENTO

Pelo presente termo, a empresa abaixo identificada declara que realizou o(s) serviço(s) descrito(s) no equipamento do cliente, conforme detalhamento a seguir:

Cliente: {cliente_nome}
Equipamento/Modelo: {equipamento_modelo}
Serviço(s) realizado(s): {detalhamento_servico}
Valor total: {valor_total}
Data de entrega: {data_entrega}
Técnico responsável: {tecnico_responsavel}

CONDIÇÕES DE GARANTIA

1. O prazo de garantia dos serviços executados é de 90 (noventa) dias corridos, contados a partir da data de entrega do equipamento.

2. A garantia cobre exclusivamente os serviços e peças descritos neste termo.

3. A garantia será automaticamente CANCELADA nos seguintes casos:
   a) Danos causados por quedas, impactos ou mau uso do equipamento;
   b) Contato com líquidos ou umidade excessiva;
   c) Rompimento do lacre de garantia;
   d) Abertura ou reparo realizado por terceiros não autorizados;
   e) Danos causados por variação de energia elétrica;
   f) Utilização de acessórios ou peças não originais/compatíveis.

4. É de responsabilidade do cliente realizar backup de todos os dados antes da entrega do equipamento. A empresa não se responsabiliza por perda de dados, arquivos, fotos, contatos ou qualquer informação armazenada no dispositivo.

5. O equipamento deve ser retirado em até 30 (trinta) dias após a comunicação de conclusão do serviço. Após este prazo, será cobrada taxa de armazenamento.

Declaro que recebi o equipamento em perfeito funcionamento, conforme os serviços descritos acima, e estou ciente das condições de garantia.`;

export function useWarrantyTemplate() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const venueId = currentVenue?.id;

  const { data: template, isLoading } = useQuery({
    queryKey: ["warranty-template", venueId],
    queryFn: async () => {
      if (!venueId) return null;
      const { data, error } = await supabase
        .from("warranty_templates")
        .select("*")
        .eq("venue_id", venueId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!venueId,
  });

  const upsertTemplate = useMutation({
    mutationFn: async (content: string) => {
      if (!venueId) throw new Error("Venue não encontrada");

      if (template?.id) {
        const { error } = await supabase
          .from("warranty_templates")
          .update({ content })
          .eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("warranty_templates")
          .insert({ venue_id: venueId, content });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranty-template", venueId] });
      toast({ title: "Template de garantia salvo!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar template", description: err.message, variant: "destructive" });
    },
  });

  const getContent = () => template?.content || DEFAULT_TEMPLATE;

  const replaceVariables = (
    text: string,
    order: ServiceOrder,
    extras?: { equipamento_modelo?: string; tecnico_responsavel?: string }
  ) => {
    const totalValue = Number(order.total) || 0;
    const formattedTotal = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(totalValue);

    const dataEntrega = order.finished_at
      ? format(new Date(order.finished_at), "dd/MM/yyyy", { locale: ptBR })
      : format(new Date(), "dd/MM/yyyy", { locale: ptBR });

    return text
      .replace(/{cliente_nome}/g, order.customer_name || "—")
      .replace(/{equipamento_modelo}/g, extras?.equipamento_modelo || "—")
      .replace(/{detalhamento_servico}/g, order.description || "—")
      .replace(/{valor_total}/g, formattedTotal)
      .replace(/{data_entrega}/g, dataEntrega)
      .replace(/{tecnico_responsavel}/g, extras?.tecnico_responsavel || "—");
  };

  return {
    template,
    isLoading,
    getContent,
    upsertTemplate,
    replaceVariables,
    DEFAULT_TEMPLATE,
  };
}

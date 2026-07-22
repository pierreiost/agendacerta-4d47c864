import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileDown, Printer, Plus, Trash2 } from "lucide-react";
import { useWarrantyTemplate } from "@/hooks/useWarrantyTemplate";
import { useWarrantyPdf, type WarrantyPdfFormat, type WarrantyItem } from "@/hooks/useWarrantyPdf";
import type { ServiceOrder } from "@/hooks/useServiceOrders";
import { supabase } from "@/integrations/supabase/client";
import { useVenue } from "@/contexts/VenueContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface WarrantyTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ServiceOrder;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(v) && v > 0 ? v : 0
  );

const toIsoDate = (d: string | null | undefined) => {
  const date = d ? new Date(d) : new Date();
  if (isNaN(date.getTime())) return format(new Date(), "yyyy-MM-dd");
  return format(date, "yyyy-MM-dd");
};

const toDisplayDate = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
};

export function WarrantyTermDialog({ open, onOpenChange, order }: WarrantyTermDialogProps) {
  const { getContent, isLoading: templateLoading } = useWarrantyTemplate();
  const { generatePdf } = useWarrantyPdf();
  const { getOrderItems } = useServiceOrders();
  const { currentVenue } = useVenue();
  const { toast } = useToast();

  const [cliente, setCliente] = useState(order.customer_name || "");
  const [equipamento, setEquipamento] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [dataEntrega, setDataEntrega] = useState(toIsoDate(order.finished_at));
  const [items, setItems] = useState<WarrantyItem[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [pdfFormat, setPdfFormat] = useState<WarrantyPdfFormat>("a4");
  const [generating, setGenerating] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Load items when opened
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setItemsLoading(true);
    getOrderItems(order.id)
      .then((rows: ServiceOrderItem[]) => {
        if (cancelled) return;
        setItems(
          rows.map((r) => ({
            description: r.description,
            quantity: Number(r.quantity) || 1,
            unit_price: Number(r.unit_price) || 0,
            warranty_days: 90,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setItemsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, order.id, getOrderItems]);

  const clausulas = getContent();

  const totalCalculado = useMemo(() => {
    const sum = items.reduce(
      (acc, it) => acc + (Number(it.unit_price) || 0) * (Number(it.quantity) || 0),
      0
    );
    // Prefer OS total if items are empty; always fallback to 0
    if (items.length === 0) return Number(order.total) || 0;
    return sum > 0 ? sum : Number(order.total) || 0;
  }, [items, order.total]);

  const updateItem = (idx: number, patch: Partial<WarrantyItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unit_price: 0, warranty_days: 90 },
    ]);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      await generatePdf(
        {
          orderNumber: order.order_number,
          cliente,
          equipamento,
          tecnico,
          dataEntrega: toDisplayDate(dataEntrega),
          clausulas,
          items,
          total: totalCalculado,
          observacoes,
        },
        pdfFormat
      );
      toast({ title: "PDF do termo gerado com sucesso!" });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto print-warranty-root">
        <DialogHeader className="no-print">
          <DialogTitle>Termo de Entrega de Garantia e Serviço — OS #{order.order_number}</DialogTitle>
          <DialogDescription>
            Revise as informações abaixo, imprima ou baixe o PDF. Alterações aqui não modificam a OS.
          </DialogDescription>
        </DialogHeader>

        {/* Action bar */}
        <div className="no-print flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Formato PDF:</Label>
            <Select value={pdfFormat} onValueChange={(v) => setPdfFormat(v as WarrantyPdfFormat)}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4 (impressora comum)</SelectItem>
                <SelectItem value="80mm">80mm (térmica)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} disabled={templateLoading || itemsLoading}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button onClick={handleGeneratePdf} disabled={generating || templateLoading || itemsLoading}>
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Baixar PDF
            </Button>
          </div>
        </div>

        {/* Printable document */}
        <div className="space-y-6 bg-white dark:bg-white text-black p-4 md:p-8 rounded-md border font-serif text-sm leading-relaxed">
          {/* Venue header */}
          <div className="flex items-start gap-4 border-b pb-4">
            {currentVenue?.logo_url && (
              <img
                src={currentVenue.logo_url}
                alt="Logo"
                className="h-16 w-16 object-contain"
                crossOrigin="anonymous"
              />
            )}
            <div className="flex-1 text-xs">
              <div className="text-base font-bold">{currentVenue?.name || "Empresa"}</div>
              {currentVenue?.cnpj_cpf && <div>CNPJ/CPF: {currentVenue.cnpj_cpf}</div>}
              {currentVenue?.address && <div>{currentVenue.address}</div>}
              {currentVenue?.phone && <div>Tel: {currentVenue.phone}</div>}
            </div>
          </div>

          {/* Title + thanks */}
          <div className="text-center space-y-2">
            <h2 className="text-lg md:text-xl font-bold uppercase tracking-wide">
              Termo de Entrega de Garantia e Serviço
            </h2>
            <p className="text-xs md:text-sm">
              Agradecemos pela confiança em nossos serviços. Este documento formaliza a entrega do
              equipamento e as condições de garantia referentes à OS #{order.order_number}.
            </p>
          </div>

          {/* Info Atendimento */}
          <section className="space-y-3">
            <h3 className="font-bold text-sm border-b pb-1">Informações do Atendimento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="w-cliente" className="text-xs">Cliente</Label>
                <Input
                  id="w-cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="h-9 bg-white text-black"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="w-equip" className="text-xs">Equipamento</Label>
                <Input
                  id="w-equip"
                  placeholder="Ex: iPhone 13 Pro, Notebook Dell..."
                  value={equipamento}
                  onChange={(e) => setEquipamento(e.target.value)}
                  className="h-9 bg-white text-black"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="w-tec" className="text-xs">Técnico responsável</Label>
                <Input
                  id="w-tec"
                  placeholder="Nome do técnico"
                  value={tecnico}
                  onChange={(e) => setTecnico(e.target.value)}
                  className="h-9 bg-white text-black"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="w-data" className="text-xs">Data de entrega</Label>
                <Input
                  id="w-data"
                  type="date"
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
                  className="h-9 bg-white text-black"
                />
              </div>
            </div>
          </section>

          {/* Cláusulas */}
          <section className="space-y-2">
            <h3 className="font-bold text-sm border-b pb-1">Cláusulas de Garantia</h3>
            <div className="whitespace-pre-wrap text-xs md:text-sm">{clausulas}</div>
          </section>

          {/* Itens */}
          <section className="space-y-2">
            <div className="flex items-center justify-between border-b pb-1">
              <h3 className="font-bold text-sm">Resumo do Serviço Realizado</h3>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={addItem}
                className="no-print h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" /> Adicionar item
              </Button>
            </div>

            {itemsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum item cadastrado.</p>
            ) : (
              <div className="border rounded overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 no-print">
                    <tr>
                      <th className="text-left p-2 font-semibold">Descrição</th>
                      <th className="text-right p-2 font-semibold w-16">Qtd</th>
                      <th className="text-right p-2 font-semibold w-28">Valor unit.</th>
                      <th className="text-right p-2 font-semibold w-24">Garantia</th>
                      <th className="text-right p-2 font-semibold w-28">Subtotal</th>
                      <th className="w-10 no-print" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const subtotal = (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
                      return (
                        <tr key={idx} className="border-t align-top">
                          <td className="p-1">
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(idx, { description: e.target.value })}
                              className="h-8 bg-white text-black text-xs"
                              placeholder="Descrição do serviço"
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              type="number"
                              min={0}
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(idx, { quantity: Number(e.target.value) || 0 })
                              }
                              className="h-8 bg-white text-black text-xs text-right"
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.unit_price}
                              onChange={(e) =>
                                updateItem(idx, { unit_price: Number(e.target.value) || 0 })
                              }
                              className="h-8 bg-white text-black text-xs text-right"
                            />
                          </td>
                          <td className="p-1">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                value={item.warranty_days}
                                onChange={(e) =>
                                  updateItem(idx, { warranty_days: Number(e.target.value) || 0 })
                                }
                                className="h-8 bg-white text-black text-xs text-right"
                              />
                              <span className="text-[10px] text-muted-foreground">dias</span>
                            </div>
                          </td>
                          <td className="p-2 text-right font-medium whitespace-nowrap">
                            {formatCurrency(subtotal)}
                          </td>
                          <td className="p-1 no-print">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => removeItem(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <div className="text-base font-bold">
                VALOR TOTAL: <span className="ml-2">{formatCurrency(totalCalculado)}</span>
              </div>
            </div>
          </section>

          {/* Observações */}
          <section className="space-y-2">
            <Label htmlFor="w-obs" className="text-xs font-semibold">Observações</Label>
            <Textarea
              id="w-obs"
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Equipamento testado com o carregador do cliente..."
              className="bg-white text-black text-xs"
            />
          </section>

          {/* Backup reminder */}
          <p className="text-xs italic text-center border-t pt-3">
            Lembrete: mantenha sempre um backup atualizado dos seus dados. A empresa não se
            responsabiliza por perda de informações.
          </p>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-10">
            <div className="text-center text-xs">
              <div className="border-t border-black pt-1">Carimbo / Assinatura da Empresa</div>
            </div>
            <div className="text-center text-xs">
              <div className="border-t border-black pt-1">Assinatura do Cliente</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

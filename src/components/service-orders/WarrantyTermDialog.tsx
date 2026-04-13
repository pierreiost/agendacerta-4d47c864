import { useState } from "react";
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
import { Loader2, FileDown } from "lucide-react";
import { useWarrantyTemplate } from "@/hooks/useWarrantyTemplate";
import { useWarrantyPdf } from "@/hooks/useWarrantyPdf";
import { useToast } from "@/hooks/use-toast";
import type { ServiceOrder } from "@/hooks/useServiceOrders";

interface WarrantyTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ServiceOrder;
}

export function WarrantyTermDialog({ open, onOpenChange, order }: WarrantyTermDialogProps) {
  const { getContent, replaceVariables, isLoading: templateLoading } = useWarrantyTemplate();
  const { generatePdf } = useWarrantyPdf();
  const { toast } = useToast();

  const [equipamentoModelo, setEquipamentoModelo] = useState("");
  const [tecnicoResponsavel, setTecnicoResponsavel] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [pdfFormat, setPdfFormat] = useState<"a4" | "80mm">("a4");
  const [generating, setGenerating] = useState(false);

  const extras = {
    equipamento_modelo: equipamentoModelo || undefined,
    tecnico_responsavel: tecnicoResponsavel || undefined,
  };

  const processedText = replaceVariables(getContent(), order, extras);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generatePdf(processedText, order, extraNotes, pdfFormat);
      toast({ title: "PDF do termo gerado com sucesso!" });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Termo de Garantia — OS #{order.order_number}</DialogTitle>
          <DialogDescription>
            Preencha os dados adicionais e visualize o documento antes de gerar o PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* LEFT — adjustments */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="equipamento">Equipamento / Modelo</Label>
              <Input
                id="equipamento"
                placeholder="Ex: iPhone 13 Pro, Notebook Dell..."
                value={equipamentoModelo}
                onChange={(e) => setEquipamentoModelo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tecnico">Técnico Responsável</Label>
              <Input
                id="tecnico"
                placeholder="Nome do técnico"
                value={tecnicoResponsavel}
                onChange={(e) => setTecnicoResponsavel(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="extra-notes">Observações extras</Label>
              <Textarea
                id="extra-notes"
                placeholder="Ex: Equipamento testado com o carregador do cliente..."
                rows={4}
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Formato de saída</Label>
              <Select value={pdfFormat} onValueChange={(v) => setPdfFormat(v as "a4" | "80mm")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4 (impressora comum)</SelectItem>
                  <SelectItem value="80mm">80mm (impressora térmica)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleGenerate} disabled={generating || templateLoading} className="w-full">
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Gerar PDF
            </Button>
          </div>

          {/* RIGHT — live preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Pré-visualização do Documento</Label>
            <div className="rounded-md border bg-white dark:bg-muted/30 p-4 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-xs md:text-sm leading-relaxed font-serif">
              {processedText}
              {extraNotes.trim() && (
                <>
                  {"\n\n"}
                  <strong>Observações adicionais:</strong>
                  {"\n"}
                  {extraNotes}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

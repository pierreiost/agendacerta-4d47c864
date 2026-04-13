import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw } from "lucide-react";
import { useWarrantyTemplate } from "@/hooks/useWarrantyTemplate";

const VARIABLES = [
  { tag: "{cliente_nome}", label: "Nome do cliente" },
  { tag: "{equipamento_modelo}", label: "Modelo do equipamento" },
  { tag: "{detalhamento_servico}", label: "Descrição do serviço" },
  { tag: "{valor_total}", label: "Valor total" },
  { tag: "{data_entrega}", label: "Data de entrega" },
  { tag: "{tecnico_responsavel}", label: "Técnico responsável" },
];

const DUMMY_ORDER = {
  customer_name: "João da Silva",
  description: "Troca de tela e bateria",
  total: 350,
  finished_at: new Date().toISOString(),
} as any;

export function WarrantyTemplateTab() {
  const { getContent, upsertTemplate, replaceVariables, isLoading, DEFAULT_TEMPLATE } = useWarrantyTemplate();
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading) {
      setContent(getContent());
    }
  }, [isLoading, getContent]);

  const insertVariable = (tag: string) => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) => prev + tag);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newContent = content.slice(0, start) + tag + content.slice(end);
    setContent(newContent);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const preview = replaceVariables(content, DUMMY_ORDER, {
    equipamento_modelo: "iPhone 13 Pro",
    tecnico_responsavel: "Carlos Técnico",
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Template do Termo de Garantia</CardTitle>
          <CardDescription>
            Edite o texto padrão que será utilizado ao gerar termos de garantia. Use as variáveis abaixo para inserir dados dinâmicos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Variables chips */}
          <div>
            <p className="text-sm font-medium mb-2">Variáveis disponíveis (clique para inserir):</p>
            <div className="flex flex-wrap gap-2">
              {VARIABLES.map((v) => (
                <Badge
                  key={v.tag}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => insertVariable(v.tag)}
                >
                  {v.tag}
                  <span className="ml-1 text-muted-foreground text-xs">({v.label})</span>
                </Badge>
              ))}
            </div>
          </div>

          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            className="font-mono text-sm"
            placeholder="Digite o texto do termo de garantia..."
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => upsertTemplate.mutate(content)}
              disabled={upsertTemplate.isPending}
            >
              {upsertTemplate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Template
            </Button>
            <Button
              variant="outline"
              onClick={() => setContent(DEFAULT_TEMPLATE)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restaurar Padrão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pré-visualização</CardTitle>
          <CardDescription>Preview com dados fictícios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-white dark:bg-muted/30 p-4 md:p-6 whitespace-pre-wrap text-sm leading-relaxed font-serif">
            {preview}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

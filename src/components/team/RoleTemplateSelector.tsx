import { Button } from "@/components/ui/button";
import { PERMISSION_TEMPLATES, type TemplateKey } from "@/lib/permission-templates";
import { Wand2 } from "lucide-react";

interface RoleTemplateSelectorProps {
  selectedTemplate: TemplateKey | null;
  onSelect: (templateKey: TemplateKey) => void;
  disabled?: boolean;
}

export function RoleTemplateSelector({ selectedTemplate, onSelect, disabled }: RoleTemplateSelectorProps) {
  const templates = Object.entries(PERMISSION_TEMPLATES) as [TemplateKey, (typeof PERMISSION_TEMPLATES)[TemplateKey]][];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wand2 className="h-4 w-4" />
        <span>Usar template pré-definido:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {templates.map(([key, template]) => (
          <Button
            key={key}
            type="button"
            variant={selectedTemplate === key ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(key)}
            disabled={disabled}
            className="min-w-[100px]"
          >
            {template.label}
          </Button>
        ))}
        <Button
          type="button"
          variant={selectedTemplate === null ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(null as any)}
          disabled={disabled}
          className="min-w-[100px]"
        >
          Personalizado
        </Button>
      </div>
      {selectedTemplate && (
        <p className="text-xs text-muted-foreground">
          {PERMISSION_TEMPLATES[selectedTemplate].description}
        </p>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useOSCustomFields, OSCustomField } from '@/hooks/useOSCustomFields';
import { Plus, Save, Trash2, FileText, Loader2, Eye } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LocalField {
  id: string;
  tempId?: string;
  display_order: number;
  content: string;
  is_active: boolean;
  is_bold: boolean;
}

const MAX_FIELDS = 5;
const MAX_CHARS = 2000;

export function OSCustomFieldsTab() {
  const { fields, isLoading, upsertFields } = useOSCustomFields();
  const [localFields, setLocalFields] = useState<LocalField[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // Initialize from server data
  useEffect(() => {
    if (fields.length > 0 || !isLoading) {
      setLocalFields(
        fields.map((f) => ({
          id: f.id,
          display_order: f.display_order,
          content: f.content,
          is_active: f.is_active,
          is_bold: f.is_bold,
        }))
      );
      setIsDirty(false);
    }
  }, [fields, isLoading]);

  const handleAddField = () => {
    if (localFields.length >= MAX_FIELDS) return;
    const nextOrder = localFields.length + 1;
    setLocalFields([
      ...localFields,
      {
        id: '',
        tempId: crypto.randomUUID(),
        display_order: nextOrder,
        content: '',
        is_active: true,
        is_bold: false,
      },
    ]);
    setIsDirty(true);
  };

  const updateField = (index: number, patch: Partial<LocalField>) => {
    setLocalFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f))
    );
    setIsDirty(true);
  };

  const removeField = (index: number) => {
    setLocalFields((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Reorder
      return updated.map((f, i) => ({ ...f, display_order: i + 1 }));
    });
    setIsDirty(true);
    setDeleteIndex(null);
  };

  const handleSave = () => {
    const toSave = localFields.map((f) => ({
      id: f.id || f.tempId || '',
      venue_id: '',
      display_order: f.display_order,
      content: f.content,
      is_active: f.is_active,
      is_bold: f.is_bold,
    }));

    // Only pass existing IDs for update; empty IDs for insert
    const payload = toSave.map((f) => ({
      ...f,
      id: fields.find((sf) => sf.id === f.id) ? f.id : '',
    }));

    upsertFields.mutate(payload, {
      onSuccess: () => setIsDirty(false),
    });
  };

  const activePreviewFields = localFields.filter((f) => f.is_active && f.content.trim());

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Campos Personalizados da OS</CardTitle>
                <CardDescription>
                  Configure textos que aparecerão no rodapé do PDF da Ordem de Serviço (termos, garantias, avisos)
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline">
              {localFields.length}/{MAX_FIELDS}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {localFields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">Nenhum campo personalizado</h3>
              <p className="text-muted-foreground mt-1 text-sm max-w-sm">
                Adicione campos de texto para incluir termos, garantias ou avisos no PDF das suas Ordens de Serviço.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {localFields.map((field, index) => (
                <div
                  key={field.id || field.tempId}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        Campo {field.display_order}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={field.is_active}
                          onCheckedChange={(checked) =>
                            updateField(index, { is_active: checked })
                          }
                        />
                        <Label className="text-sm text-muted-foreground">
                          {field.is_active ? 'Ativo' : 'Inativo'}
                        </Label>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteIndex(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Textarea
                    placeholder="Digite o texto do campo (ex: termos de garantia, avisos legais...)"
                    value={field.content}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, MAX_CHARS);
                      updateField(index, { content: value });
                    }}
                    className="min-h-[100px]"
                    disabled={!field.is_active}
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.is_bold}
                        onCheckedChange={(checked) =>
                          updateField(index, { is_bold: checked === true })
                        }
                        disabled={!field.is_active}
                      />
                      <Label className="text-sm">Exibir em negrito</Label>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {field.content.length}/{MAX_CHARS}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {localFields.length < MAX_FIELDS && (
              <Button type="button" variant="outline" onClick={handleAddField}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Campo
              </Button>
            )}
            {activePreviewFields.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Ocultar Preview' : 'Preview'}
              </Button>
            )}
          </div>

          {/* Save button */}
          <Separator />
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={!isDirty || upsertFields.isPending}
              onClick={handleSave}
            >
              {upsertFields.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Campos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && activePreviewFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Preview - Como aparecerá no PDF</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded p-6 bg-background text-foreground space-y-2 font-serif text-sm">
              <p className="font-bold text-xs uppercase tracking-wider mb-3 text-muted-foreground">
                Termos e Condições
              </p>
              {activePreviewFields.map((field) => (
                <p
                  key={field.id || field.tempId}
                  className={field.is_bold ? 'font-bold' : 'font-normal'}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {field.content}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Campo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o Campo{' '}
              {deleteIndex !== null ? localFields[deleteIndex]?.display_order : ''}? Esta ação
              não pode ser desfeita após salvar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteIndex !== null && removeField(deleteIndex)}
            >
              Sim, Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

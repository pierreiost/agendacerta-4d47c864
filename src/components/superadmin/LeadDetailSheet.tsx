import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Save } from 'lucide-react';
import { useFormPersist } from '@/hooks/useFormPersist';
import { maskPhone, unmask } from '@/lib/masks';
import type { CrmLead, CrmColumn } from '@/hooks/useCrmBoard';

interface LeadDetailFormValues {
  company_name: string;
  person_name: string;
  whatsapp: string;
  plan: string;
  segment: string;
  status_id: string;
  notes: string;
}

interface LeadDetailSheetProps {
  lead: CrmLead | null;
  columns: CrmColumn[];
  onClose: () => void;
  onUpdate: (data: Partial<CrmLead> & { id: string }) => void;
  onDelete: (id: string) => void;
}

export function LeadDetailSheet({ lead, columns, onClose, onUpdate, onDelete }: LeadDetailSheetProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasRestoredDraftRef = useRef(false);

  const form = useForm<LeadDetailFormValues>({
    defaultValues: {
      company_name: '',
      person_name: '',
      whatsapp: '',
      plan: 'basic',
      segment: 'sports',
      status_id: '',
      notes: '',
    },
  });

  const { clearDraft } = useFormPersist({
    form,
    key: `crm_edit_lead_${lead?.id || 'none'}`,
    showRecoveryToast: true,
    onRestore: () => {
      hasRestoredDraftRef.current = true;
    },
  });

  // Reset form when lead changes, but skip if draft was restored
  useEffect(() => {
    if (lead) {
      if (hasRestoredDraftRef.current) {
        hasRestoredDraftRef.current = false;
        return;
      }
      form.reset({
        company_name: lead.company_name,
        person_name: lead.person_name,
        whatsapp: lead.whatsapp ? maskPhone(lead.whatsapp) : '',
        plan: lead.plan || 'basic',
        segment: lead.segment || 'sports',
        status_id: lead.status_id,
        notes: lead.notes || '',
      });
      setConfirmDelete(false);
    }
  }, [lead, form]);

  const handleSave = form.handleSubmit((data) => {
    if (!lead) return;
    onUpdate({
      id: lead.id,
      company_name: data.company_name,
      person_name: data.person_name,
      whatsapp: unmask(data.whatsapp) || null,
      plan: data.plan,
      segment: data.segment,
      status_id: data.status_id,
      notes: data.notes || null,
    });
    clearDraft();
    onClose();
  });

  const handleDelete = () => {
    if (!lead) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    clearDraft();
    onDelete(lead.id);
    onClose();
  };

  const handleClose = () => {
    // Don't clear draft on close — user might come back
    onClose();
  };

  return (
    <Sheet open={!!lead} onOpenChange={() => handleClose()}>
      <SheetContent side="right" className="bg-slate-900 border-white/10 text-white sm:max-w-md w-full">
        <SheetHeader>
          <SheetTitle className="text-white">Detalhes do Lead</SheetTitle>
          <SheetDescription className="text-white/40">Edite as informações do lead</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          <div className="space-y-1">
            <Label className="text-white/70">Empresa *</Label>
            <Input {...form.register('company_name')} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/70">Contato *</Label>
            <Input {...form.register('person_name')} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/70">Telefone (WhatsApp)</Label>
            <Controller
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChange={(e) => field.onChange(maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="bg-white/10 border-white/20 text-white"
                />
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-white/70">Plano</Label>
              <Controller
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="max">Max</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-white/70">Segmento</Label>
              <Controller
                control={form.control}
                name="segment"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sports">Esportes</SelectItem>
                      <SelectItem value="beauty">Beleza</SelectItem>
                      <SelectItem value="health">Saúde</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-white/70">Coluna</Label>
            <Controller
              control={form.control}
              name="status_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-white/70">Observações</Label>
            <Textarea
              {...form.register('notes')}
              placeholder="Anotações sobre o lead..."
              className="bg-white/10 border-white/20 text-white min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className={`gap-1.5 ${confirmDelete ? 'border-red-500 text-red-400 hover:bg-red-500/20' : 'border-white/20 text-white/60 hover:bg-white/10'}`}
          >
            <Trash2 className="h-4 w-4" />
            {confirmDelete ? 'Confirmar exclusão' : 'Excluir'}
          </Button>
          <Button onClick={handleSave} size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-500" disabled={!form.watch('company_name') || !form.watch('person_name')}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

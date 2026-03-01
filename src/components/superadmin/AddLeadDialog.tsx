import { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFormPersist } from '@/hooks/useFormPersist';
import { maskPhone, unmask } from '@/lib/masks';
import type { CrmColumn } from '@/hooks/useCrmBoard';

interface AddLeadFormValues {
  person_name: string;
  company_name: string;
  whatsapp: string;
  plan: string;
  segment: string;
  status_id: string;
  notes: string;
}

interface AddLeadDialogProps {
  open: boolean;
  onClose: () => void;
  columns: CrmColumn[];
  onAdd: (lead: {
    person_name: string;
    company_name: string;
    whatsapp: string | null;
    plan: string;
    segment: string;
    status_id: string;
    venue_id: string | null;
    notes: string | null;
  }) => void;
  isAdding: boolean;
}

export function AddLeadDialog({ open, onClose, columns, onAdd, isAdding }: AddLeadDialogProps) {
  const prevOpenRef = useRef(false);

  const form = useForm<AddLeadFormValues>({
    defaultValues: {
      person_name: '',
      company_name: '',
      whatsapp: '',
      plan: 'basic',
      segment: 'sports',
      status_id: columns[0]?.id || '',
      notes: '',
    },
  });

  const { clearDraft } = useFormPersist({
    form,
    key: 'crm_add_lead',
    showRecoveryToast: true,
  });

  // Reset form only when dialog closes (not on mount, to protect draft)
  useEffect(() => {
    if (prevOpenRef.current && !open) {
      // Dialog just closed — don't clear draft here, it's cleared on submit/cancel
    }
    prevOpenRef.current = open;
  }, [open]);

  // Set default status_id when columns load
  useEffect(() => {
    if (columns[0]?.id && !form.getValues('status_id')) {
      form.setValue('status_id', columns[0].id);
    }
  }, [columns, form]);

  const handleSubmit = form.handleSubmit((data) => {
    if (!data.person_name || !data.company_name || !data.status_id) return;
    onAdd({
      ...data,
      whatsapp: unmask(data.whatsapp) || null,
      notes: data.notes || null,
      venue_id: null,
    });
    clearDraft();
    form.reset();
    onClose();
  });

  const handleCancel = () => {
    clearDraft();
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Novo Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
              className="bg-white/10 border-white/20 text-white min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} className="border-white/20 text-white hover:bg-white/10">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isAdding || !form.watch('person_name') || !form.watch('company_name')}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

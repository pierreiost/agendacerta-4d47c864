import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Save } from 'lucide-react';
import type { CrmLead, CrmColumn } from '@/hooks/useCrmBoard';

interface LeadDetailSheetProps {
  lead: CrmLead | null;
  columns: CrmColumn[];
  onClose: () => void;
  onUpdate: (data: Partial<CrmLead> & { id: string }) => void;
  onDelete: (id: string) => void;
}

export function LeadDetailSheet({ lead, columns, onClose, onUpdate, onDelete }: LeadDetailSheetProps) {
  const [form, setForm] = useState({
    company_name: '',
    person_name: '',
    whatsapp: '',
    plan: 'basic',
    segment: 'sports',
    status_id: '',
    notes: '',
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (lead) {
      setForm({
        company_name: lead.company_name,
        person_name: lead.person_name,
        whatsapp: lead.whatsapp || '',
        plan: lead.plan || 'basic',
        segment: lead.segment || 'sports',
        status_id: lead.status_id,
        notes: lead.notes || '',
      });
      setConfirmDelete(false);
    }
  }, [lead]);

  const handleSave = () => {
    if (!lead) return;
    onUpdate({
      id: lead.id,
      company_name: form.company_name,
      person_name: form.person_name,
      whatsapp: form.whatsapp || null,
      plan: form.plan,
      segment: form.segment,
      status_id: form.status_id,
      notes: form.notes || null,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!lead) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(lead.id);
    onClose();
  };

  return (
    <Sheet open={!!lead} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="bg-slate-900 border-white/10 text-white sm:max-w-md w-full">
        <SheetHeader>
          <SheetTitle className="text-white">Detalhes do Lead</SheetTitle>
          <SheetDescription className="text-white/40">Edite as informações do lead</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          <div className="space-y-1">
            <Label className="text-white/70">Empresa *</Label>
            <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/70">Contato *</Label>
            <Input value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/70">WhatsApp</Label>
            <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="5511999999999" className="bg-white/10 border-white/20 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-white/70">Plano</Label>
              <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="max">Max</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-white/70">Segmento</Label>
              <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sports">Esportes</SelectItem>
                  <SelectItem value="beauty">Beleza</SelectItem>
                  <SelectItem value="health">Saúde</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-white/70">Coluna</Label>
            <Select value={form.status_id} onValueChange={(v) => setForm({ ...form, status_id: v })}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-white/70">Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
          <Button onClick={handleSave} size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-500" disabled={!form.company_name || !form.person_name}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

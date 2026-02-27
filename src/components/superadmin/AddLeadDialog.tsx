import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CrmColumn } from '@/hooks/useCrmBoard';

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
  }) => void;
  isAdding: boolean;
}

export function AddLeadDialog({ open, onClose, columns, onAdd, isAdding }: AddLeadDialogProps) {
  const [form, setForm] = useState({
    person_name: '',
    company_name: '',
    whatsapp: '',
    plan: 'basic',
    segment: 'sports',
    status_id: columns[0]?.id || '',
  });

  const handleSubmit = () => {
    if (!form.person_name || !form.company_name || !form.status_id) return;
    onAdd({
      ...form,
      whatsapp: form.whatsapp || null,
      venue_id: null,
    });
    setForm({ person_name: '', company_name: '', whatsapp: '', plan: 'basic', segment: 'sports', status_id: columns[0]?.id || '' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Novo Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isAdding || !form.person_name || !form.company_name}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

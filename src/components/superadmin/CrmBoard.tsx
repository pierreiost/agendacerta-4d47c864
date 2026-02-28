import { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useCrmBoard } from '@/hooks/useCrmBoard';
import { CrmColumn } from './CrmColumn';
import { AddLeadDialog } from './AddLeadDialog';
import { LeadDetailSheet } from './LeadDetailSheet';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import type { CrmLead } from '@/hooks/useCrmBoard';

export function CrmBoard() {
  const { columns, leads, loading, moveLead, addLead, updateLead, deleteLead, isAdding } = useCrmBoard();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);

  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const lead = leads.find((l) => l.id === draggableId);
    if (!lead || lead.status_id === destination.droppableId) return;
    moveLead({ leadId: draggableId, newStatusId: destination.droppableId });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white/90">Pipeline de Vendas</h3>
        <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-500">
          <Plus className="h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 min-h-[calc(100vh-220px)]">
          {columns.map((col) => (
            <CrmColumn
              key={col.id}
              column={col}
              leads={leads.filter((l) => l.status_id === col.id)}
              onDeleteLead={deleteLead}
              onClickLead={setSelectedLead}
            />
          ))}
        </div>
      </DragDropContext>

      <AddLeadDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        columns={columns}
        onAdd={addLead}
        isAdding={isAdding}
      />

      <LeadDetailSheet
        lead={selectedLead}
        columns={columns}
        onClose={() => setSelectedLead(null)}
        onUpdate={updateLead}
        onDelete={deleteLead}
      />
    </div>
  );
}

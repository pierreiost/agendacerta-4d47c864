import { Droppable } from '@hello-pangea/dnd';
import { CrmLeadCard } from './CrmLeadCard';
import type { CrmColumn as CrmColumnType, CrmLead } from '@/hooks/useCrmBoard';

interface CrmColumnProps {
  column: CrmColumnType;
  leads: CrmLead[];
  onDeleteLead: (id: string) => void;
}

export function CrmColumn({ column, leads, onDeleteLead }: CrmColumnProps) {
  return (
    <div className="flex-shrink-0 w-72 flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: column.color }} />
        <h4 className="text-sm font-semibold text-white/90 flex-1 truncate">{column.name}</h4>
        <span className="text-xs text-white/40 font-mono bg-white/10 rounded-full px-2 py-0.5">
          {leads.length}
        </span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-3 space-y-3 min-h-[120px] overflow-y-auto transition-colors ${
              snapshot.isDraggingOver ? 'bg-indigo-500/10' : ''
            }`}
            style={{ maxHeight: 'calc(100vh - 320px)' }}
          >
            {leads.map((lead, index) => (
              <CrmLeadCard key={lead.id} lead={lead} index={index} onDelete={onDeleteLead} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

import { CrmLead } from '@/hooks/useCrmBoard';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Trash2, StickyNote, Phone } from 'lucide-react';
import { Draggable } from '@hello-pangea/dnd';
import { maskPhone, unmask } from '@/lib/masks';

const PLAN_STYLES: Record<string, string> = {
  basic: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
  max: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
};

const SEGMENT_STYLES: Record<string, string> = {
  sports: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  beauty: 'bg-pink-500/20 text-pink-300 border-pink-400/30',
  health: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  custom: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
};

interface CrmLeadCardProps {
  lead: CrmLead;
  index: number;
  onDelete: (id: string) => void;
  onClick: () => void;
}

export function CrmLeadCard({ lead, index, onDelete, onClick }: CrmLeadCardProps) {
  const phoneDigits = lead.whatsapp ? unmask(lead.whatsapp) : null;
  const whatsappUrl = phoneDigits ? `https://wa.me/55${phoneDigits}` : null;
  const formattedPhone = phoneDigits ? maskPhone(phoneDigits) : null;

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`rounded-xl border border-white/15 bg-white/[0.08] backdrop-blur-sm p-4 transition-all hover:bg-white/[0.12] hover:border-white/25 hover:shadow-lg cursor-pointer ${
            snapshot.isDragging ? 'shadow-2xl shadow-indigo-500/20 rotate-2 scale-105' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="font-semibold text-white/90 text-sm leading-tight">{lead.company_name}</p>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}
              className="text-white/20 hover:text-red-400 transition-colors shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-white/50 mb-1">{lead.person_name}</p>
          {formattedPhone && (
            <div className="flex items-center gap-1 mb-2">
              <Phone className="h-3 w-3 text-white/30" />
              <p className="text-[11px] text-white/40">{formattedPhone}</p>
            </div>
          )}
          {lead.notes && (
            <div className="flex items-start gap-1.5 mb-2">
              <StickyNote className="h-3 w-3 text-white/30 mt-0.5 shrink-0" />
              <p className="text-[11px] text-white/40 line-clamp-2">{lead.notes}</p>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PLAN_STYLES[lead.plan] || PLAN_STYLES.basic}`}>
              {lead.plan === 'max' ? 'Max' : 'Basic'}
            </Badge>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${SEGMENT_STYLES[lead.segment] || SEGMENT_STYLES.custom}`}>
              {lead.segment}
            </Badge>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-auto text-green-400 hover:text-green-300 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

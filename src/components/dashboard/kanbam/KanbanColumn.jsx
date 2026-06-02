import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanCard from './KanbanCard';
import { cn } from '@/lib/utils';

const stageConfig = {
  atendimento_ia: { label: 'Atendimento por IA', color: 'bg-primary' },
  atendendo: { label: 'Atendendo', color: 'bg-blue-500' },
  vendido_ia: { label: 'Vendido por IA', color: 'bg-emerald-400' },
  vendido_atendente: { label: 'Vendido por Atendente', color: 'bg-emerald-600' },
  perda: { label: 'Perda', color: 'bg-destructive' },
};

const formatCurrency = (val) =>
  val ? `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;

export default function KanbanColumn({ stage, leads, onCardClick, onUpdateLead }) {
  const config = stageConfig[stage] || { label: stage, color: 'bg-muted' };
  const totalValue = leads.reduce((sum, l) => sum + (Number(l.sale_value) || 0), 0);

  return (
    <div className="flex-shrink-0 w-[320px] flex flex-col h-full">
      <div className="flex items-center gap-3 mb-1 px-1">
        <div className={cn("w-2.5 h-2.5 rounded-full", config.color)} />
        <h3 className="font-semibold text-sm text-foreground">{config.label}</h3>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full font-medium">
          {leads.length}
        </span>
      </div>
      {totalValue > 0 && (
        <div className="px-1 mb-3">
          <span className="text-xs font-semibold text-emerald-400">
            {formatCurrency(totalValue)}
          </span>
        </div>
      )}
      {totalValue === 0 && <div className="mb-3" />}

      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto rounded-xl p-2 transition-colors duration-200 min-h-[200px]",
              snapshot.isDraggingOver ? 'bg-primary/5 border border-primary/20' : 'bg-transparent'
            )}
          >
            {leads.map((lead, index) => (
              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                {(provided) => (
                  <KanbanCard
                    lead={lead}
                    onClick={onCardClick}
                    provided={provided}
                    onUpdateLead={onUpdateLead}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}       
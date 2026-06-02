import React, { useState } from 'react';
import { Bot, User, AlertTriangle, ShoppingCart, DollarSign, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const tagStyles = {
  urgente: 'bg-destructive/20 text-destructive border-destructive/30',
  transbordo: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'carrinho-abandonado': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  novo: 'bg-primary/20 text-primary border-primary/30',
  vip: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export default function KanbanCard({ lead, onClick, provided, onUpdateLead }) {
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState('');

  const handleValueClick = (e) => {
    e.stopPropagation();
    setValueInput(lead.sale_value || '');
    setEditingValue(true);
  };

  const handleValueSave = (e) => {
    e.stopPropagation();
    onUpdateLead?.(lead.id, { sale_value: parseFloat(valueInput) || 0 });
    setEditingValue(false);
  };

  const handleValueCancel = (e) => {
    e.stopPropagation();
    setEditingValue(false);
  };

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={() => onClick(lead)}
      className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-all duration-200 group mb-3 shadow-sm hover:shadow-gold"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground">
            {lead.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground leading-tight">{lead.name}</p>
            <p className="text-xs text-muted-foreground">{lead.phone || 'Sem telefone'}</p>
          </div>
        </div>
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center",
          lead.attendant_type === 'ia' ? 'bg-primary/15 text-primary' : 'bg-blue-500/15 text-blue-400'
        )}>
          {lead.attendant_type === 'ia' ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
        </div>
      </div>

      {lead.needs_human && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span className="text-[11px] font-medium text-amber-400">Aguardando humano</span>
        </div>
      )}

      {lead.cart_abandoned && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <ShoppingCart className="w-3 h-3 text-orange-400" />
          <span className="text-[11px] font-medium text-orange-400">Carrinho abandonado</span>
        </div>
      )}

      {lead.last_message_preview && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {lead.last_message_preview}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {lead.tags?.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className={cn(
              "text-[10px] px-2 py-0 h-5 font-medium",
              tagStyles[tag] || 'bg-secondary text-secondary-foreground border-border'
            )}
          >
            {tag}
          </Badge>
        ))}
      </div>

      {lead.attendant_type === 'humano' && lead.attendant_name && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <User className="w-3 h-3" />
          {lead.attendant_name}
        </div>
      )}

      {/* Value section */}
      <div className="mt-3 pt-2.5 border-t border-border/50">
        {editingValue ? (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <span className="text-xs text-muted-foreground shrink-0">R$</span>
            <input
              autoFocus
              type="number"
              value={valueInput}
              onChange={e => setValueInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleValueSave(e); if (e.key === 'Escape') handleValueCancel(e); }}
              className="flex-1 bg-secondary border border-primary/40 rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary w-full"
              placeholder="0,00"
            />
            <button onClick={handleValueSave} className="text-emerald-400 hover:text-emerald-300 shrink-0">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleValueCancel} className="text-muted-foreground hover:text-destructive shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleValueClick}
            className="flex items-center gap-1.5 text-xs group/val w-full"
          >
            <DollarSign className="w-3 h-3 text-muted-foreground group-hover/val:text-primary transition-colors shrink-0" />
            {lead.sale_value ? (
              <span className="font-semibold text-emerald-400">
                R$ {Number(lead.sale_value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ) : (
              <span className="text-muted-foreground group-hover/val:text-primary transition-colors">
                Adicionar valor
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}   
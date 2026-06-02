import React, { useState } from 'react';
import { Search, SlidersHorizontal, Bot, User, AlertTriangle, CheckCheck, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_FILTERS = [
  { key: 'em_atendimento', label: 'Atendendo' },
  { key: 'em_aberto', label: 'Em aberto' },
  { key: 'resolvido', label: 'Resolvidos' },
];

export default function ChatSidebar({
  leads,
  allLeads,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onResolve,
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const counts = {
    em_atendimento: allLeads.filter(l => !l.resolved && l.stage !== 'perda').length,
    em_aberto: allLeads.filter(l => l.needs_human === true && !l.resolved).length,
    resolvido: allLeads.filter(l => l.resolved === true).length,
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!newLead.name.trim()) return;
    setSaving(true);
    await base44.entities.Lead.create({
      ...newLead,
      stage: 'atendimento_ia',
      attendant_type: 'ia',
      source: 'whatsapp',
      tags: ['novo'],
      needs_human: false,
    });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    setNewLead({ name: '', phone: '' });
    setSaving(false);
    setShowAddModal(false);
  };

  return (
    <div className="w-[340px] border-r border-border flex flex-col h-full bg-card shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-foreground">Conversas</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAddModal(true)}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Novo Lead"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome, número ou mensagem"
            className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => onStatusFilterChange(f.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap",
                statusFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground border border-border hover:border-primary/40"
              )}
            >
              {f.label}
              {counts[f.key] > 0 && (
                <span className={cn(
                  "text-[10px] font-bold min-w-[16px] text-center",
                  statusFilter === f.key ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/40">
        {leads.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhuma conversa encontrada
          </div>
        )}
        {leads.map((lead) => (
          <div
            key={lead.id}
            className={cn(
              "relative flex items-stretch transition-colors cursor-pointer",
              selectedId === lead.id ? 'bg-secondary' : 'hover:bg-secondary/60'
            )}
            onClick={() => onSelect(lead)}
          >
            {/* Finalizar strip button */}
            {!lead.resolved && (
              <button
                onClick={(e) => { e.stopPropagation(); onResolve(lead); }}
                className="bg-destructive text-white text-[9px] font-bold writing-mode-vertical flex items-center justify-center px-1.5 shrink-0 hover:bg-destructive/80 transition-colors"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', minHeight: '60px' }}
              >
                Finalizar
              </button>
            )}
            {lead.resolved && (
              <div className="bg-emerald-600/80 text-white flex items-center justify-center px-1.5 shrink-0"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', minHeight: '60px', fontSize: '9px', fontWeight: 700 }}>
                Resolvido
              </div>
            )}

            {/* Content */}
            <div className="flex items-start gap-3 p-3 flex-1 min-w-0">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground">
                  {lead.name?.charAt(0)?.toUpperCase()}
                </div>
                {lead.needs_human && !lead.resolved && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                    !
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="font-semibold text-sm text-foreground truncate">{lead.name}</p>
                  <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                    {lead.updated_date ? format(new Date(lead.updated_date), 'HH:mm') : ''}
                  </span>
                </div>

                <div className="flex items-center gap-1 mb-1.5">
                  {lead.attendant_type === 'ia'
                    ? <Bot className="w-3 h-3 text-primary shrink-0" />
                    : <User className="w-3 h-3 text-blue-400 shrink-0" />
                  }
                  <p className="text-xs text-muted-foreground truncate">
                    {lead.last_message_preview || 'Sem mensagens'}
                  </p>
                </div>

                {/* Tags row */}
                <div className="flex flex-wrap gap-1">
                  {/* Source/department tag */}
                  {lead.source && lead.source !== 'outro' && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                      {lead.source === 'whatsapp' ? 'WHATSAPP' : lead.source === 'instagram' ? 'INSTAGRAM' : lead.source.toUpperCase()}
                    </span>
                  )}
                  {/* Custom tags */}
                  {lead.tags?.map(tag => (
                    <span key={tag} className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                      {tag}
                    </span>
                  ))}
                  {/* Attendant name */}
                  {lead.attendant_name && (
                    <span className="text-[10px] bg-secondary text-foreground border border-border px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                      {lead.attendant_name}
                    </span>
                  )}
                  {/* Stage / queue */}
                  <span className="text-[10px] bg-secondary text-muted-foreground border border-border px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                    {lead.stage === 'vendido_ia' ? 'VENDIDO IA' :
                     lead.stage === 'vendido_atendente' ? 'VENDIDO' :
                     lead.stage === 'perda' ? 'PERDA' :
                     lead.stage === 'atendendo' ? 'ATENDENDO' :
                     lead.stage === 'atendimento_ia' ? 'IA' : 'SEM FILA'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-none">
          <div className="bg-card border border-border rounded-2xl p-5 w-[280px] shadow-gold-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-foreground">Novo Lead</h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddLead} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
                <input
                  value={newLead.name}
                  onChange={e => setNewLead({ ...newLead, name: e.target.value })}
                  placeholder="Nome do lead"
                  required
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">WhatsApp</label>
                <input
                  value={newLead.phone}
                  onChange={e => setNewLead({ ...newLead, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary text-primary-foreground rounded-xl py-2 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Adicionar Lead'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
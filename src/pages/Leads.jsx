import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddLeadDialog from '@/components/dashboard/kanbam/AddLeadDialog';
import LeadDetailPanel from '@/components/leads/LeadDetailPanel';
import { cn } from '@/lib/utils';

const stageColors = {
  atendimento_ia: 'bg-primary/15 text-primary border-primary/20',
  atendendo: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  vendido_ia: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  vendido_atendente: 'bg-emerald-600/15 text-emerald-300 border-emerald-600/20',
  perda: 'bg-destructive/15 text-destructive border-destructive/20',
};

const stageLabels = {
  atendimento_ia: 'Atend. IA',
  atendendo: 'Atendendo',
  vendido_ia: 'Vendido IA',
  vendido_atendente: 'Vendido Atend.',
  perda: 'Perda',
};

export default function Leads() {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); setSelectedLead(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLead(prev => prev ? { ...prev, ...updated } : prev);
    },
  });

  const filtered = leads.filter(l => {
    const matchSearch = l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search) ||
      l.email?.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === 'all' || l.stage === stageFilter;
    return matchSearch && matchStage;
  });

  // Sync selectedLead with latest data
  const currentSelected = selectedLead ? (leads.find(l => l.id === selectedLead.id) || selectedLead) : null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: Lead list */}
      <div className={cn("flex flex-col h-full border-r border-border bg-background transition-all duration-200", currentSelected ? 'w-[400px] shrink-0' : 'flex-1')}>
        {/* Header */}
        <div className="p-5 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">CRM</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{leads.length} leads cadastrados</p>
            </div>
            <Button onClick={() => setShowAdd(true)} className="bg-primary text-primary-foreground h-9">
              <Plus className="w-4 h-4 mr-2" />
              Novo Lead
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, telefone ou email..."
                className="pl-9 bg-secondary border-border h-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-40 bg-secondary border-border h-9 shrink-0">
                <SelectValue placeholder="Todas as etapas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="atendimento_ia">Atend. IA</SelectItem>
                <SelectItem value="atendendo">Atendendo</SelectItem>
                <SelectItem value="vendido_ia">Vendido IA</SelectItem>
                <SelectItem value="vendido_atendente">Vendido Atend.</SelectItem>
                <SelectItem value="perda">Perda</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {isLoading && (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhum lead encontrado</div>
          )}
          {filtered.map((lead) => (
            <button
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className={cn(
                "w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-secondary/40 transition-colors",
                currentSelected?.id === lead.id && 'bg-secondary'
              )}
            >
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold shrink-0 text-foreground">
                {lead.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{lead.name}</p>
                <p className="text-xs text-muted-foreground truncate">{lead.phone || lead.email || '—'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-md border font-semibold", stageColors[lead.stage])}>
                  {stageLabels[lead.stage] || lead.stage}
                </span>
                {lead.sale_value > 0 && (
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    R$ {Number(lead.sale_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Detail panel */}
      {currentSelected && (
        <LeadDetailPanel
          lead={currentSelected}
          onClose={() => setSelectedLead(null)}
          onSave={(id, data) => updateMutation.mutate({ id, data })}
          onDelete={(id) => deleteMutation.mutate(id)}
          extraAction={{ label: 'Abrir Chat', onClick: () => navigate(`/chat?lead=${currentSelected.id}`) }}
        />
      )}

      <AddLeadDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={(data) => createMutation.mutate(data)}
      />
    </div>
  );
}
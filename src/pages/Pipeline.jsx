import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext } from '@hello-pangea/dnd';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import KanbanColumn from '@/components/dashboard/kanbam/KanbanColumn';
import AddLeadDialog from '@/components/dashboard/kanbam/AddLeadDialog';
import LeadDetailPanel from '@/components/leads/LeadDetailPanel';
import { useNavigate } from 'react-router-dom';

const STAGES = ['atendimento_ia', 'atendendo', 'vendido_ia', 'vendido_atendente', 'perda'];

export default function Pipeline() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-updated_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLead(prev => prev ? { ...prev, ...updated } : prev);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); setSelectedLead(null); },
  });

  const filteredLeads = leads.filter(l =>
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.phone?.includes(search) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    const lead = leads.find(l => l.id === draggableId);
    if (!lead || lead.stage === newStage) return;

    const updateData = { stage: newStage };

    if (newStage === 'vendido_ia' || newStage === 'vendido_atendente') {
      const today = new Date().toISOString().split('T')[0];
      const renewal = new Date();
      renewal.setDate(renewal.getDate() + 90);
      updateData.sale_date = today;
      updateData.renewal_date = renewal.toISOString().split('T')[0];
    }

    updateMutation.mutate({ id: draggableId, data: updateData });
  };

  const handleCardClick = (lead) => {
    setSelectedLead(lead);
  };

  const currentSelected = selectedLead ? (leads.find(l => l.id === selectedLead.id) || selectedLead) : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Pipeline</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{leads.length} leads no funil</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar lead..."
              className="pl-9 w-64 bg-secondary border-border h-9"
            />
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="bg-primary text-primary-foreground h-9">
            <Plus className="w-4 h-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Kanban + Side panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-x-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-6 h-full min-w-max">
                {STAGES.map((stage) => (
                  <KanbanColumn
                    key={stage}
                    stage={stage}
                    leads={filteredLeads.filter(l => l.stage === stage)}
                    onCardClick={handleCardClick}
                    onUpdateLead={(id, data) => updateMutation.mutate({ id, data })}
                  />
                ))}
              </div>
            </DragDropContext>
          )}
        </div>

        {/* Detail Panel */}
        {currentSelected && (
          <div className="w-[380px] shrink-0 border-l border-border overflow-hidden">
            <LeadDetailPanel
              lead={currentSelected}
              onClose={() => setSelectedLead(null)}
              onSave={(id, data) => updateMutation.mutate({ id, data })}
              onDelete={(id) => deleteMutation.mutate(id)}
              extraAction={{ label: 'Abrir Chat', onClick: () => navigate(`/chat?lead=${currentSelected.id}`) }}
            />
          </div>
        )}
      </div>

      <AddLeadDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSave={(data) => createMutation.mutate(data)}
      />
    </div>
  );
}
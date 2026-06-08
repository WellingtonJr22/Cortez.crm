import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatWindow from '@/components/chat/ChatWindow';

export default function Chat() {
  const [selectedLead, setSelectedLead] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('em_atendimento'); // em_atendimento | em_aberto | resolvido
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-updated_date'),
  });

  // Team members available to receive a forwarded conversation (admins + attendants).
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['users-team'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  // Check URL param for lead
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const leadId = urlParams.get('lead');
    if (leadId && leads.length > 0) {
      const lead = leads.find(l => l.id === leadId);
      if (lead) setSelectedLead(lead);
    }
  }, [leads]);

  const isAdmin = currentUser?.role === 'admin';

  // Filtro de visibilidade: admin vê todos, atendente vê apenas os seus
  const visibleLeads = leads.filter(lead => {
    if (isAdmin) return true;
    return (
      lead.created_by === currentUser?.email ||
      lead.attendant_email === currentUser?.email ||
      lead.attendant_name === currentUser?.full_name ||
      lead.attendant_name === currentUser?.email
    );
  });

  // Filtro por status
  const filteredByStatus = visibleLeads.filter(lead => {
    if (statusFilter === 'em_atendimento') return !lead.resolved && lead.stage !== 'perda';
    if (statusFilter === 'em_aberto') return lead.needs_human === true && !lead.resolved;
    if (statusFilter === 'resolvido') return lead.resolved === true;
    return true;
  });

  // Filtro de busca
  const filteredLeads = filteredByStatus.filter(l =>
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.phone?.includes(search) ||
    l.last_message_preview?.toLowerCase().includes(search.toLowerCase())
  );

  const handleTransfer = (lead) => {
    const data = {
      attendant_type: 'humano',
      attendant_name: currentUser?.full_name || 'Atendente',
      attendant_email: currentUser?.email || null,
      needs_human: false,
    };
    updateMutation.mutate({ id: lead.id, data });
    setSelectedLead({ ...lead, ...data });
  };

  // Encaminha (atribui) a conversa para outro membro da equipe.
  const handleForward = (lead, member) => {
    const data = {
      attendant_type: 'humano',
      attendant_name: member.full_name || member.email,
      attendant_email: member.email,
      needs_human: false,
    };
    updateMutation.mutate({ id: lead.id, data });
    if (selectedLead?.id === lead.id) setSelectedLead({ ...lead, ...data });
  };

  const handleResolve = (lead) => {
    updateMutation.mutate({ id: lead.id, data: { resolved: true } });
    if (selectedLead?.id === lead.id) setSelectedLead({ ...lead, resolved: true });
  };

  return (
    <div className="h-screen flex">
      <ChatSidebar
        leads={filteredLeads}
        allLeads={visibleLeads}
        selectedId={selectedLead?.id}
        onSelect={setSelectedLead}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onResolve={handleResolve}
      />
      <ChatWindow
        lead={selectedLead}
        currentUser={currentUser}
        teamMembers={teamMembers}
        onTransfer={handleTransfer}
        onForward={handleForward}
        onResolve={handleResolve}
      />
    </div>
  );
}
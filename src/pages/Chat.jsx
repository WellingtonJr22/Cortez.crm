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

  // Active attendants a conversation can be forwarded/assigned to (admins only).
  const { data: attendants = [] } = useQuery({
    queryKey: ['attendants'],
    queryFn: () => base44.entities.User.listAttendants(),
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

  // The server already returns only the leads this user may see (admins: all;
  // attendants: only the ones assigned to them), so no extra client filter is
  // needed for visibility — that guarantee cannot be bypassed from the browser.
  const visibleLeads = leads;

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

  // "Assumir": flip the conversation to human handling. Visibility/assignment is
  // unchanged — the lead is already this user's (or the admin sees everything).
  const handleTransfer = (lead) => {
    const data = {
      attendant_type: 'humano',
      needs_human: false,
    };
    updateMutation.mutate({ id: lead.id, data });
    setSelectedLead({ ...lead, ...data });
  };

  // Admin assigns the conversation/lead to a specific attendant. The server
  // validates the target is an active attendant and rewrites the denormalised
  // name/email; the role enforcement does not trust this request.
  const handleForward = (lead, member) => {
    const data = {
      attendant_type: 'humano',
      assigned_to_user_id: member.id,
      needs_human: false,
    };
    updateMutation.mutate({ id: lead.id, data });
    if (selectedLead?.id === lead.id) {
      setSelectedLead({
        ...lead,
        ...data,
        assigned_to_name: member.full_name || member.email,
        assigned_to_email: member.email,
      });
    }
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
        teamMembers={isAdmin ? attendants : []}
        onTransfer={handleTransfer}
        onForward={handleForward}
        onResolve={handleResolve}
      />
    </div>
  );
}
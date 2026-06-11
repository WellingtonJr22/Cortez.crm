import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, MessageCircle, Mail, Clock, CheckCircle2, Trash2, Plus, History } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const contactMeta = {
  call: { label: 'Ligação', icon: Phone, color: 'text-sky-400 bg-sky-500/15' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-400 bg-emerald-500/15' },
  email: { label: 'E-mail', icon: Mail, color: 'text-amber-400 bg-amber-500/15' },
};

const actionLabels = {
  call: 'Ligar',
  whatsapp: 'Mandar WhatsApp',
  email: 'Enviar e-mail',
};

// Format a Date for an <input type="datetime-local"> value (local time, no seconds).
function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nowInput() {
  return toLocalInput(new Date());
}

// Default next-action suggestion: tomorrow at 10:00, matching the example flow.
function tomorrowInput() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toLocalInput(d);
}

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// "amanhã às 10:00", "hoje às 14:30" or a full date for the next-action banner.
function formatRelative(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
  if (diffDays === 0) return `hoje às ${time}`;
  if (diffDays === 1) return `amanhã às ${time}`;
  if (diffDays === -1) return `ontem às ${time}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${time}`;
}

const emptyForm = () => ({
  contact_type: 'call',
  contact_date: nowInput(),
  customer_feedback: '',
  summary: '',
  next_action_type: 'whatsapp',
  next_action_date: tomorrowInput(),
});

const inputClass =
  'w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50';

function FieldLabel({ children }) {
  return <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{children}</label>;
}

export default function LeadActivities({ leadId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const queryKey = ['lead-activities', leadId];

  const { data: activities = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => base44.entities.LeadActivity.list({ lead_id: leadId }, '-contact_date'),
    enabled: !!leadId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadActivity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setForm(emptyForm());
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeadActivity.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LeadActivity.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = () => {
    if (createMutation.isPending) return;
    createMutation.mutate({
      lead_id: leadId,
      contact_type: form.contact_type,
      contact_date: form.contact_date ? new Date(form.contact_date).toISOString() : null,
      customer_feedback: form.customer_feedback,
      summary: form.summary,
      next_action_type: form.next_action_type || null,
      next_action_date: form.next_action_date ? new Date(form.next_action_date).toISOString() : null,
      status: 'pending',
    });
  };

  // Most recent pending follow-up, highlighted so the timing isn't lost.
  const nextPending = activities
    .filter((a) => a.status === 'pending' && a.next_action_type && a.next_action_date)
    .sort((a, b) => new Date(a.next_action_date) - new Date(b.next_action_date))[0];

  return (
    <div className="bg-secondary/50 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          Histórico de Atendimento
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {showForm ? 'Fechar' : 'Registrar'}
        </button>
      </div>

      {/* Next pending action banner */}
      {nextPending && (
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs text-foreground">
            Próxima ação:{' '}
            <span className="font-semibold">
              {contactMeta[nextPending.next_action_type]?.label || nextPending.next_action_type}
            </span>{' '}
            {formatRelative(nextPending.next_action_date)}
          </span>
        </div>
      )}

      {/* Registration form */}
      {showForm && (
        <div className="space-y-2.5 bg-card/60 border border-border rounded-xl p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <FieldLabel>Tipo de contato</FieldLabel>
              <Select value={form.contact_type} onValueChange={(v) => set('contact_type', v)}>
                <SelectTrigger className="bg-secondary border-border h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Ligação</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <FieldLabel>Data/hora</FieldLabel>
              <input
                type="datetime-local"
                value={form.contact_date}
                onChange={(e) => set('contact_date', e.target.value)}
                className={cn(inputClass, 'h-9 py-0')}
              />
            </div>
          </div>

          <div className="space-y-1">
            <FieldLabel>O que o cliente falou?</FieldLabel>
            <textarea
              value={form.customer_feedback}
              onChange={(e) => set('customer_feedback', e.target.value)}
              rows={2}
              placeholder="Ex.: quer fechar, mas pediu para chamar amanhã às 10h"
              className={cn(inputClass, 'resize-none')}
            />
          </div>

          <div className="space-y-1">
            <FieldLabel>Resumo do atendimento</FieldLabel>
            <textarea
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              rows={2}
              placeholder="Resumo do contato..."
              className={cn(inputClass, 'resize-none')}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <FieldLabel>Próxima ação</FieldLabel>
              <Select value={form.next_action_type} onValueChange={(v) => set('next_action_type', v)}>
                <SelectTrigger className="bg-secondary border-border h-9 text-sm">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Ligar</SelectItem>
                  <SelectItem value="whatsapp">Mandar WhatsApp</SelectItem>
                  <SelectItem value="email">Enviar e-mail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <FieldLabel>Data da próxima</FieldLabel>
              <input
                type="datetime-local"
                value={form.next_action_date}
                onChange={(e) => set('next_action_date', e.target.value)}
                className={cn(inputClass, 'h-9 py-0')}
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="w-full bg-primary text-primary-foreground rounded-xl py-2 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {createMutation.isPending ? 'Registrando...' : 'Registrar atividade'}
          </button>
        </div>
      )}

      {/* History list, most recent first */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground py-2">Carregando histórico...</p>
      ) : activities.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Nenhum atendimento registrado ainda.</p>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-0.5">
          {activities.map((a) => {
            const meta = contactMeta[a.contact_type] || contactMeta.call;
            const Icon = meta.icon;
            const done = a.status === 'done';
            return (
              <div key={a.id} className="bg-card/60 border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md', meta.color)}>
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{formatDateTime(a.contact_date)}</span>
                </div>

                {a.customer_feedback && (
                  <p className="text-xs text-foreground leading-snug">
                    <span className="text-muted-foreground">Cliente: </span>
                    {a.customer_feedback}
                  </p>
                )}
                {a.summary && (
                  <p className="text-xs text-muted-foreground leading-snug">{a.summary}</p>
                )}

                {a.next_action_type && a.next_action_date && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Próxima: {actionLabels[a.next_action_type] || a.next_action_type} · {formatRelative(a.next_action_date)}
                  </div>
                )}

                <div className="flex items-center justify-between pt-0.5">
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-md',
                      done ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                    )}
                  >
                    {done ? 'Concluída' : 'Pendente'}
                  </span>
                  <div className="flex items-center gap-1">
                    {!done && (
                      <button
                        onClick={() => updateMutation.mutate({ id: a.id, data: { status: 'done' } })}
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Concluir
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm('Excluir esta atividade?')) deleteMutation.mutate(a.id); }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

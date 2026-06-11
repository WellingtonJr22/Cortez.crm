import React, { useState, useEffect } from 'react';
import { X, Phone, Mail, Calendar, DollarSign, MapPin, User, Bot, MessageCircle, Trash2, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import AttendantSelect from '@/components/leads/AttendantSelect';
import LeadActivities from '@/components/leads/LeadActivities';
import { cn } from '@/lib/utils';

const sourceLabels = {
  whatsapp: 'WhatsApp',
  website: 'Website',
  instagram: 'Instagram',
  facebook: 'Facebook',
  indicacao: 'Indicação',
  outro: 'Outro',
};

const sourceColors = {
  whatsapp: 'bg-emerald-500/15 text-emerald-400',
  instagram: 'bg-pink-500/15 text-pink-400',
  facebook: 'bg-blue-500/15 text-blue-400',
  website: 'bg-purple-500/15 text-purple-400',
  indicacao: 'bg-amber-500/15 text-amber-400',
  outro: 'bg-secondary text-muted-foreground',
};

const stageOptions = [
  { value: 'atendimento_ia', label: 'Atendimento por IA' },
  { value: 'atendendo', label: 'Atendendo' },
  { value: 'vendido_ia', label: 'Vendido por IA' },
  { value: 'vendido_atendente', label: 'Vendido por Atendente' },
  { value: 'perda', label: 'Perda' },
];

function Field({ label, icon: Icon, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || '—'}
      className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
    />
  );
}

export default function LeadDetailPanel({ lead, onClose, onSave, onDelete, extraAction }) {
  const [form, setForm] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...lead });
    setDirty(false);
  }, [lead.id]);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setDirty(true);
  };

  // Update the responsible attendant (and its denormalised name/email) from the
  // chosen attendant object, or clear it when set to "no responsible".
  const setAttendant = (att) => {
    setForm(f => ({
      ...f,
      assigned_to_user_id: att?.id || null,
      assigned_to_name: att?.full_name || att?.email || '',
      assigned_to_email: att?.email || null,
      attendant_name: att?.full_name || att?.email || '',
      attendant_email: att?.email || null,
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(lead.id, form);
    setSaving(false);
    setDirty(false);
  };

  const whatsappUrl = lead.phone
    ? `https://wa.me/${lead.phone.replace(/\D/g, '')}`
    : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-card border-l border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-base font-bold text-primary">
            {lead.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">{lead.name}</p>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-semibold", sourceColors[lead.source])}>
              {sourceLabels[lead.source] || 'Origem desconhecida'}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* WhatsApp + Chat CTAs */}
        <div className="flex gap-2">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          ) : null}
          {extraAction && (
            <button
              onClick={extraAction.onClick}
              className={cn(
                "flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-xl py-2.5 text-sm font-semibold transition-colors",
                whatsappUrl ? "flex-1" : "w-full"
              )}
            >
              {extraAction.label}
            </button>
          )}
        </div>

        {/* Contact */}
        <div className="bg-secondary/50 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">Contato</p>
          <Field label="Nome" icon={User}>
            <TextInput value={form.name} onChange={v => set('name', v)} placeholder="Nome do cliente" />
          </Field>
          <Field label="WhatsApp" icon={Phone}>
            <TextInput value={form.phone} onChange={v => set('phone', v)} placeholder="(11) 99999-9999" />
          </Field>
          <Field label="Email" icon={Mail}>
            <TextInput value={form.email} onChange={v => set('email', v)} placeholder="email@exemplo.com" type="email" />
          </Field>
          <Field label="Aniversário" icon={Calendar}>
            <TextInput value={form.birthday} onChange={v => set('birthday', v)} type="date" />
          </Field>
        </div>

        {/* Pipeline */}
        <div className="bg-secondary/50 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">Pipeline & Origem</p>
          <Field label="Etapa">
            <Select value={form.stage || ''} onValueChange={v => set('stage', v)}>
              <SelectTrigger className="bg-secondary border-border h-9 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {stageOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Origem" icon={MapPin}>
            <Select value={form.source || ''} onValueChange={v => set('source', v)}>
              <SelectTrigger className="bg-secondary border-border h-9 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="indicacao">Indicação</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tipo de Atendimento">
            <Select value={form.attendant_type || ''} onValueChange={v => set('attendant_type', v)}>
              <SelectTrigger className="bg-secondary border-border h-9 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ia"><span className="flex items-center gap-1.5"><Bot className="w-3 h-3" />IA</span></SelectItem>
                <SelectItem value="humano"><span className="flex items-center gap-1.5"><User className="w-3 h-3" />Humano</span></SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Atendente Responsável" icon={User}>
            <AttendantSelect value={form.assigned_to_user_id} onChange={setAttendant} />
          </Field>
        </div>

        {/* Financeiro */}
        <div className="bg-secondary/50 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">Financeiro</p>
          <Field label="Valor da Venda (R$)" icon={DollarSign}>
            <TextInput value={form.sale_value} onChange={v => set('sale_value', v)} type="number" placeholder="0,00" />
          </Field>
          <Field label="Data da Venda" icon={Calendar}>
            <TextInput value={form.sale_date} onChange={v => set('sale_date', v)} type="date" />
          </Field>
          {form.sale_value > 0 && (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
              <span className="text-xs text-muted-foreground">Valor registrado</span>
              <span className="text-sm font-bold text-emerald-400">
                R$ {Number(form.sale_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {form.stage === 'perda' && (
            <Field label="Motivo de Perda">
              <textarea
                value={form.loss_reason || ''}
                onChange={e => set('loss_reason', e.target.value)}
                rows={2}
                placeholder="Descreva o motivo..."
                className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
              />
            </Field>
          )}
        </div>

        {/* Notas */}
        <div className="bg-secondary/50 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">Observações internas</p>
          <textarea
            value={form.notes || ''}
            onChange={e => set('notes', e.target.value)}
            rows={4}
            placeholder="Anote informações relevantes sobre este lead..."
            className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
          />
        </div>

        {/* Histórico de Atendimento */}
        <LeadActivities leadId={lead.id} />
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border flex items-center gap-2 shrink-0">
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex-1 bg-primary text-primary-foreground h-9"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-destructive/10 h-9 w-9"
          onClick={() => { if (confirm('Excluir este lead?')) onDelete(lead.id); }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
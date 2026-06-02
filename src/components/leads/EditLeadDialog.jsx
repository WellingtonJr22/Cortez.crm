import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fields = [
  { key: 'name', label: 'Nome', type: 'text', required: true },
  { key: 'phone', label: 'WhatsApp', type: 'text', placeholder: '(11) 99999-9999' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'birthday', label: 'Aniversário', type: 'date' },
  { key: 'sale_value', label: 'Valor da Venda (R$)', type: 'number' },
  { key: 'loss_reason', label: 'Motivo de Perda', type: 'text' },
  { key: 'notes', label: 'Observações', type: 'textarea' },
];

export default function EditLeadDialog({ lead, open, onClose, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) setForm({ ...lead });
  }, [lead]);

  if (!open || !lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(lead.id, form);
    setSaving(false);
    onClose();
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-gold-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-sm text-foreground">Editar Lead</h2>
            <p className="text-xs text-muted-foreground">{lead.name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {fields.map(({ key, label, type, placeholder, required }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground mb-1 block">{label}{required && ' *'}</label>
              {type === 'textarea' ? (
                <textarea
                  value={form[key] || ''}
                  onChange={e => set(key, e.target.value)}
                  rows={3}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                />
              ) : (
                <input
                  type={type}
                  value={form[key] || ''}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                  required={required}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              )}
            </div>
          ))}

          {/* Stage */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Etapa</label>
            <Select value={form.stage || ''} onValueChange={v => set('stage', v)}>
              <SelectTrigger className="bg-secondary border-border h-9 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="atendimento_ia">Atendimento por IA</SelectItem>
                <SelectItem value="atendendo">Atendendo</SelectItem>
                <SelectItem value="vendido_ia">Vendido por IA</SelectItem>
                <SelectItem value="vendido_atendente">Vendido por Atendente</SelectItem>
                <SelectItem value="perda">Perda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Origem</label>
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
          </div>

          {/* Attendant type */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Atendente</label>
            <Select value={form.attendant_type || ''} onValueChange={v => set('attendant_type', v)}>
              <SelectTrigger className="bg-secondary border-border h-9 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ia">IA</SelectItem>
                <SelectItem value="humano">Humano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </div>
  );
}   
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AttendantSelect from '@/components/leads/AttendantSelect';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Bot, User } from 'lucide-react';

const EMPTY = {
  name: '',
  phone: '',
  email: '',
  source: 'whatsapp',
  birthday: '',
  notes: '',
  stage: 'atendimento_ia',
  attendant_type: 'ia',
  assigned_to_user_id: null,
  assigned_to_name: '',
  assigned_to_email: null,
};

export default function AddLeadDialog({ open, onClose, onSave }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [form, setForm] = useState(EMPTY);

  const setAttendant = (att) => {
    setForm((f) => ({
      ...f,
      assigned_to_user_id: att?.id || null,
      assigned_to_name: att?.full_name || att?.email || '',
      assigned_to_email: att?.email || null,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      tags: ['novo'],
      needs_human: false,
      cart_abandoned: false,
    });
    setForm(EMPTY);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Novo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do lead"
              required
              className="bg-secondary border-border"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemplo.com"
                className="bg-secondary border-border"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
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
            <div className="space-y-2">
              <Label>Aniversário</Label>
              <Input
                type="date"
                value={form.birthday}
                onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
          </div>
          {/* Pipeline & Origem */}
          <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
            <p className="text-xs font-semibold text-foreground">Pipeline &amp; Origem</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Etapa</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
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
              <div className="space-y-2">
                <Label>Tipo de Atendimento</Label>
                <Select value={form.attendant_type} onValueChange={(v) => setForm({ ...form, attendant_type: v })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ia"><span className="flex items-center gap-1.5"><Bot className="w-3 h-3" />IA</span></SelectItem>
                    <SelectItem value="humano"><span className="flex items-center gap-1.5"><User className="w-3 h-3" />Humano</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Atendente Responsável</Label>
              <AttendantSelect value={form.assigned_to_user_id} onChange={setAttendant} />
              <p className="text-[11px] text-muted-foreground">
                {isAdmin
                  ? 'Opcional — deixe sem responsável para distribuir depois.'
                  : 'Novos leads criados por você são atribuídos automaticamente a você.'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas sobre o lead..."
              className="bg-secondary border-border h-20"
            />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Lead
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
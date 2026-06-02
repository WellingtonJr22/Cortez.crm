import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Plus, Pencil, Trash2, CheckCircle2, Wifi, Cloud, Instagram, ChevronDown, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const CHANNEL_TABS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: '📱' },
  { id: 'meta', label: 'Meta Cloud API', icon: '☁️' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
];

const defaultMeta = () => ({
  id: Date.now(),
  name: '',
  phone: '',
  waba_id: '',
  phone_id: '',
  token: '',
  status: 'connected',
  is_default: false,
  last_updated: new Date().toISOString(),
});

export default function Conexoes() {
  const [channelTab, setChannelTab] = useState('meta');
  const [connections, setConnections] = useState(() => {
    try { return JSON.parse(localStorage.getItem('meta_connections') || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editConn, setEditConn] = useState(null);
  const [form, setForm] = useState(defaultMeta());
  const [showToken, setShowToken] = useState(false);

  const save = (conns) => {
    setConnections(conns);
    localStorage.setItem('meta_connections', JSON.stringify(conns));
  };

  const openAdd = () => { setForm(defaultMeta()); setEditConn(null); setShowForm(true); };
  const openEdit = (c) => { setForm({ ...c }); setEditConn(c.id); setShowForm(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone_id || !form.token) {
      toast.error('Preencha Nome, Phone ID e Token');
      return;
    }
    if (editConn) {
      save(connections.map(c => c.id === editConn ? { ...form, last_updated: new Date().toISOString() } : c));
      toast.success('Conexão atualizada!');
    } else {
      const newConn = { ...form, id: Date.now(), last_updated: new Date().toISOString() };
      save([...connections, newConn]);
      toast.success('Conexão adicionada!');
    }
    setShowForm(false);
  };

  const handleDelete = (id) => {
    save(connections.filter(c => c.id !== id));
    toast.success('Conexão removida');
  };

  const setDefault = (id) => {
    save(connections.map(c => ({ ...c, is_default: c.id === id })));
  };

  const formatDate = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear().toString().slice(-2)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Conexões</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-border text-muted-foreground text-xs">
            📋 Templates
          </Button>
          <Button variant="outline" size="sm" className="border-border text-muted-foreground text-xs">
            📢 Campanhas
          </Button>
          <Button variant="outline" size="sm" className="border-border text-muted-foreground text-xs">
            📊 Uso
          </Button>
          <Button onClick={openAdd} size="sm" className="bg-primary text-primary-foreground text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Conectar Cloud API
          </Button>
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="flex gap-1 border-b border-border">
        {CHANNEL_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setChannelTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px",
              channelTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Meta Cloud API Tab */}
      {channelTab === 'meta' && (
        <div>
          {connections.length === 0 && !showForm ? (
            <div className="bg-card border border-dashed border-border rounded-2xl py-16 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">☁️</div>
              <p className="font-semibold text-foreground">Nenhuma conexão Meta Cloud API</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Conecte seu WABA (WhatsApp Business Account) para disparar mensagens via API Oficial da Meta sem risco de banimento.
              </p>
              <Button onClick={openAdd} className="bg-primary text-primary-foreground mt-2">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Conexão
              </Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Nome', 'Canal', 'Status', 'Agente IA', 'Sessão', 'Última atualização', 'Padrão', 'Ações'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {connections.map(conn => (
                    <tr key={conn.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-foreground">{conn.name}</p>
                        <p className="text-xs text-muted-foreground">{conn.phone}</p>
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/25 px-1.5 py-0.5 rounded">
                          ☁️ API Oficial
                        </span>
                        {(conn.waba_id || conn.phone_id) && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {conn.waba_id && `WABA: ${conn.waba_id}`}{conn.waba_id && conn.phone_id && ' | '}{conn.phone_id && `Phone ID: ${conn.phone_id}`}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-medium">WhatsApp</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">Nenhum</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant="outline" className="text-xs h-7 border-primary/30 text-primary hover:bg-primary/10">Desconectar</Button>
                          <Button size="sm" variant="outline" className="text-xs h-7 border-border text-muted-foreground gap-1">
                            <Cloud className="w-3 h-3" /> Detalhes
                          </Button>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{formatDate(conn.last_updated)}</td>
                      <td className="px-5 py-4">
                        {conn.is_default && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        )}
                        {!conn.is_default && (
                          <button onClick={() => setDefault(conn.id)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                            Definir
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(conn)} className="text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(conn.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {channelTab !== 'meta' && (
        <div className="bg-card border border-dashed border-border rounded-2xl py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground text-sm">Em breve — {CHANNEL_TABS.find(t => t.id === channelTab)?.label}</p>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-gold">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">{editConn ? 'Editar Conexão' : 'Nova Conexão Meta Cloud API'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Nome da Conexão *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: RECEPÇÃO SALÃO"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Telefone</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+55 (62) 9865-6838"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">WABA ID</label>
                <input
                  value={form.waba_id}
                  onChange={e => setForm(f => ({ ...f, waba_id: e.target.value }))}
                  placeholder="Ex: 899022253453555"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Phone ID *</label>
                <input
                  value={form.phone_id}
                  onChange={e => setForm(f => ({ ...f, phone_id: e.target.value }))}
                  placeholder="Ex: 1082511028278746"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Token de Acesso Permanente *</label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={form.token}
                    onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
                    placeholder="EAAxxxxxxxxxxxxxxx..."
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  <button type="button" onClick={() => setShowToken(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Gere em Meta for Developers → seu App → WhatsApp → Configuração</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1 bg-primary text-primary-foreground">
                  {editConn ? 'Salvar Alterações' : 'Adicionar Conexão'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}   
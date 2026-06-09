import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Trash2, MailCheck, AlertTriangle,
  Crown, CheckCircle2, XCircle, Smartphone, Link2,
  Copy, RefreshCw, Zap, Settings2, ChevronRight,
  Pencil, Eye, EyeOff, X, Star, Wifi, WifiOff, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// ─── WhatsApp multi-connection helpers ───────────────────────────────────────
const WA_KEY = 'wa_connections';
const getWaConnections = () => { try { return JSON.parse(localStorage.getItem(WA_KEY) || '[]'); } catch { return []; } };
const saveWaConnections = (list) => localStorage.setItem(WA_KEY, JSON.stringify(list));
const defaultConn = () => ({ id: Date.now(), name: '', phone: '', api_url: '', token: '', provider: 'zapi', tenant_id: '', is_default: false, status: null });

// Monta a URL correta para cada provedor
const buildApiUrl = (form) => {
  if (form.provider === 'wati') {
    return form.tenant_id ? `https://live.wati.io/${form.tenant_id.trim()}` : '';
  }
  return form.api_url;
};

const PROVIDERS = [
  { id: 'zapi', label: 'Z-API', badge: '⭐ Recomendado', url: 'https://z-api.io' },
  { id: 'evolution', label: 'Evolution API', badge: 'Open Source', url: 'https://evolution-api.com' },
  { id: 'wati', label: 'Wati.io', badge: 'Meta BSP', url: 'https://wati.io' },
  { id: 'outro', label: 'Outro / Custom', badge: 'Custom', url: '#' },
];

const TAB_ITEMS = [
  { id: 'equipe', label: 'Equipe & Acessos', icon: Users },
  { id: 'whatsapp', label: 'WhatsApp API', icon: Smartphone },
  { id: 'sistema', label: 'Sistema', icon: Settings2 },
];

const roleLabel = { admin: 'Administrador', atendente: 'Atendente' };
const roleColor = {
  admin: 'bg-primary/15 text-primary border-primary/30',
  atendente: 'bg-secondary text-muted-foreground border-border',
};

const ROLE_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'admin', label: 'Administradores' },
  { id: 'atendente', label: 'Atendentes' },
];

export default function Configuracoes() {
  const [tab, setTab] = useState('equipe');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('atendente');
  const [roleFilter, setRoleFilter] = useState('all');
  const [inviting, setInviting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // WhatsApp multi-connection state
  const [waConnections, setWaConnections] = useState(getWaConnections);
  const [showWaForm, setShowWaForm] = useState(false);
  const [editWaId, setEditWaId] = useState(null);
  const [waForm, setWaForm] = useState(defaultConn());
  const [showToken, setShowToken] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [sendTestId, setSendTestId] = useState(null);
  const [testPhone, setTestPhone] = useState('');
  const [showTestModal, setShowTestModal] = useState(null); // conn object

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  // The full team roster is admin-only on the server; only fetch it for admins.
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-admin'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const admins = users.filter(u => u.role === 'admin');
  const visibleUsers = roleFilter === 'all' ? users : users.filter(u => u.role === roleFilter);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    if (inviteRole === 'admin' && admins.length >= 3) {
      toast.error('Limite de 3 administradores atingido. Rebaixe um admin antes de promover outro.');
      return;
    }
    setInviting(true);
    try {
      const res = await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      if (res?.email_sent) {
        toast.success(`Convite enviado por email para ${inviteEmail}`);
      } else if (res?.email_skipped) {
        toast.success(`Convite criado para ${inviteEmail}. Envio de email não configurado — avise a pessoa para se cadastrar com este email.`);
      } else {
        toast.success(`Convite criado para ${inviteEmail}, mas o email não pôde ser enviado${res?.email_error ? `: ${res.email_error}` : ''}. Avise a pessoa para se cadastrar com este email.`);
      }
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['users-admin'] });
    } catch {
      toast.error('Erro ao convidar usuário');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (user, newRole) => {
    if (newRole === 'admin' && admins.length >= 3) {
      toast.error('Limite de 3 administradores atingido.');
      return;
    }
    if (user.id === currentUser?.id && newRole !== 'admin') {
      toast.error('Você não pode rebaixar sua própria conta.');
      return;
    }
    try {
      await base44.entities.User.update(user.id, { role: newRole });
      toast.success(`${user.full_name} agora é ${roleLabel[newRole]}`);
      queryClient.invalidateQueries({ queryKey: ['users-admin'] });
    } catch {
      toast.error('Erro ao alterar permissão');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Remover ${user.full_name || user.email} da equipe?`)) return;
    setDeletingId(user.id);
    try {
      await base44.entities.User.delete(user.id);
      toast.success(`${user.full_name || user.email} removido da equipe`);
      queryClient.invalidateQueries({ queryKey: ['users-admin'] });
    } catch {
      toast.error('Erro ao remover membro');
    } finally {
      setDeletingId(null);
    }
  };

  const webhookUrl = `${window.location.origin}/api/v1/webhooks/message-received`;

  const openAddWa = () => { setWaForm(defaultConn()); setEditWaId(null); setShowToken(false); setShowWaForm(true); };
  const openEditWa = (c) => { setWaForm({ tenant_id: '', ...c }); setEditWaId(c.id); setShowToken(false); setShowWaForm(true); };

  const saveWaForm = (e) => {
    e.preventDefault();
    const finalUrl = buildApiUrl(waForm);
    if (!waForm.name || !finalUrl || !waForm.token) {
      toast.error(waForm.provider === 'wati' ? 'Preencha Nome, Tenant ID e Token.' : 'Preencha Nome, URL da API e Token.');
      return;
    }
    const waFormFinal = { ...waForm, api_url: finalUrl };
    let updated;
    if (editWaId) {
      updated = waConnections.map(c => c.id === editWaId ? { ...waFormFinal } : c);
      toast.success('Conexão atualizada!');
    } else {
      const isFirst = waConnections.length === 0;
      updated = [...waConnections, { ...waFormFinal, id: Date.now(), is_default: isFirst }];
      toast.success('Conexão adicionada!');
    }
    saveWaConnections(updated);
    setWaConnections(updated);
    // keep legacy keys pointing to default conn for backward compat
    const def = updated.find(c => c.is_default) || updated[0];
    if (def) { localStorage.setItem('wa_api_url', def.api_url); localStorage.setItem('wa_token', def.token); }
    setShowWaForm(false);
  };

  const deleteWaConn = (id) => {
    const updated = waConnections.filter(c => c.id !== id);
    if (updated.length > 0 && !updated.some(c => c.is_default)) updated[0].is_default = true;
    saveWaConnections(updated);
    setWaConnections(updated);
    toast.success('Conexão removida');
  };

  const setWaDefault = (id) => {
    const updated = waConnections.map(c => ({ ...c, is_default: c.id === id }));
    saveWaConnections(updated);
    setWaConnections(updated);
    const def = updated.find(c => c.is_default);
    if (def) { localStorage.setItem('wa_api_url', def.api_url); localStorage.setItem('wa_token', def.token); }
    toast.success('Conexão padrão definida!');
  };

  const testWaConn = async (conn) => {
    setTestingId(conn.id);
    let ok = false;
    let errorMsg = '';
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Faça uma requisição HTTP GET para verificar o status da API de WhatsApp com os seguintes dados:
- Provedor: ${conn.provider}
- URL base: ${conn.api_url}
- Token: ${conn.token}

Para Z-API: GET {url}/status com header "Client-Token: {token}"
Para Evolution: GET {url} com header "apikey: {token}"  
Para Wati: GET {url} com header "Authorization: Bearer {token}"
Para outros: GET {url} com header "Authorization: Bearer {token}"

Tente fazer a requisição e retorne se a API está acessível ou não. Se não conseguir fazer a requisição, informe o motivo.
Retorne JSON com: { "ok": true/false, "status_code": número ou null, "message": "descrição do resultado" }`,
        response_json_schema: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            status_code: { type: 'number' },
            message: { type: 'string' }
          }
        }
      });
      ok = result?.ok === true;
      errorMsg = result?.message || '';
    } catch {
      ok = false;
      errorMsg = 'Erro ao verificar';
    }
    const updated = waConnections.map(c => c.id === conn.id ? { ...c, status: ok ? 'ok' : 'error' } : c);
    saveWaConnections(updated);
    setWaConnections(updated);
    setTestingId(null);
    ok
      ? toast.success(`${conn.name}: API acessível! ${errorMsg}`)
      : toast.error(`${conn.name}: ${errorMsg || 'Falha. Verifique URL e Token.'}`);
  };

  const sendTestMessage = async (conn) => {
    if (!testPhone.trim()) { toast.error('Informe o número para teste'); return; }
    setSendTestId(conn.id);
    const phone = testPhone.replace(/\D/g, '');
    const message = '✅ Mensagem de teste do CRM Cortez Academy. Se recebeu, a integração está funcionando!';
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Envie uma mensagem de WhatsApp via API HTTP POST com os seguintes dados:

Provedor: ${conn.provider}
URL base da API: ${conn.api_url}
Token: ${conn.token}
Número destino: ${phone}
Mensagem: "${message}"

Endpoints corretos por provedor:
- Z-API: POST {url}/send-text | header "Client-Token: {token}" | body: {"phone": "{numero}", "message": "{mensagem}"}
- Evolution API: POST {url}/message/sendText | header "apikey: {token}" | body: {"number": "{numero}", "text": "{mensagem}"}
- Wati: POST {url_base}/api/v1/sendSessionMessage/{numero} | header "Authorization: Bearer {token}" | body: {"messageText": "{mensagem}"}
- Outro: POST {url} | header "Authorization: Bearer {token}" | body: {"phone": "{numero}", "message": "{mensagem}"}

IMPORTANTE: A URL base fornecida pode ser uma URL de documentação (ex: /api-docs). Identifique e use a URL base correta da API de envio.

Faça a requisição e retorne o resultado.
Retorne JSON com: { "sent": true/false, "status_code": número, "response_body": "resposta da api", "error": "mensagem de erro se houver", "url_used": "url que foi usada" }`,
        response_json_schema: {
          type: 'object',
          properties: {
            sent: { type: 'boolean' },
            status_code: { type: 'number' },
            response_body: { type: 'string' },
            error: { type: 'string' },
            url_used: { type: 'string' }
          }
        }
      });

      if (result?.sent) {
        toast.success('✅ Mensagem enviada com sucesso! Verifique o WhatsApp.');
        setShowTestModal(null);
        setTestPhone('');
      } else {
        const detail = result?.error || result?.response_body || `Status ${result?.status_code}`;
        toast.error(`Falha ao enviar: ${detail}`, { duration: 8000 });
        // Mostra a URL usada para ajudar debug
        if (result?.url_used) {
          toast.info(`URL usada: ${result.url_used}`, { duration: 8000 });
        }
      }
    } catch (err) {
      toast.error('Erro interno ao tentar enviar. Tente novamente.');
    } finally {
      setSendTestId(null);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie equipe, integrações e preferências do sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-8 w-fit">
        {TAB_ITEMS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === t.id
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== EQUIPE ===== */}
      {tab === 'equipe' && !isAdmin && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
          <Users className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="font-semibold text-foreground">Gerenciamento de equipe restrito</p>
          <p className="text-sm text-muted-foreground">
            Apenas administradores podem visualizar e gerenciar os membros da equipe.
          </p>
        </div>
      )}

      {tab === 'equipe' && isAdmin && (
        <div className="space-y-6">
          {/* Admin limit warning */}
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-xl border text-sm",
            admins.length >= 3
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : "bg-primary/8 border-primary/25 text-foreground"
          )}>
            <Crown className="w-5 h-5 shrink-0" />
            <span>
              <strong>Administradores:</strong> {admins.length}/3 —{' '}
              {admins.length >= 3
                ? 'Limite atingido. Remova um admin antes de promover outro.'
                : `Ainda há vaga para mais ${3 - admins.length} administrador${3 - admins.length > 1 ? 'es' : ''}.`}
            </span>
          </div>

          {/* Invite */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Convidar Novo Membro
            </h2>
            <form onSubmit={handleInvite} className="flex gap-3 flex-wrap">
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="bg-secondary border-border flex-1 min-w-[200px]"
                required
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="bg-secondary border border-border text-foreground rounded-md px-3 py-2 text-sm"
              >
                <option value="atendente">Atendente</option>
                <option value="admin" disabled={admins.length >= 3}>
                  Administrador {admins.length >= 3 ? '(limite atingido)' : ''}
                </option>
              </select>
              <Button type="submit" disabled={inviting} className="bg-primary text-primary-foreground">
                <MailCheck className="w-4 h-4 mr-2" />
                {inviting ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">O convite cria um <strong>Atendente</strong> por padrão. O membro fica como <em>convidado</em> até criar a senha.</p>
          </div>

          {/* User list */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-foreground">Membros da Equipe</h2>
              <div className="flex items-center gap-2">
                {/* Visual filter by role */}
                <div className="flex gap-1 bg-secondary rounded-lg p-1">
                  {ROLE_FILTERS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setRoleFilter(f.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                        roleFilter === f.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <Badge variant="outline" className="text-xs">{visibleUsers.length} membros</Badge>
              </div>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
            ) : (
              <div className="divide-y divide-border">
                {visibleUsers.map(user => {
                  const isMe = user.id === currentUser?.id;
                  const isUserAdmin = user.role === 'admin';
                  const isLastAdmin = isUserAdmin && admins.length <= 1;
                  return (
                    <div key={user.id} className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0">
                        {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground text-sm truncate">{user.full_name || 'Sem nome'}</p>
                          {isMe && <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">Você</span>}
                          {user.status === 'invited' && <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">Convidado</span>}
                          {user.status === 'suspended' && <span className="text-[10px] bg-destructive/15 text-destructive px-2 py-0.5 rounded-full">Suspenso</span>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        {user.created_at && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Desde {format(new Date(user.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      {/* Role badge */}
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0", roleColor[user.role] || roleColor.atendente)}>
                        {isUserAdmin && <Crown className="w-3 h-3 inline mr-1" />}
                        {roleLabel[user.role] || 'Atendente'}
                      </span>
                      {/* Actions */}
                      {!isMe && (
                        <div className="flex items-center gap-2 shrink-0">
                          {isUserAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRoleChange(user, 'atendente')}
                              disabled={isLastAdmin}
                              title={isLastAdmin ? 'Não é possível rebaixar o último administrador' : undefined}
                              className="text-xs border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
                            >
                              Rebaixar
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRoleChange(user, 'admin')}
                              disabled={admins.length >= 3}
                              className="text-xs border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-40"
                            >
                              <Crown className="w-3 h-3 mr-1" /> Promover
                            </Button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={deletingId === user.id || isLastAdmin}
                            className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-40"
                            title={isLastAdmin ? 'Não é possível remover o último administrador' : 'Remover membro'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {visibleUsers.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">Nenhum membro encontrado</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== WHATSAPP ===== */}
      {tab === 'whatsapp' && (
        <div className="space-y-6">

          {/* Header + Add button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-foreground">Conexões WhatsApp</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Gerencie múltiplas instâncias — cada uma pode ser usada em disparos separados.</p>
            </div>
            <Button onClick={openAddWa} className="bg-primary text-primary-foreground gap-1.5">
              <Plus className="w-4 h-4" /> Adicionar Conexão
            </Button>
          </div>

          {/* Connection cards */}
          {waConnections.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-2xl py-16 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">📱</div>
              <p className="font-semibold text-foreground">Nenhuma conexão configurada</p>
              <p className="text-sm text-muted-foreground max-w-sm">Adicione ao menos uma instância WhatsApp (Z-API, Evolution ou Wati) para habilitar os disparos.</p>
              <Button onClick={openAddWa} className="bg-primary text-primary-foreground mt-1"><Plus className="w-4 h-4 mr-2" />Adicionar Conexão</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {waConnections.map(conn => (
                <div key={conn.id} className={cn(
                  "bg-card border rounded-2xl p-5 transition-all",
                  conn.is_default ? "border-primary/40 shadow-gold" : "border-border"
                )}>
                  <div className="flex items-start gap-4">
                    {/* Status dot */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                      conn.status === 'ok' ? "bg-emerald-500/15 border border-emerald-500/25" :
                      conn.status === 'error' ? "bg-destructive/15 border border-destructive/25" :
                      "bg-secondary border border-border"
                    )}>
                      {conn.status === 'ok' ? <Wifi className="w-5 h-5 text-emerald-400" /> :
                       conn.status === 'error' ? <WifiOff className="w-5 h-5 text-destructive" /> :
                       <Smartphone className="w-5 h-5 text-muted-foreground" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground">{conn.name}</p>
                        {conn.is_default && (
                          <span className="flex items-center gap-1 text-[10px] bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 rounded-full font-semibold">
                            <Star className="w-2.5 h-2.5" /> Padrão
                          </span>
                        )}
                        <span className="text-[10px] bg-secondary border border-border text-muted-foreground px-2 py-0.5 rounded-full">
                          {PROVIDERS.find(p => p.id === conn.provider)?.label || conn.provider}
                        </span>
                        {conn.status === 'ok' && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Conectado</span>}
                        {conn.status === 'error' && <span className="text-[10px] text-destructive flex items-center gap-1"><XCircle className="w-3 h-3" /> Erro</span>}
                      </div>
                      {conn.phone && <p className="text-xs text-muted-foreground mt-0.5">{conn.phone}</p>}
                      <p className="text-xs text-muted-foreground font-mono truncate mt-0.5 max-w-md">{conn.api_url}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testWaConn(conn)}
                      disabled={testingId === conn.id}
                      className="text-xs border-border h-8"
                    >
                      {testingId === conn.id
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <><Zap className="w-3.5 h-3.5 mr-1" />Verificar API</>
                      }
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowTestModal(conn); setTestPhone(conn.phone || ''); }}
                      className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-8"
                    >
                      <Send className="w-3.5 h-3.5 mr-1" /> Enviar Teste
                    </Button>
                      {!conn.is_default && (
                        <Button variant="outline" size="sm" onClick={() => setWaDefault(conn.id)} className="text-xs border-border h-8">
                          <Star className="w-3.5 h-3.5 mr-1" /> Padrão
                        </Button>
                      )}
                      <button onClick={() => openEditWa(conn)} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteWaConn(conn.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Webhook URL */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" /> Webhook de Entrada
            </h3>
            <p className="text-sm text-muted-foreground">Configure este URL no painel de cada instância para receber mensagens no CRM.</p>
            <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-3 border border-border">
              <code className="text-xs text-primary flex-1 break-all font-mono">{webhookUrl}</code>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('URL copiada!'); }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-3 pt-1">
              {PROVIDERS.filter(p => p.id !== 'outro').map(p => (
                <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"
                  className="bg-secondary border border-border rounded-xl p-4 hover:border-primary/30 transition-colors group">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-foreground text-sm">{p.label}</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full">{p.badge}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Send Test Modal */}
          {showTestModal && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-gold">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-400" /> Enviar Mensagem de Teste
                  </h3>
                  <button onClick={() => setShowTestModal(null)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="bg-secondary border border-border rounded-xl p-3 text-sm text-muted-foreground">
                    Conexão: <span className="text-foreground font-semibold">{showTestModal.name}</span>
                    <span className="ml-2 text-xs bg-card border border-border px-2 py-0.5 rounded-full">
                      {PROVIDERS.find(p => p.id === showTestModal.provider)?.label}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Número para receber o teste (com DDI)
                    </label>
                    <input
                      value={testPhone}
                      onChange={e => setTestPhone(e.target.value)}
                      placeholder="5562999998888"
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Ex: 5562999998888 (55 = Brasil + DDD + número, sem espaços)</p>
                    {showTestModal?.provider === 'wati' && (
                      <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-xs text-amber-300">
                        ⚠️ <strong>Wati:</strong> A URL deve ser a base da API, ex: <code>https://live.wati.io/10166052</code> (sem <code>/api-docs</code>)
                      </div>
                    )}
                  </div>
                  <div className="bg-primary/8 border border-primary/20 rounded-xl p-3 text-xs text-muted-foreground">
                    📨 Será enviado: <em>"✅ Mensagem de teste do CRM Cortez Academy. Se recebeu, a integração está funcionando!"</em>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowTestModal(null)} className="flex-1">Cancelar</Button>
                    <Button
                      onClick={() => sendTestMessage(showTestModal)}
                      disabled={sendTestId === showTestModal.id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {sendTestId === showTestModal.id
                        ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                        : <><Send className="w-4 h-4 mr-2" /> Enviar Agora</>
                      }
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add/Edit Modal */}
          {showWaForm && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-gold">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h3 className="font-bold text-foreground">{editWaId ? 'Editar Conexão' : 'Nova Conexão WhatsApp'}</h3>
                  <button onClick={() => setShowWaForm(false)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
                </div>
                <form onSubmit={saveWaForm} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Nome da Conexão *</label>
                      <input value={waForm.name} onChange={e => setWaForm(f => ({...f, name: e.target.value}))}
                        placeholder="Ex: Recepção Salão, Vendas, Suporte..."
                        className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Provedor</label>
                      <select value={waForm.provider} onChange={e => setWaForm(f => ({...f, provider: e.target.value}))}
                        className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50">
                        {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Número WhatsApp</label>
                      <input value={waForm.phone} onChange={e => setWaForm(f => ({...f, phone: e.target.value}))}
                        placeholder="5562999998888"
                        className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                    </div>
                    {waForm.provider === 'wati' ? (
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Tenant ID (número do Wati) *</label>
                        <input value={waForm.tenant_id} onChange={e => setWaForm(f => ({...f, tenant_id: e.target.value}))}
                          placeholder="Ex: 10166052"
                          className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          É o número que aparece na URL do seu painel Wati: <code className="bg-secondary px-1 rounded">live.wati.io/<strong>10166052</strong>/dashboard</code>
                        </p>
                        {waForm.tenant_id && (
                          <p className="text-xs text-emerald-400 mt-1">✓ URL montada: <code>https://live.wati.io/{waForm.tenant_id.trim()}</code></p>
                        )}
                      </div>
                    ) : (
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">URL da API *</label>
                        <input value={waForm.api_url} onChange={e => setWaForm(f => ({...f, api_url: e.target.value}))}
                          placeholder="https://api.z-api.io/instances/SEU_ID/token/SEU_TOKEN"
                          className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                      </div>
                    )}
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Token / Client-Token *</label>
                      <div className="relative">
                        <input type={showToken ? 'text' : 'password'} value={waForm.token} onChange={e => setWaForm(f => ({...f, token: e.target.value}))}
                          placeholder="••••••••••••••••"
                          className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                        <button type="button" onClick={() => setShowToken(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" onClick={() => setShowWaForm(false)} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1 bg-primary text-primary-foreground">{editWaId ? 'Salvar' : 'Adicionar'}</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== SISTEMA ===== */}
      {tab === 'sistema' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold text-foreground mb-4">Informações do Sistema</h2>
            <div className="space-y-0 divide-y divide-border">
              {[
                { k: 'Plataforma', v: 'Base44 CRM — Cortez Academy' },
                { k: 'Versão', v: '1.0.0' },
                { k: 'Ambiente', v: 'Produção' },
                { k: 'Banco de Dados', v: 'Base44 Entities (AES-256)' },
                { k: 'Autenticação', v: 'Base44 Auth — JWT 2h' },
                { k: 'IA', v: 'Base44 InvokeLLM (GPT-4o)' },
                { k: 'Tempo Real', v: 'Base44 Subscribe' },
                { k: 'Upload de Mídia', v: 'Base44 UploadFile CDN' },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between py-3 text-sm">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-foreground font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary/8 border border-primary/25 rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" /> Regras de Segurança Ativas
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Limite de 3 administradores simultâneos</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> RBAC por endpoint (admin vs. atendente)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Campos sensíveis mascarados (LGPD)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Tokens WhatsApp armazenados localmente (nunca no servidor)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
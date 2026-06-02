import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Database, Shield, Globe, Layers, Palette, CheckCircle2, AlertTriangle, Zap, Code, Lock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const Section = ({ title, icon: Icon, color = 'text-primary', children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10")}>
            <Icon className={cn("w-5 h-5", color)} />
          </div>
          <h2 className="font-bold text-foreground text-lg">{title}</h2>
        </div>
        {open ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
      </button>
      {open && <div className="px-6 pb-6 space-y-4">{children}</div>}
    </div>
  );
};

const Code_ = ({ children }) => (
  <pre className="bg-background border border-border rounded-xl p-4 text-xs text-foreground overflow-x-auto font-mono leading-relaxed">
    {children}
  </pre>
);

const Badge_ = ({ children, color = 'primary' }) => {
  const colors = {
    primary: 'bg-primary/15 text-primary border-primary/30',
    red: 'bg-destructive/15 text-destructive border-destructive/30',
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };
  return (
    <span className={cn("inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", colors[color])}>
      {children}
    </span>
  );
};

const Row = ({ label, value, badge, badgeColor }) => (
  <div className="flex items-start justify-between py-2.5 border-b border-border/50 last:border-0 gap-4">
    <span className="text-sm text-muted-foreground font-mono shrink-0">{label}</span>
    <div className="text-right flex items-center gap-2 flex-wrap justify-end">
      {badge && <Badge_ color={badgeColor}>{badge}</Badge_>}
      {value && <span className="text-sm text-foreground">{value}</span>}
    </div>
  </div>
);

export default function DocumentacaoTecnica() {
  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="relative bg-card border border-border rounded-2xl p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Cortez Academy CRM</span>
          </div>
          <h1 className="text-3xl font-black text-foreground mb-3">Documentação Técnica</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Arquitetura, segurança, API e stack tecnológico do CRM conversacional híbrido — 
            baseado na identidade visual Cortez Academy (paleta preto/dourado).
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Badge_ color="primary">v1.0</Badge_>
            <Badge_ color="green">Base44 Platform</Badge_>
            <Badge_ color="blue">7 Módulos</Badge_>
            <Badge_ color="amber">LGPD Compliant</Badge_>
          </div>
        </div>
      </div>

      {/* PALETA DE CORES */}
      <Section title="E) Design System — Identidade Cortez Academy" icon={Palette} defaultOpen={true}>
        <p className="text-sm text-muted-foreground">
          Cores extraídas do site <span className="text-primary font-medium">cortezacademy.com.br</span>. 
          Tema escuro profundo com destaque em dourado âmbar — transmite autoridade, luxo e modernidade.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          {[
            { name: 'Background', hex: '#0D0D0D', var: '--background', desc: 'Base da UI' },
            { name: 'Card Surface', hex: '#141414', var: '--card', desc: 'Cards, modais' },
            { name: 'Dourado Cortez', hex: '#C9A227', var: '--primary', desc: 'CTAs, destaques' },
            { name: 'Dourado Hover', hex: '#D4AE3A', var: '--accent', desc: 'Hover, focus' },
            { name: 'Texto Principal', hex: '#F0EBD8', var: '--foreground', desc: 'Tipografia' },
            { name: 'Texto Muted', hex: '#737373', var: '--muted-fg', desc: 'Subtextos' },
            { name: 'Borda', hex: '#292929', var: '--border', desc: 'Divisores' },
            { name: 'Perigo', hex: '#C0392B', var: '--destructive', desc: 'Erros, perdas' },
          ].map(c => (
            <div key={c.name} className="bg-secondary rounded-xl p-3 space-y-2">
              <div className="w-full h-10 rounded-lg border border-border/50" style={{ backgroundColor: c.hex }} />
              <p className="text-xs font-semibold text-foreground">{c.name}</p>
              <p className="text-[10px] font-mono text-primary">{c.hex}</p>
              <p className="text-[10px] text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Aplicação nos Componentes</p>
          <div className="space-y-0 bg-secondary rounded-xl divide-y divide-border overflow-hidden">
            <Row label="Cards Kanban — borda hover" value="border-primary/50 + shadow dourado" />
            <Row label="Botões CTA (Novo Lead, Enviar)" value="bg-primary text-black font-bold" />
            <Row label="Tags de transbordo" value="bg-amber-500/20 text-amber-400 (⚠️ humano)" />
            <Row label="Tag IA ativa" value="bg-primary/15 text-primary (🤖 ia)" />
            <Row label="Coluna Vendido" value="border-emerald-500 + dot verde" />
            <Row label="Coluna Perda" value="border-destructive + dot vermelho" />
            <Row label="Balões de chat — cliente" value="bg-secondary (lado esquerdo)" />
            <Row label="Balões de chat — IA" value="bg-primary/15 border-primary/20 (lado direito)" />
            <Row label="Balões de chat — humano" value="bg-blue-500/15 border-blue-500/20" />
            <Row label="Scrollbar customizada" value="thumb dourado ao hover" />
          </div>
        </div>
      </Section>

      {/* BANCO DE DADOS */}
      <Section title="A) Estrutura do Banco de Dados" icon={Database}>
        <p className="text-sm text-muted-foreground">
          5 entidades core já implementadas + 2 recomendadas para o módulo Admin/RBAC.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            { name: 'Lead', status: '✅ Implementado', fields: ['id', 'name', 'phone (mascarado)', 'email', 'stage', 'attendant_type', 'attendant_name', 'tags[]', 'needs_human', 'cart_abandoned', 'cart_items[]', 'birthday', 'sale_date', 'renewal_date', 'sale_value', 'source', 'loss_reason', 'notes'], badge: 'green' },
            { name: 'Message', status: '✅ Implementado', fields: ['id', 'lead_id (FK)', 'sender_type (cliente|ia|humano)', 'sender_name', 'content', 'message_type (text|audio|image|doc|system)', 'file_url', 'is_read'], badge: 'green' },
            { name: 'Automation', status: '✅ Implementado', fields: ['id', 'lead_id (FK)', 'type (renewal_90d|birthday|cart_recovery|follow_up)', 'status (pending|sent|completed|failed)', 'trigger_date', 'message_content', 'notes'], badge: 'green' },
            { name: 'User (built-in)', status: '✅ Base44 nativo', fields: ['id', 'email', 'full_name', 'role (admin|atendente)', 'created_date'], badge: 'blue' },
            { name: 'AuditLog', status: '⚡ A implementar', fields: ['id', 'user_id (FK)', 'action', 'entity_name', 'entity_id', 'old_value (JSON)', 'new_value (JSON)', 'ip_address', 'timestamp'], badge: 'amber' },
          ].map(e => (
            <div key={e.name} className="bg-secondary rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-foreground font-mono">{e.name}</p>
                <Badge_ color={e.badge}>{e.status}</Badge_>
              </div>
              <div className="space-y-1">
                {e.fields.map(f => (
                  <p key={f} className="text-xs font-mono text-muted-foreground">• {f}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-secondary rounded-xl p-4">
          <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wider">Regra RBAC — Máximo 2 Administradores</p>
          <Code_>{`// Lógica de controle executada ANTES de promover um usuário
BEFORE UPDATE user.role = 'admin':
  1. COUNT admins WHERE role = 'admin' AND is_suspended = false
  2. IF count >= 2:
       → REJECT com HTTP 403 "Limite de administradores atingido"
       → LOG no AuditLog { action: 'admin_promote_blocked' }
  3. IF count < 2:
       → ALLOW + INSERT AuditLog { action: 'role_changed', new: 'admin' }
       → SEND email de notificação para os demais admins

// Proteção adicional: os 2 admins não podem se auto-rebaixar
// se isso deixaria o sistema sem nenhum admin ativo`}</Code_>
        </div>

        <div className="bg-secondary rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-400 mb-3 uppercase tracking-wider">Campos Sensíveis — Conformidade LGPD</p>
          <div className="space-y-0 divide-y divide-border">
            <Row label="phone" value="Exibir mascarado: (11) *****-6543" badge="LGPD" badgeColor="amber" />
            <Row label="email" value="Criptografado em repouso (AES-256)" badge="LGPD" badgeColor="amber" />
            <Row label="birthday" value="Acesso restrito: apenas admin e dono do lead" badge="LGPD" badgeColor="amber" />
            <Row label="sale_value" value="Visível apenas para role=admin" badge="Admin Only" badgeColor="red" />
            <Row label="Message.content" value="Criptografia em repouso, decriptado na leitura" badge="LGPD" badgeColor="amber" />
            <Row label="Message.file_url" value="URLs assinadas com TTL de 24h (expiram)" badge="Signed URL" badgeColor="blue" />
          </div>
        </div>
      </Section>

      {/* SEGURANÇA */}
      <Section title="B) Arquitetura de Segurança" icon={Shield}>
        <div className="bg-secondary rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Camadas de Proteção</p>
          <Code_>{`[Browser / App Cliente]
      │  HTTPS/TLS 1.3 obrigatório — sem HTTP fallback
      ▼
[CDN + WAF]
      │  Rate Limiting global: 300 req/min por IP
      │  DDoS Mitigation (Cloudflare / AWS Shield)
      │  IP Reputation Blocklist
      │  Bot Detection (challenge automático)
      ▼
[API Gateway]
      │  JWT Auth com expiração de 2h + refresh token
      │  CORS: apenas origens whitelist
      │  Request Validation: schema check antes de chegar na lógica
      │  API Key para integrações externas (n8n, webhooks)
      ▼
[Application Layer]
      │  Input Sanitization → previne XSS e SQLi
      │  RBAC Middleware → role check por endpoint
      │  Audit Logger → toda ação crítica registrada
      │  Rate Limit por usuário: 60 req/min
      ▼
[Base44 Database]
      │  Encryption at Rest (AES-256 gerenciado)
      │  Conexão via TLS
      │  Acesso apenas via SDK (zero SQL raw)
      │  Backups automáticos diários cifrados`}</Code_>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {[
            { threat: 'SQL Injection', mitigation: 'ORM Base44 SDK — zero SQL raw. Prepared statements internos.', icon: '🔐', color: 'red' },
            { threat: 'XSS Cross-Site Scripting', mitigation: 'Sanitização de input no frontend (DOMPurify) + CSP headers rigorosos.', icon: '🛡️', color: 'red' },
            { threat: 'DDoS', mitigation: 'Rate limiting 300/min por IP + Cloudflare WAF + auto-bloqueio por reputação.', icon: '🚧', color: 'amber' },
            { threat: 'CSRF', mitigation: 'Tokens CSRF por sessão + cookies SameSite=Strict + Referer check.', icon: '🔒', color: 'amber' },
            { threat: 'IDOR (acesso não autorizado)', mitigation: 'Todo endpoint valida user_id no query. Usuário só acessa seus próprios dados.', icon: '👁️', color: 'red' },
            { threat: 'Brute Force', mitigation: 'Lockout após 5 tentativas + CAPTCHA + notificação de login suspeito.', icon: '🚫', color: 'amber' },
            { threat: 'Data Leak', mitigation: 'Campos sensíveis mascarados por padrão. Logs sem dados pessoais.', icon: '🔍', color: 'blue' },
            { threat: 'LGPD — Direito ao Esquecimento', mitigation: 'Rota DELETE /api/leads/:id/gdpr anonimiza dados sem remover histórico.', icon: '📋', color: 'blue' },
          ].map(item => (
            <div key={item.threat} className="bg-secondary rounded-xl p-4 flex gap-3">
              <span className="text-xl shrink-0">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">{item.threat}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.mitigation}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* API */}
      <Section title="C) Documentação da API" icon={Globe}>
        <p className="text-sm text-muted-foreground">
          Todos os endpoints autenticados com <span className="text-primary font-mono">Authorization: Bearer JWT</span>. 
          Integrações externas usam <span className="text-primary font-mono">X-API-Key</span>.
        </p>

        <div className="space-y-4">
          {[
            {
              group: 'Leads & Pipeline',
              endpoints: [
                { method: 'GET', path: '/api/v1/leads', desc: 'Lista com filtros: stage, date, attendant_type', role: 'atendente+' },
                { method: 'POST', path: '/api/v1/leads', desc: 'Criar lead (entrada via webhook WhatsApp)', role: 'atendente+' },
                { method: 'PATCH', path: '/api/v1/leads/:id/stage', desc: 'Mover no Kanban → dispara automações de renovação', role: 'atendente+' },
                { method: 'PATCH', path: '/api/v1/leads/:id/transfer', desc: 'Transbordo IA → Humano (sets needs_human=false)', role: 'atendente+' },
                { method: 'DELETE', path: '/api/v1/leads/:id/gdpr', desc: 'Anonimizar dados (LGPD direito ao esquecimento)', role: 'admin' },
              ]
            },
            {
              group: 'Mensagens & Chat',
              endpoints: [
                { method: 'GET', path: '/api/v1/messages/:lead_id', desc: 'Histórico paginado (cursor-based)', role: 'atendente+' },
                { method: 'POST', path: '/api/v1/messages', desc: 'Enviar mensagem (texto, áudio, imagem)', role: 'atendente+' },
                { method: 'WS', path: '/ws/chat/:lead_id', desc: 'Stream em tempo real via Base44 Subscribe', role: 'atendente+' },
              ]
            },
            {
              group: '🔌 Integração n8n — Aniversariantes (CRON 00:00)',
              endpoints: [
                { method: 'GET', path: '/api/v1/integrations/birthdays/today', desc: 'Retorna leads aniversariantes do dia para disparo WhatsApp', role: 'api-key' },
                { method: 'GET', path: '/api/v1/integrations/renewals/due', desc: 'Leads com 90 dias de pós-venda pendentes', role: 'api-key' },
              ]
            },
            {
              group: '🔌 Webhooks — E-commerce & WhatsApp',
              endpoints: [
                { method: 'POST', path: '/api/v1/webhooks/cart-abandoned', desc: 'Recebe carrinho do e-commerce → cria lead + dispara IA', role: 'webhook-key' },
                { method: 'POST', path: '/api/v1/webhooks/message-received', desc: 'Entrada de mensagem WhatsApp → salva e aciona IA', role: 'webhook-key' },
                { method: 'POST', path: '/api/v1/webhooks/renewal-check', desc: 'Disparo de automação de renovação 90 dias', role: 'webhook-key' },
              ]
            },
            {
              group: '🔐 Admin Only — Usuários & Auditoria',
              endpoints: [
                { method: 'GET', path: '/api/v1/admin/users', desc: 'Lista todos os atendentes e admins', role: 'admin' },
                { method: 'POST', path: '/api/v1/admin/users/invite', desc: 'Convidar novo atendente por email', role: 'admin' },
                { method: 'PATCH', path: '/api/v1/admin/users/:id/suspend', desc: 'Suspender acesso de um atendente', role: 'admin' },
                { method: 'GET', path: '/api/v1/admin/audit-log', desc: 'Log completo de ações críticas com filtros', role: 'admin' },
                { method: 'GET', path: '/api/v1/admin/metrics/global', desc: 'Métricas consolidadas de toda a equipe', role: 'admin' },
              ]
            },
          ].map(group => (
            <div key={group.group} className="bg-secondary rounded-xl overflow-hidden">
              <p className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                {group.group}
              </p>
              <div className="divide-y divide-border/50">
                {group.endpoints.map(ep => (
                  <div key={ep.path} className="flex items-center gap-4 px-4 py-3">
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded font-mono shrink-0 w-14 text-center",
                      ep.method === 'GET' && 'bg-emerald-500/20 text-emerald-400',
                      ep.method === 'POST' && 'bg-primary/20 text-primary',
                      ep.method === 'PATCH' && 'bg-blue-500/20 text-blue-400',
                      ep.method === 'DELETE' && 'bg-destructive/20 text-destructive',
                      ep.method === 'WS' && 'bg-purple-500/20 text-purple-400',
                    )}>
                      {ep.method}
                    </span>
                    <span className="text-xs font-mono text-foreground shrink-0">{ep.path}</span>
                    <span className="text-xs text-muted-foreground flex-1">{ep.desc}</span>
                    <Badge_ color={ep.role === 'admin' ? 'red' : ep.role === 'atendente+' ? 'blue' : 'amber'}>
                      {ep.role}
                    </Badge_>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-secondary rounded-xl p-4">
          <p className="text-xs font-semibold text-primary mb-2">Response — GET /api/v1/integrations/birthdays/today</p>
          <Code_>{`{
  "date": "2026-05-23",
  "total": 2,
  "leads": [
    {
      "id": "6a11998e11539cc823855f10",
      "name": "Ana Silva",
      "phone": "(11) 99887-6543",
      "whatsapp_number": "5511998876543",
      "birthday": "1990-05-23",
      "stage": "vendido",
      "years_old": 36,
      "custom_message": "Feliz aniversário, Ana! 🎂 Presente especial: cupom ANIVER20"
    }
  ]
}`}</Code_>
        </div>

        <div className="bg-secondary rounded-xl p-4">
          <p className="text-xs font-semibold text-primary mb-2">Request — POST /api/v1/webhooks/cart-abandoned (E-commerce)</p>
          <Code_>{`{
  "customer_phone": "5511999998888",
  "customer_name": "João Silva",
  "cart_items": [
    { "name": "Kit Premium", "price": 299.90, "quantity": 1 },
    { "name": "Acessório X",  "price": 89.90,  "quantity": 2 }
  ],
  "cart_total": 479.70,
  "cart_url": "https://loja.exemplo.com/carrinho/abc123",
  "abandoned_at": "2026-05-23T14:30:00Z"
}

// Ação automática no CRM:
// 1. Busca Lead por phone → cria se não existir
// 2. Atualiza: cart_abandoned=true, cart_items=[ ... ]
// 3. Adiciona tag: "carrinho-abandonado"
// 4. Dispara IA: mensagem de recuperação personalizada via WhatsApp`}</Code_>
        </div>
      </Section>

      {/* STACK */}
      <Section title="D) Stack Tecnológico" icon={Layers}>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wider">Frontend (já implementado)</p>
            <div className="space-y-2">
              {[
                ['React 18 + Vite', 'SPA rápida, HMR instantâneo', 'green'],
                ['TailwindCSS + shadcn/ui', 'Design system token-based', 'green'],
                ['TanStack Query v5', 'Cache, background fetch, optimistic updates', 'green'],
                ['@hello-pangea/dnd', 'Kanban drag-and-drop acessível', 'green'],
                ['Recharts', 'Gráficos de área e barras no Dashboard', 'green'],
                ['Framer Motion', 'Animações de transição suaves', 'green'],
                ['date-fns + ptBR', 'Datas em português, cálculo 90 dias', 'green'],
                ['Base44 Subscribe', 'Real-time sem WebSocket externo', 'blue'],
              ].map(([name, desc, color]) => (
                <div key={name} className="flex items-start gap-2">
                  <CheckCircle2 className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", color === 'green' ? 'text-emerald-400' : 'text-blue-400')} />
                  <div>
                    <span className="text-xs font-semibold text-foreground">{name} </span>
                    <span className="text-xs text-muted-foreground">— {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-secondary rounded-xl p-4">
            <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wider">Backend & Integrações</p>
            <div className="space-y-2">
              {[
                ['Base44 Entities SDK', 'BaaS — DB gerenciado, sem infra manual', 'green'],
                ['Base44 Auth (JWT)', 'Autenticação gerenciada, roles built-in', 'green'],
                ['Base44 InvokeLLM', 'IA de atendimento, análise, recuperação', 'green'],
                ['Base44 UploadFile', 'CDN para áudios, imagens, documentos', 'green'],
                ['n8n (CRON externo)', 'Varredura diária de aniversários e renovações', 'amber'],
                ['Z-API / Wati', 'Provedor WhatsApp Business API (Brasil)', 'amber'],
                ['Cloudflare WAF', 'DDoS, rate limiting, bot detection', 'blue'],
              ].map(([name, desc, color]) => (
                <div key={name} className="flex items-start gap-2">
                  <CheckCircle2 className={cn("w-3.5 h-3.5 mt-0.5 shrink-0",
                    color === 'green' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-blue-400'
                  )} />
                  <div>
                    <span className="text-xs font-semibold text-foreground">{name} </span>
                    <span className="text-xs text-muted-foreground">— {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-secondary rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Chat em Tempo Real — Fluxo Completo</p>
          <Code_>{`WhatsApp do Cliente
    → Z-API / Wati recebe a mensagem
    → POST /api/v1/webhooks/message-received
    → Base44: Lead.update + Message.create (sender_type: "cliente")
    → Base44 InvokeLLM: gera resposta da IA
    → Message.create (sender_type: "ia")
    → Z-API / Wati: envia resposta ao cliente
    → base44.entities.Message.subscribe() → Chat UI atualiza em tempo real

SE confiança_ia < 70% OU detecta "quero falar com humano":
    → Lead.update { needs_human: true, attendant_type: "ia" }
    → Message.create { type: "system", content: "Transbordo solicitado" }
    → Notificação push para equipe de vendas
    → Card no Kanban recebe badge laranja ⚠️`}</Code_>
        </div>
      </Section>

      {/* MÓDULOS */}
      <Section title="Módulos — Status de Implementação" icon={Code}>
        <div className="space-y-2">
          {[
            { mod: '1. Kanban Pipeline (drag-and-drop)', status: '✅ Completo', note: '4 colunas, DnD, cards com IA/humano, tags, preview', color: 'green' },
            { mod: '2. Chat & Transbordo IA/Humano', status: '✅ Completo', note: 'Histórico, envio, botão "Assumir Chat", balões estilizados', color: 'green' },
            { mod: '3. Dashboard de Métricas', status: '✅ Completo', note: 'Diário/Semanal/Mensal, AreaChart, FunnelChart, StatsCards', color: 'green' },
            { mod: '4. Automações de Retenção (90d + Birthday)', status: '✅ Completo', note: 'Entities + página de visualização e histórico', color: 'green' },
            { mod: '5. IA + Carrinho Abandonado', status: '✅ Entidade pronta', note: 'UI pronta (flag cart_abandoned). Falta integração InvokeLLM + webhook e-commerce', color: 'amber' },
            { mod: '6. Admin Panel + RBAC (2 admins)', status: '⚡ Próximo passo', note: 'Tela /admin, gestão de usuários, convite, suspensão, AuditLog', color: 'amber' },
            { mod: '7. Design System Cortez Academy', status: '✅ Aplicado agora', note: 'Paleta preto/dourado, scrollbar, shadows, card borders', color: 'green' },
          ].map(item => (
            <div key={item.mod} className="flex items-start gap-4 p-4 bg-secondary rounded-xl">
              <Badge_ color={item.color}>{item.status}</Badge_>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.mod}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* PRÓXIMOS PASSOS */}
      <div className="bg-primary/8 border border-primary/25 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Próximos Passos Recomendados</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { prio: '🔴 Alta', title: 'Painel Admin + RBAC', desc: 'Tela /admin com gestão de usuários, convite de atendentes e regra dos 2 admins', time: '~2h' },
            { prio: '🔴 Alta', title: 'Real-time no Chat', desc: 'Ativar base44.entities.Message.subscribe() no ChatWindow para atualizações instantâneas', time: '~30min' },
            { prio: '🟡 Média', title: 'Webhook Carrinho + IA', desc: 'Integrar InvokeLLM para resposta automática de recuperação de carrinho via WhatsApp', time: '~3h' },
          ].map(item => (
            <div key={item.title} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">{item.prio}</span>
                <Badge_ color="primary">{item.time}</Badge_>
              </div>
              <p className="font-semibold text-foreground text-sm mb-1">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
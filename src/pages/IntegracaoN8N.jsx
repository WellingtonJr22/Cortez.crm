import React, { useState } from 'react';
import { Copy, CheckCircle2, Zap, ChevronDown, ChevronRight, Code2, Webhook, Users, ShoppingCart, Calendar, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const BASE_URL = window.location.origin;

// ─── Webhook endpoints exposed for n8n ───────────────────────────────────────
const WEBHOOKS = [
  {
    id: 'create_lead',
    method: 'POST',
    path: '/api/v1/webhooks/lead',
    label: '➕ Cadastrar Lead (WhatsApp → CRM)',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: Users,
    desc: 'Use este endpoint no n8n quando uma nova mensagem WhatsApp chegar. O CRM verifica se o contato já existe pelo telefone; se não existir, cria automaticamente o lead e retorna o ID.',
    body: `{
  "name": "João Silva",           // obrigatório
  "phone": "5511999998888",       // obrigatório — sem formatação
  "email": "joao@email.com",      // opcional
  "source": "whatsapp",           // whatsapp | instagram | website | facebook | indicacao | outro
  "first_message": "Olá, quero saber sobre os cursos",  // texto da 1ª mensagem
  "tags": ["novo-contato"]        // opcional
}`,
    response: `{
  "success": true,
  "lead_id": "6a11998e11539cc823855f10",
  "action": "created",   // "created" ou "existing"
  "stage": "primeiro_atendimento"
}`,
  },
  {
    id: 'message_received',
    method: 'POST',
    path: '/api/v1/webhooks/message-received',
    label: '💬 Mensagem Recebida (WhatsApp → Chat)',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    icon: Webhook,
    desc: 'Toda mensagem recebida no WhatsApp deve ser enviada aqui. O CRM salva no histórico do chat e aciona a resposta automática da IA se o lead estiver em modo IA.',
    body: `{
  "phone": "5511999998888",   // telefone do remetente
  "name": "João Silva",       // nome (do contato WA se disponível)
  "message": "Quero saber o preço",
  "message_type": "text",     // text | audio | image | document
  "file_url": "",             // URL do arquivo se não for texto
  "timestamp": "2026-05-23T14:30:00Z"
}`,
    response: `{
  "success": true,
  "lead_id": "6a11998e11539cc823855f10",
  "message_id": "msg_abc123",
  "ai_response": "Olá João! O nosso pacote completo está por R$249..."
}`,
  },
  {
    id: 'cart_abandoned',
    method: 'POST',
    path: '/api/v1/webhooks/cart-abandoned',
    label: '🛒 Carrinho Abandonado (E-commerce)',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    icon: ShoppingCart,
    desc: 'Dispare quando um cliente abandonar o carrinho na sua loja. O CRM busca o lead pelo telefone, marca cart_abandoned=true e dispara mensagem de recuperação automática pela IA.',
    body: `{
  "customer_phone": "5511999998888",
  "customer_name": "João Silva",
  "cart_items": [
    { "name": "Kit Premium", "price": 299.90 },
    { "name": "Acessório X",  "price": 89.90 }
  ],
  "cart_total": 389.80,
  "cart_url": "https://loja.cortezacademy.com.br/carrinho/abc"
}`,
    response: `{
  "success": true,
  "lead_id": "6a11998e11539cc823855f10",
  "recovery_message_sent": true
}`,
  },
  {
    id: 'birthdays',
    method: 'GET',
    path: '/api/v1/integrations/birthdays/today',
    label: '🎂 Aniversariantes de Hoje (CRON)',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
    icon: Calendar,
    desc: 'Configure um CRON no n8n para disparar às 08:00 todo dia. Este endpoint retorna todos os leads aniversariantes. Use a resposta para enviar a mensagem de parabéns via WhatsApp.',
    body: null,
    response: `{
  "date": "2026-05-23",
  "total": 2,
  "leads": [
    {
      "id": "6a11998e11539cc823855f10",
      "name": "Ana Silva",
      "phone": "5511988776655",
      "birthday": "1990-05-23",
      "stage": "vendido",
      "custom_message": "Feliz aniversário, Ana! 🎂 Temos um presente especial para você!"
    }
  ]
}`,
  },
  {
    id: 'renewals',
    method: 'GET',
    path: '/api/v1/integrations/renewals/due',
    label: '🔄 Renovações 90 dias (CRON)',
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
    icon: RefreshCw,
    desc: 'CRON diário. Retorna leads com 90 dias de pós-venda para acionamento de renovação. O n8n pode enviar a mensagem de renovação e, em seguida, chamar o endpoint de automação para marcar como enviado.',
    body: null,
    response: `{
  "total": 3,
  "leads": [
    {
      "id": "...",
      "name": "Carlos Matos",
      "phone": "5511977665544",
      "sale_date": "2026-02-23",
      "renewal_date": "2026-05-23",
      "days_since_sale": 90
    }
  ]
}`,
  },
];

const N8N_FLOWS = [
  {
    title: 'Fluxo 1 — Entrada WhatsApp → Cadastro Automático',
    steps: [
      { n: '1', label: 'Trigger: Webhook Z-API / Evolution', desc: 'Recebe evento "message.received" do provedor WhatsApp' },
      { n: '2', label: 'HTTP Request → POST /webhooks/lead', desc: 'Envia name, phone, first_message para o CRM' },
      { n: '3', label: 'IF — action === "created"?', desc: 'Novo lead: segue para resposta de boas-vindas da IA' },
      { n: '4', label: 'HTTP Request → POST /webhooks/message-received', desc: 'Salva a mensagem no histórico e obtém resposta da IA' },
      { n: '5', label: 'HTTP Request → Z-API send-text', desc: 'Envia a resposta da IA de volta para o cliente no WhatsApp' },
    ],
  },
  {
    title: 'Fluxo 2 — CRON Aniversariantes (08:00 diário)',
    steps: [
      { n: '1', label: 'Trigger: Schedule (0 8 * * *)', desc: 'Executa todo dia às 08:00' },
      { n: '2', label: 'HTTP Request → GET /integrations/birthdays/today', desc: 'Obtém lista de aniversariantes do dia' },
      { n: '3', label: 'Split in Batches', desc: 'Itera por cada lead da resposta' },
      { n: '4', label: 'HTTP Request → Z-API send-text', desc: 'Envia custom_message para o phone de cada lead' },
      { n: '5', label: 'HTTP Request → POST /automations (status: sent)', desc: 'Registra a automação como executada no CRM' },
    ],
  },
  {
    title: 'Fluxo 3 — CRON Renovações 90 dias (09:00 diário)',
    steps: [
      { n: '1', label: 'Trigger: Schedule (0 9 * * *)', desc: 'Executa todo dia às 09:00' },
      { n: '2', label: 'HTTP Request → GET /integrations/renewals/due', desc: 'Lista leads com 90 dias de pós-venda' },
      { n: '3', label: 'Split in Batches', desc: 'Processa cada lead individualmente' },
      { n: '4', label: 'HTTP Request → Z-API send-text', desc: 'Envia mensagem de renovação personalizada' },
      { n: '5', label: 'HTTP Request → POST /automations', desc: 'Marca automação renewal_90d como sent no CRM' },
    ],
  },
];

const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0">
      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
    </button>
  );
};

const EndpointCard = ({ wh }) => {
  const [open, setOpen] = useState(false);
  const fullUrl = `${BASE_URL}${wh.path}`;
  return (
    <div className={cn("bg-card border rounded-2xl overflow-hidden", open ? wh.bg : "border-border")}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 hover:bg-secondary/20 transition-colors text-left"
      >
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-card border border-border shrink-0")}>
          <wh.icon className={cn("w-5 h-5", wh.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn(
              "text-[10px] font-black px-2 py-0.5 rounded font-mono",
              wh.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 text-primary'
            )}>{wh.method}</span>
            <code className="text-xs font-mono text-foreground truncate">{wh.path}</code>
          </div>
          <p className="text-sm font-semibold text-foreground">{wh.label}</p>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border">
          <p className="text-sm text-muted-foreground pt-4">{wh.desc}</p>

          {/* Full URL */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">URL Completo</p>
            <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 border border-border">
              <code className="text-xs text-primary font-mono flex-1 break-all">{fullUrl}</code>
              <CopyBtn text={fullUrl} />
            </div>
          </div>

          {/* Request body */}
          {wh.body && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Body (JSON)</p>
              <div className="relative group">
                <pre className="bg-background border border-border rounded-xl p-4 text-xs text-foreground font-mono overflow-x-auto leading-relaxed">
                  {wh.body}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyBtn text={wh.body} />
                </div>
              </div>
            </div>
          )}

          {/* Response */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Response (200 OK)</p>
            <div className="relative group">
              <pre className="bg-background border border-border rounded-xl p-4 text-xs text-emerald-400 font-mono overflow-x-auto leading-relaxed">
                {wh.response}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyBtn text={wh.response} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function IntegracaoN8N() {
  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="relative bg-card border border-border rounded-2xl p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Integração n8n</span>
          </div>
          <h1 className="text-3xl font-black text-foreground mb-3">Automações com n8n</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Configure o n8n para ler o WhatsApp, cadastrar clientes automaticamente no CRM e disparar 
            automações de aniversário, renovação e recuperação de carrinho.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <a
              href="https://n8n.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Acessar n8n.io
            </a>
            <a
              href="https://z-api.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-secondary border border-border text-foreground px-4 py-2 rounded-xl text-sm font-medium hover:border-primary/30 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Z-API (WhatsApp)
            </a>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="bg-primary/8 border border-primary/25 rounded-2xl p-6">
        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-primary" /> Configuração Rápida
        </h2>
        <ol className="space-y-3 text-sm text-muted-foreground">
          {[
            'Instale o n8n (cloud ou self-hosted em n8n.io)',
            'Configure sua instância WhatsApp no Z-API ou Evolution API',
            'Em Configurações → WhatsApp API, salve a URL e Token do seu provedor',
            'No n8n, crie um workflow com o trigger "Webhook" e cole a URL do endpoint de entrada',
            'Copie os endpoints abaixo e monte os fluxos conforme os diagramas na seção seguinte',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Endpoints */}
      <div>
        <h2 className="font-bold text-foreground text-xl mb-4 flex items-center gap-2">
          <Code2 className="w-5 h-5 text-primary" /> Endpoints do CRM
        </h2>
        <div className="space-y-3">
          {WEBHOOKS.map(wh => <EndpointCard key={wh.id} wh={wh} />)}
        </div>
      </div>

      {/* Flows */}
      <div>
        <h2 className="font-bold text-foreground text-xl mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" /> Fluxos n8n Recomendados
        </h2>
        <div className="space-y-5">
          {N8N_FLOWS.map((flow, fi) => (
            <div key={fi} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-secondary/30">
                <h3 className="font-bold text-foreground text-sm">{flow.title}</h3>
              </div>
              <div className="p-5">
                <div className="relative">
                  {flow.steps.map((step, si) => (
                    <div key={si} className="flex gap-4 items-start mb-4 last:mb-0">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                          {step.n}
                        </div>
                        {si < flow.steps.length - 1 && (
                          <div className="w-px h-6 bg-border mt-1" />
                        )}
                      </div>
                      <div className="pt-1">
                        <p className="font-semibold text-sm text-foreground">{step.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auth note */}
      <div className="bg-card border border-border rounded-2xl p-5 text-sm text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Autenticação dos Webhooks
        </p>
        <p>Todos os endpoints de webhook devem incluir o header:</p>
        <pre className="bg-background border border-border rounded-xl px-4 py-3 text-xs font-mono text-primary">
          X-API-Key: {localStorage.getItem('wa_token') || 'SEU_TOKEN_WHATSAPP'}
        </pre>
        <p className="text-xs">Configure o mesmo token salvo em Configurações → WhatsApp API para autenticação.</p>
      </div>
    </div>
  );
}
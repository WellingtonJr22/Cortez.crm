import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Clock, Cake, ShoppingCart, Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const typeConfig = {
  renewal_90d: { label: 'Renovação 90 dias', icon: Clock, color: 'text-primary bg-primary/10' },
  birthday: { label: 'Aniversário', icon: Cake, color: 'text-purple-400 bg-purple-400/10' },
  cart_recovery: { label: 'Recuperar Carrinho', icon: ShoppingCart, color: 'text-orange-400 bg-orange-400/10' },
  follow_up: { label: 'Follow-up', icon: Zap, color: 'text-blue-400 bg-blue-400/10' },
};

const statusConfig = {
  pending: { label: 'Pendente', icon: Loader2, color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  sent: { label: 'Enviado', icon: CheckCircle2, color: 'bg-primary/15 text-primary border-primary/20' },
  completed: { label: 'Concluído', icon: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  failed: { label: 'Falhou', icon: AlertCircle, color: 'bg-destructive/15 text-destructive border-destructive/20' },
};

export default function Automacoes() {
  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: () => base44.entities.Automation.list('-created_date'),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
  });

  const leadsMap = {};
  leads.forEach(l => { leadsMap[l.id] = l; });

  // Show pending renewals from leads
  const renewalLeads = leads.filter(l => l.renewal_date && l.stage === 'vendido');

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div>
        <h1 className="text-xl font-bold text-foreground">Automações</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Gatilhos de pós-venda, aniversários e recuperação</p>
      </div>

      {/* Info cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Regra de 90 Dias</p>
              <p className="text-[11px] text-muted-foreground">Renovação automática</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ao mover para "Vendido", grava a data. Após 90 dias, dispara mensagem de renovação.
          </p>
          <div className="mt-3 text-xs text-primary font-medium">
            {renewalLeads.length} leads com renovação programada
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-400/10 flex items-center justify-center">
              <Cake className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Aniversariantes</p>
              <p className="text-[11px] text-muted-foreground">Via API para n8n</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Varredura diária via API. O n8n consulta os aniversariantes e envia cupons personalizados.
          </p>
          <div className="mt-3 text-xs text-purple-400 font-medium">
            {leads.filter(l => l.birthday).length} leads com aniversário cadastrado
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Carrinho Abandonado</p>
              <p className="text-[11px] text-muted-foreground">IA de recuperação</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            IA monitora carrinhos abandonados e faz follow-up automático pelo WhatsApp.
          </p>
          <div className="mt-3 text-xs text-orange-400 font-medium">
            {leads.filter(l => l.cart_abandoned).length} carrinhos pendentes
          </div>
        </div>
      </div>

      {/* Automations list */}
      <div className="bg-card border border-border rounded-2xl">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">Histórico de Automações</h3>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : automations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhuma automação registrada ainda. As automações serão criadas automaticamente conforme os leads avançam no funil.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {automations.map((auto) => {
              const type = typeConfig[auto.type] || typeConfig.follow_up;
              const status = statusConfig[auto.status] || statusConfig.pending;
              const lead = leadsMap[auto.lead_id];
              const TypeIcon = type.icon;
              const StatusIcon = status.icon;

              return (
                <div key={auto.id} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", type.color)}>
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{type.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead?.name || 'Lead removido'} 
                        {auto.trigger_date && ` • ${format(new Date(auto.trigger_date), 'dd/MM/yyyy')}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] h-5", status.color)}>
                    <StatusIcon className={cn("w-3 h-3 mr-1", auto.status === 'pending' && 'animate-spin')} />
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
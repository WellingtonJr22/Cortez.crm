import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, ShoppingCart, TrendingUp, XCircle, Bot, ArrowRightLeft, DollarSign } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatsCard from '@/components/dashboard/StatsCard';
import FunnelChart from '@/components/dashboard/FunnelChart';
import RevenuePanel from '@/components/dashboard/RevenuePanel';
import { format, subDays, subWeeks, subMonths, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [period, setPeriod] = useState('semanal');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
  });

  const { data: automations = [] } = useQuery({
    queryKey: ['automations'],
    queryFn: () => base44.entities.Automation.list('-created_date'),
  });

  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === 'diario') return startOfDay(now);
    if (period === 'semanal') return subWeeks(now, 1);
    return subMonths(now, 1);
  }, [period]);

  const filteredLeads = leads.filter(l =>
    l.created_date && isAfter(new Date(l.created_date), periodStart)
  );

  const stats = useMemo(() => {
    const vendidos = filteredLeads.filter(l => l.stage === 'vendido_ia' || l.stage === 'vendido_atendente');
    const perdas = filteredLeads.filter(l => l.stage === 'perda');
    const totalReceita = vendidos.reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
    const ticketMedio = vendidos.length > 0 ? totalReceita / vendidos.length : 0;
    return {
      total: filteredLeads.length,
      vendidos: vendidos.length,
      perdas: perdas.length,
      emAtendimento: filteredLeads.filter(l => l.stage === 'atendendo').length,
      atendimentoIA: filteredLeads.filter(l => l.stage === 'atendimento_ia').length,
      totalReceita,
      ticketMedio,
      vendidosLeads: vendidos,
    };
  }, [filteredLeads]);

  const chartData = useMemo(() => {
    const days = period === 'diario' ? 1 : period === 'semanal' ? 7 : 30;
    return Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - 1 - i);
      const dayStr = format(date, 'yyyy-MM-dd');
      const dayLeads = leads.filter(l => l.created_date?.startsWith(dayStr));
      return {
        name: format(date, days <= 7 ? 'EEE' : 'dd/MM', { locale: ptBR }),
        leads: dayLeads.length,
        vendas: dayLeads.filter(l => l.stage === 'vendido_ia' || l.stage === 'vendido_atendente').length,
        perdas: dayLeads.filter(l => l.stage === 'perda').length,
      };
    });
  }, [leads, period]);

  const conversionRate = stats.total > 0 ? ((stats.vendidos / stats.total) * 100).toFixed(1) : '0';

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Visão 360 do seu negócio</p>
        </div>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="diario">Diário</TabsTrigger>
            <TabsTrigger value="semanal">Semanal</TabsTrigger>
            <TabsTrigger value="mensal">Mensal</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatsCard title="Total de Leads" value={stats.total} icon={Users} />
            <StatsCard title="Vendidos" value={stats.vendidos} icon={ShoppingCart} trend={stats.total > 0 ? `${conversionRate}% conv.` : null} trendUp={stats.vendidos > 0} />
            <StatsCard title="Perdas" value={stats.perdas} icon={XCircle} trend={stats.total > 0 ? `${((stats.perdas / stats.total) * 100).toFixed(1)}%` : null} trendUp={false} />
            <StatsCard title="Taxa de Conversão" value={`${conversionRate}%`} icon={TrendingUp} trendUp={parseFloat(conversionRate) > 30} />
            <StatsCard title="Atend. por IA" value={stats.atendimentoIA} icon={Bot} />
          </div>

          {/* Revenue Panel */}
          <RevenuePanel leads={filteredLeads} stats={stats} />

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-foreground">Fluxo de Leads</h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary inline-block rounded" />Leads</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />Vendidos</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-destructive inline-block rounded" />Perdas</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(43,72%,47%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(43,72%,47%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(155,65%,50%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(155,65%,50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPerdas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0,65%,48%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(0,65%,48%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,16%)" />
                  <XAxis dataKey="name" stroke="hsl(0,0%,45%)" fontSize={12} />
                  <YAxis stroke="hsl(0,0%,45%)" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(0,0%,8%)',
                      border: '1px solid hsl(0,0%,16%)',
                      borderRadius: '12px',
                      color: 'hsl(45,20%,94%)',
                    }}
                    formatter={(value, name) => {
                      const labels = { leads: 'Leads', vendas: 'Vendidos', perdas: 'Perdas' };
                      return [value, labels[name] || name];
                    }}
                  />
                  <Area type="monotone" dataKey="leads" stroke="hsl(43,72%,47%)" fill="url(#colorLeads)" strokeWidth={2} name="leads" />
                  <Area type="monotone" dataKey="vendas" stroke="hsl(155,65%,50%)" fill="url(#colorVendas)" strokeWidth={2} name="vendas" />
                  <Area type="monotone" dataKey="perdas" stroke="hsl(0,65%,48%)" fill="url(#colorPerdas)" strokeWidth={2} name="perdas" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <FunnelChart leads={leads} />
          </div>

          {/* Recent leads */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Leads Recentes</h3>
            <div className="space-y-3">
              {filteredLeads.slice(0, 8).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                      {lead.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.source || 'whatsapp'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-muted-foreground capitalize">{lead.stage?.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
              {filteredLeads.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">Nenhum lead no período</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
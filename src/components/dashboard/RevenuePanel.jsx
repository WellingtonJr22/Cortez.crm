import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Percent } from 'lucide-react';

const fmt = (val) =>
  Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const stages = [
  { key: 'atendimento_ia', label: 'Atend. IA' },
  { key: 'atendendo', label: 'Atendendo' },
  { key: 'vendido_ia', label: 'Vendido IA' },
  { key: 'vendido_atendente', label: 'Vendido Atend.' },
  { key: 'perda', label: 'Perda' },
];

export default function RevenuePanel({ leads, stats }) {
  const [custo, setCusto] = useState('');

  const custoNum = parseFloat(custo) || 0;
  const lucro = stats.totalReceita - custoNum;
  const margem = stats.totalReceita > 0 ? (lucro / stats.totalReceita) * 100 : 0;

  const byStage = stages.map(s => ({
    ...s,
    leads: leads.filter(l => l.stage === s.key),
    total: leads.filter(l => l.stage === s.key).reduce((sum, l) => sum + (Number(l.sale_value) || 0), 0),
  })).filter(s => s.leads.length > 0);

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Receita total */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <DollarSign className="w-3.5 h-3.5" />
          Receita Total (vendidos)
        </div>
        <p className="text-2xl font-bold text-emerald-400">{fmt(stats.totalReceita)}</p>
        <p className="text-xs text-muted-foreground">{stats.vendidos} venda(s) • ticket médio {fmt(stats.ticketMedio)}</p>
      </div>

      {/* Margem / Lucro */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <Percent className="w-3.5 h-3.5" />
          Margem de Lucro
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${margem >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
            {margem.toFixed(1)}%
          </span>
          {margem >= 0
            ? <TrendingUp className="w-4 h-4 text-emerald-400" />
            : <TrendingDown className="w-4 h-4 text-destructive" />
          }
        </div>
        <p className={`text-sm font-semibold ${lucro >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
          {lucro >= 0 ? 'Lucro: ' : 'Prejuízo: '}{fmt(Math.abs(lucro))}
        </p>
        <div className="mt-auto pt-2 border-t border-border/50">
          <label className="text-[10px] text-muted-foreground block mb-1">Custo total (R$)</label>
          <input
            type="number"
            value={custo}
            onChange={e => setCusto(e.target.value)}
            placeholder="Ex: 500"
            className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {/* Valor por etapa */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-xs text-muted-foreground mb-3">Valor por Etapa</p>
        {byStage.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum valor registrado</p>
        )}
        <div className="space-y-2.5">
          {byStage.map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">{s.label}</p>
                <p className="text-[10px] text-muted-foreground">{s.leads.length} lead(s)</p>
              </div>
              <span className={`text-xs font-semibold ${s.total > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                {s.total > 0 ? fmt(s.total) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
import React from 'react';

const stages = [
  { key: 'atendimento_ia', label: 'Atend. por IA', color: 'hsl(43,72%,47%)' },
  { key: 'atendendo', label: 'Atendendo', color: 'hsl(210,80%,60%)' },
  { key: 'vendido_ia', label: 'Vendido por IA', color: 'hsl(155,65%,50%)' },
  { key: 'vendido_atendente', label: 'Vendido Atend.', color: 'hsl(155,50%,38%)' },
  { key: 'perda', label: 'Perda', color: 'hsl(0,65%,48%)' },
];

export default function FunnelChart({ leads }) {
  const counts = stages.map(s => ({
    ...s,
    count: leads.filter(l => l.stage === s.key).length,
  }));
  const max = Math.max(...counts.map(c => c.count), 1);
  const total = counts.reduce((s, c) => s + c.count, 0);

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="font-semibold text-foreground mb-6">Funil de Conversão</h3>
      <div className="space-y-3">
        {counts.map((stage) => {
          const pct = total > 0 ? ((stage.count / total) * 100).toFixed(0) : 0;
          return (
            <div key={stage.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{stage.count}</span>
                  <span className="text-[10px] text-muted-foreground">{pct}%</span>
                </div>
              </div>
              <div className="w-full h-6 bg-secondary rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-700"
                  style={{
                    width: `${Math.max((stage.count / max) * 100, stage.count > 0 ? 8 : 0)}%`,
                    backgroundColor: stage.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-border flex justify-between text-xs">
        <span className="text-muted-foreground">Total de leads</span>
        <span className="font-bold text-foreground">{leads.length}</span>
      </div>
    </div>
  );
}       
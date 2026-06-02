import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_STYLES = {
  processando: 'bg-amber-500 text-white',
  pausado_limite: 'bg-orange-500 text-white',
  concluido: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  erro: 'bg-destructive/20 text-destructive border border-destructive/30',
};

const STATUS_LABELS = {
  processando: '⏳ Processando',
  pausado_limite: '⏸ Pausado (Limite)',
  concluido: '✅ Concluído',
  erro: '❌ Erro',
};

export default function HistoricoCampanhas() {
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  // Load from localStorage (set by NovaCampanha after dispatch)
  const [campaigns] = useState(() => {
    try { return JSON.parse(localStorage.getItem('campaign_history') || '[]'); } catch { return []; }
  });

  const filtered = campaigns.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleDelete = (id) => {
    const updated = campaigns.filter(c => c.id !== id);
    localStorage.setItem('campaign_history', JSON.stringify(updated));
    window.location.reload();
  };

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nome..."
          className="pl-9 bg-secondary border-border"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/20">
              {['NOME', 'DATA', 'CONEXÃO', 'PROGRESSO', 'STATUS', 'AÇÕES'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                  Nenhuma campanha encontrada
                </td>
              </tr>
            )}
            {paginated.map(c => (
              <tr key={c.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-5 py-4 font-medium text-foreground">{c.name}</td>
                <td className="px-5 py-4 text-muted-foreground text-xs">
                  {c.date ? format(new Date(c.date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                </td>
                <td className="px-5 py-4 text-xs text-muted-foreground">{c.connection || '-'}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-red-500"
                        style={{ width: `${c.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{c.progress || 0}%</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", STATUS_STYLES[c.status] || STATUS_STYLES.concluido)}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <button onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-end gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Por página:</span>
            <div className="relative">
              <select
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground appearance-none pr-7 focus:outline-none"
              >
                {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>
          </div>
          <span>{(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} de {total}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
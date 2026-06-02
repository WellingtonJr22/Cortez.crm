import React from 'react';
import { Clock, Calendar } from 'lucide-react';

export default function Agendamentos() {
  return (
    <div className="bg-card border border-dashed border-border rounded-2xl py-20 flex flex-col items-center gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Clock className="w-7 h-7 text-primary" />
      </div>
      <p className="font-semibold text-foreground">Agendamentos em breve</p>
      <p className="text-sm text-muted-foreground max-w-sm">
        Configure disparos automáticos para datas futuras com base em eventos do funil de vendas.
      </p>
    </div>
  );
}   
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NovaCampanha from '@/components/disparos/NovaCampanha';
import HistoricoCampanhas from '@/components/disparos/HistoricoCampanhas';
import Agendamentos from '@/components/disparos/Agendamentos';
import Conexoes from '@/components/disparos/Conexoes';
import { Send, History, Clock, Wifi } from 'lucide-react';

export default function Disparos() {
  const [activeTab, setActiveTab] = useState('nova');

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-foreground">Campanhas & Disparos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Envie mensagens em massa via Meta Cloud API (WhatsApp Business) sem risco de banimento
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border h-auto p-1 mb-6 gap-1">
          <TabsTrigger value="nova" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2">
            <Send className="w-4 h-4" /> Nova Campanha
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2">
            <History className="w-4 h-4" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="agendamentos" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2">
            <Clock className="w-4 h-4" /> Agendamentos
          </TabsTrigger>
          <TabsTrigger value="conexoes" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2">
            <Wifi className="w-4 h-4" /> Conexões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nova"><NovaCampanha /></TabsContent>
        <TabsContent value="historico"><HistoricoCampanhas /></TabsContent>
        <TabsContent value="agendamentos"><Agendamentos /></TabsContent>
        <TabsContent value="conexoes"><Conexoes /></TabsContent>
      </Tabs>
    </div>
  );
}
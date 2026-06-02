import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send, Filter, CheckSquare, Square, Zap,
  MessageSquare, Calendar, ShoppingCart, RefreshCw,
  AlertTriangle, CheckCircle2, Image, X, Upload, Link2, Cloud
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TEMPLATES = [
  { id: 'follow_up', label: '👋 Follow-up Geral', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', message: 'Olá {nome}! Tudo bem? Estou passando para saber se você ainda tem interesse em nossos cursos da Cortez Academy. Posso te ajudar com alguma dúvida? 😊' },
  { id: 'birthday', label: '🎂 Aniversário', icon: Calendar, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20', message: 'Feliz aniversário, {nome}! 🎉🎂 A toda a equipe Cortez Academy deseja um dia incrível cheio de conquistas. Como presente especial, temos uma surpresa reservada para você. Entre em contato!' },
  { id: 'renewal_90d', label: '🔄 Renovação 90 dias', icon: RefreshCw, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', message: 'Oi {nome}! Já faz 90 dias desde que você transformou seu salão com o nosso método 🚀 Seus resultados merecem um upgrade! Confira as novidades que separamos especialmente para você.' },
  { id: 'cart_recovery', label: '🛒 Recuperação de Carrinho', icon: ShoppingCart, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', message: 'Ei {nome}! Vi que você demonstrou interesse em nossos cursos mas não finalizou. Separei um desconto exclusivo de 15% para você usar ainda hoje! Não perde essa oportunidade 🎯' },
  { id: 'promo', label: '🏷️ Promoção', icon: Zap, color: 'text-primary', bg: 'bg-primary/10 border-primary/20', message: 'Olá {nome}! Temos uma oferta especial por tempo limitado 🔥 Aproveite nosso pacote completo Cortez Academy com condições exclusivas. Responda agora para garantir o seu!' },
];

const stageLabel = { primeiro_atendimento: 'Primeiro Atendimento', apresentacao: 'Apresentação', vendido: 'Vendido', perda: 'Perda' };

export default function NovaCampanha() {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [customMessage, setCustomMessage] = useState(TEMPLATES[0].message);
  const [filterStage, setFilterStage] = useState('all');
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageInputType, setImageInputType] = useState('upload');
  const [externalImageUrl, setExternalImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [useMetaApi, setUseMetaApi] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [selectedWaConn, setSelectedWaConn] = useState(() => {
    const conns = (() => { try { return JSON.parse(localStorage.getItem('wa_connections') || '[]'); } catch { return []; } })();
    return String(conns.find(c => c.is_default)?.id || conns[0]?.id || '');
  });
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const metaConnections = (() => { try { return JSON.parse(localStorage.getItem('meta_connections') || '[]'); } catch { return []; } })();
  const waConnections = (() => { try { return JSON.parse(localStorage.getItem('wa_connections') || '[]'); } catch { return []; } })();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-updated_date'),
  });

  const createAutomation = useMutation({ mutationFn: (d) => base44.entities.Automation.create(d) });

  const filteredLeads = leads.filter(l => (filterStage === 'all' ? !!l.phone : l.stage === filterStage && !!l.phone));
  const allSelected = filteredLeads.length > 0 && filteredLeads.every(l => selectedLeads.has(l.id));

  const toggleAll = () => setSelectedLeads(allSelected ? new Set() : new Set(filteredLeads.map(l => l.id)));
  const toggleLead = (id) => { const n = new Set(selectedLeads); n.has(id) ? n.delete(id) : n.add(id); setSelectedLeads(n); };
  const handleTemplateSelect = (tpl) => { setSelectedTemplate(tpl); setCustomMessage(tpl.message); };

  const handleImageFile = async (file) => {
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploadingImage(false);
    toast.success('Imagem enviada!');
  };

  const clearImage = () => { setImagePreview(null); setImageUrl(''); setExternalImageUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const getFinalImageUrl = () => imageInputType === 'url' ? externalImageUrl.trim() : imageUrl;

  const sendViaMetaApi = async (conn, phone, message, imageUrl) => {
    const baseUrl = 'https://graph.facebook.com/v19.0';
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${conn.token}` };
    if (imageUrl) {
      await fetch(`${baseUrl}/${conn.phone_id}/messages`, {
        method: 'POST', headers,
        body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'image', image: { link: imageUrl, caption: message } }),
      });
    } else {
      await fetch(`${baseUrl}/${conn.phone_id}/messages`, {
        method: 'POST', headers,
        body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: message } }),
      });
    }
  };

  const handleDispatch = async () => {
    if (selectedLeads.size === 0) { toast.error('Selecione ao menos um lead.'); return; }
    if (!customMessage.trim()) { toast.error('A mensagem não pode estar vazia.'); return; }
    if (useMetaApi && !selectedConnection) { toast.error('Selecione uma conexão Meta Cloud API.'); return; }

    const finalImageUrl = getFinalImageUrl();
    setSending(true);
    const conn = useMetaApi ? metaConnections.find(c => String(c.id) === selectedConnection) : null;
    const waApiUrl = !useMetaApi ? localStorage.getItem('wa_api_url') : null;
    const waToken = !useMetaApi ? localStorage.getItem('wa_token') : null;
    const selectedArr = leads.filter(l => selectedLeads.has(l.id));
    let count = 0; const errors = [];

    for (const lead of selectedArr) {
      const msg = customMessage.replace(/{nome}/gi, lead.name?.split(' ')[0] || 'cliente');
      const hasImage = !!finalImageUrl;
      await createAutomation.mutateAsync({ lead_id: lead.id, type: selectedTemplate.id, status: 'sent', trigger_date: new Date().toISOString().split('T')[0], message_content: msg, notes: `Disparo${useMetaApi ? ' Meta API' : ''} — ${selectedTemplate.label}` });
      await base44.entities.Message.create({ lead_id: lead.id, sender_type: 'humano', sender_name: 'Disparo em Massa', content: msg, message_type: hasImage ? 'image' : 'text', file_url: hasImage ? finalImageUrl : undefined });
      await base44.entities.Lead.update(lead.id, { last_message_preview: hasImage ? `📷 ${msg}` : msg });

      if (lead.phone) {
        const phone = lead.phone.replace(/\D/g, '');
        try {
          if (useMetaApi && conn) {
            await sendViaMetaApi(conn, phone, msg, finalImageUrl);
          } else {
            const waConn = waConnections.find(c => String(c.id) === selectedWaConn) || waConnections.find(c => c.is_default) || waConnections[0];
            if (waConn?.api_url && waConn?.token) {
              await fetch(hasImage ? `${waConn.api_url}/send-image` : `${waConn.api_url}/send-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Client-Token': waConn.token },
                body: JSON.stringify(hasImage ? { phone, image: finalImageUrl, caption: msg } : { phone, message: msg }),
              });
            }
          }
        } catch { errors.push(lead.name); }
      }
      count++;
    }

    // Save to history
    const history = (() => { try { return JSON.parse(localStorage.getItem('campaign_history') || '[]'); } catch { return []; } })();
    history.unshift({ id: Date.now(), name: `Template: ${selectedTemplate.id} - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, date: new Date().toISOString(), connection: conn?.name || '-', progress: 100, status: errors.length > 0 ? 'pausado_limite' : 'concluido', count, errors: errors.length });
    localStorage.setItem('campaign_history', JSON.stringify(history.slice(0, 50)));

    setSending(false);
    setSelectedLeads(new Set());
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    errors.length > 0 ? toast.warning(`${count} salvas. ${errors.length} falhas.`) : toast.success(`${count} mensagem(ns) disparada(s)!`);
  };

  const waConnected = waConnections.length > 0;
  const finalImageUrl = getFinalImageUrl();

  return (
    <div className="grid xl:grid-cols-[1fr_420px] gap-6">
      {/* LEFT */}
      <div className="space-y-5">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground flex items-center gap-2"><Filter className="w-4 h-4 text-primary" /> Destinatários</h2>
            <span className="text-xs text-muted-foreground">{selectedLeads.size} de {filteredLeads.length}</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {['all', 'primeiro_atendimento', 'apresentacao', 'vendido', 'perda'].map(s => (
              <button key={s} onClick={() => { setFilterStage(s); setSelectedLeads(new Set()); }}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", filterStage === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>
                {s === 'all' ? 'Todos' : stageLabel[s]} ({s === 'all' ? leads.filter(l => l.phone).length : leads.filter(l => l.stage === s && l.phone).length})
              </button>
            ))}
          </div>
          <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
            {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
            {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {filteredLeads.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm"><AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />Nenhum lead com telefone</div>}
            {filteredLeads.map(lead => {
              const checked = selectedLeads.has(lead.id);
              return (
                <button key={lead.id} onClick={() => toggleLead(lead.id)}
                  className={cn("w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left", checked ? "bg-primary/8 border-primary/30" : "bg-secondary border-border hover:border-border/60")}>
                  {checked ? <CheckSquare className="w-4 h-4 text-primary shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">{lead.name?.charAt(0)?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-foreground truncate">{lead.name}</p><p className="text-xs text-muted-foreground">{lead.phone}</p></div>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0", lead.stage === 'vendido' ? 'bg-emerald-500/15 text-emerald-400' : lead.stage === 'perda' ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-muted-foreground')}>{stageLabel[lead.stage]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="space-y-5">
        {/* Templates */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Template</h2>
          <div className="space-y-2 mb-4">
            {TEMPLATES.map(tpl => (
              <button key={tpl.id} onClick={() => handleTemplateSelect(tpl)}
                className={cn("w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left", selectedTemplate.id === tpl.id ? tpl.bg : "bg-secondary border-border hover:border-border/60")}>
                <tpl.icon className={cn("w-4 h-4 shrink-0", tpl.color)} />
                <span className="text-sm font-medium text-foreground">{tpl.label}</span>
                {selectedTemplate.id === tpl.id && <CheckCircle2 className="w-4 h-4 text-primary ml-auto shrink-0" />}
              </button>
            ))}
          </div>
          <Textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="Digite sua mensagem..." className="bg-secondary border-border min-h-[100px] text-sm resize-none" />
        </div>

        {/* Image */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-foreground mb-3 flex items-center gap-2"><Image className="w-4 h-4 text-primary" /> Imagem (opcional)</h2>
          <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-4 w-fit">
            {[{ id: 'upload', label: '📁 Upload' }, { id: 'url', label: '🔗 URL' }].map(t => (
              <button key={t.id} onClick={() => { setImageInputType(t.id); clearImage(); }}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", imageInputType === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {t.label}
              </button>
            ))}
          </div>
          {imageInputType === 'upload' ? (
            !imagePreview ? (
              <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-xl py-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all">
                <Upload className="w-6 h-6" /><span className="text-sm">Clique para selecionar</span>
              </button>
            ) : (
              <div className="relative">
                <img src={imagePreview} alt="preview" className="w-full rounded-xl object-cover max-h-40 border border-border" />
                <button onClick={clearImage} className="absolute top-2 right-2 w-7 h-7 bg-background/80 border border-border rounded-full flex items-center justify-center hover:bg-destructive/20"><X className="w-3.5 h-3.5" /></button>
                {uploadingImage && <div className="absolute inset-0 bg-background/60 rounded-xl flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-primary" /></div>}
                {imageUrl && !uploadingImage && <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Pronta</p>}
              </div>
            )
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-secondary rounded-xl border border-border px-3 py-2">
                <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <input type="url" value={externalImageUrl} onChange={e => setExternalImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" className="bg-transparent text-sm text-foreground flex-1 outline-none placeholder:text-muted-foreground" />
                {externalImageUrl && <button onClick={clearImage}><X className="w-4 h-4 text-muted-foreground" /></button>}
              </div>
              {externalImageUrl && <img src={externalImageUrl} alt="preview" className="w-full rounded-xl object-cover max-h-32 border border-border" />}
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageFile(e.target.files?.[0])} />
        </div>

        {/* Send Channel */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-foreground flex items-center gap-2"><Cloud className="w-4 h-4 text-primary" /> Canal de Envio</h2>

          <div className="flex gap-2">
            {[
              { id: false, label: '⚡ API Z-API / Evolution', active: waConnected },
              { id: true, label: '☁️ Meta Cloud API (Oficial)', active: metaConnections.length > 0 },
            ].map(opt => (
              <button key={String(opt.id)} onClick={() => setUseMetaApi(opt.id)}
                className={cn("flex-1 text-xs py-2.5 px-3 rounded-xl border transition-all font-medium",
                  useMetaApi === opt.id ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground")}>
                {opt.label}
                {!opt.active && <span className="block text-[10px] text-amber-400 mt-0.5">não configurado</span>}
              </button>
            ))}
          </div>

          {!useMetaApi && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Instância WhatsApp</label>
              <select value={selectedWaConn} onChange={e => setSelectedWaConn(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50">
                <option value="">Selecione uma instância...</option>
                {waConnections.map(c => <option key={c.id} value={String(c.id)}>{c.name}{c.is_default ? ' ★' : ''} — {c.phone || c.api_url}</option>)}
              </select>
              {waConnections.length === 0 && (
                <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Configure WhatsApp em Configurações</p>
              )}
            </div>
          )}
          {useMetaApi && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Conexão Meta Cloud API</label>
              <select value={selectedConnection} onChange={e => setSelectedConnection(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50">
                <option value="">Selecione uma conexão...</option>
                {metaConnections.map(c => <option key={c.id} value={String(c.id)}>{c.name} — {c.phone || c.phone_id}</option>)}
              </select>
              {metaConnections.length === 0 && (
                <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Adicione uma conexão na aba Conexões</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-sm border-t border-border pt-4">
            <span className="text-muted-foreground">Tipo de envio</span>
            <span className="font-medium text-foreground text-xs flex items-center gap-1.5">
              {finalImageUrl ? <><Image className="w-3.5 h-3.5 text-primary" /> Imagem + Texto</> : <><MessageSquare className="w-3.5 h-3.5 text-blue-400" /> Texto</>}
            </span>
          </div>

          {selectedLeads.size === 0 && <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Selecione pelo menos um lead</div>}

          <Button onClick={handleDispatch} disabled={sending || selectedLeads.size === 0 || uploadingImage} className="w-full bg-primary text-primary-foreground font-bold h-11">
            {sending ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4 mr-2" /> Disparar para {selectedLeads.size} lead(s)</>}
          </Button>
        </div>
      </div>
    </div>
  );
}   
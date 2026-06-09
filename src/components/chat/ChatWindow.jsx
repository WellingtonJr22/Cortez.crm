import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, User, Paperclip, ArrowRightLeft, Phone, MoreVertical, ExternalLink, CheckCheck, Mic, MicOff, Image, FileVideo, X, Play, Pause, Users, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const senderColors = {
  cliente: 'bg-secondary',
  ia: 'bg-primary/15 border border-primary/20',
  humano: 'bg-blue-500/15 border border-blue-500/20',
};

const roleLabel = { admin: 'Administrador', atendente: 'Atendente' };

export default function ChatWindow({ lead, currentUser, teamMembers = [], onTransfer, onForward, onResolve }) {
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [pendingFile, setPendingFile] = useState(null); // { file, previewUrl, type }
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', lead?.id],
    queryFn: () => base44.entities.Message.filter({ lead_id: lead.id }, 'created_date'),
    enabled: !!lead?.id,
  });

  const sendMutation = useMutation({
    mutationFn: (msg) => base44.entities.Message.create(msg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', lead?.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (pendingFile) {
      await sendFile();
      return;
    }
    if (!newMessage.trim()) return;
    sendMutation.mutate({
      lead_id: lead.id,
      content: newMessage,
      sender_type: 'humano',
      sender_name: 'Atendente',
      message_type: 'text',
    });
    base44.entities.Lead.update(lead.id, { last_message_preview: newMessage });
    setNewMessage('');
  };

  const sendFile = async () => {
    if (!pendingFile) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pendingFile.file });
    const isAudio = pendingFile.type === 'audio';
    const isVideo = pendingFile.type === 'video';
    const msgType = isAudio ? 'audio' : isVideo ? 'document' : 'image';
    sendMutation.mutate({
      lead_id: lead.id,
      content: isAudio ? '🎙️ Áudio' : isVideo ? '🎥 Vídeo' : '🖼️ Imagem',
      sender_type: 'humano',
      sender_name: 'Atendente',
      message_type: msgType,
      file_url,
    });
    base44.entities.Lead.update(lead.id, { last_message_preview: isAudio ? '🎙️ Áudio' : isVideo ? '🎥 Vídeo' : '🖼️ Imagem' });
    setPendingFile(null);
    setUploading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const previewUrl = URL.createObjectURL(file);
    setPendingFile({ file, previewUrl, type: isVideo ? 'video' : isAudio ? 'audio' : 'image' });
    e.target.value = '';
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    audioChunksRef.current = [];
    recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], 'audio.webm', { type: 'audio/webm' });
      setPendingFile({ file, previewUrl: URL.createObjectURL(blob), type: 'audio' });
      stream.getTracks().forEach(t => t.stop());
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(recordingTimerRef.current);
  };

  const cancelFile = () => {
    setPendingFile(null);
    if (isRecording) stopRecording();
  };

  // Membros que podem receber a conversa: admins e atendentes ativos, exceto você mesmo.
  const forwardTargets = teamMembers.filter(
    m => m.status !== 'suspended' && m.status !== 'invited' && m.email !== currentUser?.email
  );

  const handleForward = (member) => {
    onForward?.(lead, member);
    // Registra a transferência como uma nota visível na conversa.
    sendMutation.mutate({
      lead_id: lead.id,
      content: `🔄 Conversa encaminhada para ${member.full_name || member.email}${member.role ? ` (${roleLabel[member.role] || member.role})` : ''}`,
      sender_type: 'humano',
      sender_name: currentUser?.full_name || 'Sistema',
      message_type: 'text',
    });
  };

  if (!lead) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Selecione uma conversa para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold">
            {lead.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{lead.name}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn(
                "text-[10px] h-4 px-1.5",
                lead.attendant_type === 'ia' ? 'border-primary/30 text-primary' : 'border-blue-400/30 text-blue-400'
              )}>
                {lead.attendant_type === 'ia' ? 'IA' : lead.attendant_name || 'Humano'}
              </Badge>
              {lead.phone && <span className="text-xs text-muted-foreground">{lead.phone}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lead.attendant_type === 'ia' && !lead.resolved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTransfer(lead)}
              className="text-xs border-primary/30 text-primary hover:bg-primary/10"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
              Assumir Chat
            </Button>
          )}
          {!lead.resolved && forwardTargets.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-blue-400/30 text-blue-400 hover:bg-blue-500/10"
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Encaminhar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Encaminhar para
                </div>
                <DropdownMenuSeparator />
                {forwardTargets.map(member => (
                  <DropdownMenuItem
                    key={member.id}
                    onClick={() => handleForward(member)}
                    className="gap-2"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {(member.full_name || member.email)?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate flex items-center gap-1">
                        {member.role === 'admin' && <Crown className="w-3 h-3 text-primary shrink-0" />}
                        {member.full_name || member.email}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {roleLabel[member.role] || 'Atendente'}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!lead.resolved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResolve(lead)}
              className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
              Finalizar
            </Button>
          )}
          {lead.resolved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCheck className="w-3.5 h-3.5" /> Resolvido
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Phone className="w-4 h-4 mr-2" /> Ligar
              </DropdownMenuItem>
              {lead.phone && (
                <DropdownMenuItem asChild>
                  <a
                    href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2 text-emerald-400" />
                    Abrir no WhatsApp
                  </a>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={cn(
            "flex",
            msg.sender_type === 'cliente' ? 'justify-start' : 'justify-end'
          )}>
            <div className={cn(
              "max-w-[70%] rounded-2xl px-4 py-2.5",
              senderColors[msg.sender_type]
            )}>
              <div className="flex items-center gap-1.5 mb-1">
                {msg.sender_type === 'ia' && <Bot className="w-3 h-3 text-primary" />}
                {msg.sender_type === 'humano' && <User className="w-3 h-3 text-blue-400" />}
                <span className="text-[10px] font-medium text-muted-foreground">
                  {msg.sender_type === 'cliente' ? lead.name : msg.sender_type === 'ia' ? 'IA' : msg.sender_name}
                </span>
              </div>
              {msg.message_type === 'image' && msg.file_url ? (
                <img src={msg.file_url} alt="imagem" className="max-w-[220px] rounded-xl mb-1" />
              ) : msg.message_type === 'audio' && msg.file_url ? (
                <audio controls src={msg.file_url} className="max-w-[220px] mb-1" />
              ) : msg.message_type === 'document' && msg.file_url ? (
                <video controls src={msg.file_url} className="max-w-[220px] rounded-xl mb-1" />
              ) : (
                <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                {msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-border bg-card space-y-2">
        {/* Pending file preview */}
        {pendingFile && (
          <div className="flex items-center gap-3 bg-secondary rounded-xl px-3 py-2">
            {pendingFile.type === 'image' && (
              <img src={pendingFile.previewUrl} alt="preview" className="h-12 w-12 rounded-lg object-cover" />
            )}
            {pendingFile.type === 'video' && (
              <video src={pendingFile.previewUrl} className="h-12 w-16 rounded-lg object-cover" muted />
            )}
            {pendingFile.type === 'audio' && (
              <audio controls src={pendingFile.previewUrl} className="h-8 flex-1" />
            )}
            {pendingFile.type !== 'audio' && (
              <span className="text-xs text-muted-foreground flex-1 truncate">{pendingFile.file.name}</span>
            )}
            <button type="button" onClick={cancelFile} className="text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-xs text-destructive font-medium">
              Gravando... {Math.floor(recordingSeconds / 60).toString().padStart(2,'0')}:{(recordingSeconds % 60).toString().padStart(2,'0')}
            </span>
            <button type="button" onClick={stopRecording} className="ml-auto text-destructive hover:opacity-70">
              <MicOff className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Attachment picker */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="shrink-0 h-10 w-10 text-muted-foreground">
                <Paperclip className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuItem onClick={() => { fileInputRef.current.accept='image/*'; fileInputRef.current.click(); }}>
                <Image className="w-4 h-4 mr-2 text-blue-400" /> Imagem
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { fileInputRef.current.accept='video/*'; fileInputRef.current.click(); }}>
                <FileVideo className="w-4 h-4 mr-2 text-purple-400" /> Vídeo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { fileInputRef.current.accept='audio/*'; fileInputRef.current.click(); }}>
                <Paperclip className="w-4 h-4 mr-2 text-amber-400" /> Arquivo de Áudio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mic button */}
          {!pendingFile && !isRecording && (
            <Button type="button" variant="ghost" size="icon" className="shrink-0 h-10 w-10 text-muted-foreground" onClick={startRecording}>
              <Mic className="w-5 h-5" />
            </Button>
          )}

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={pendingFile ? 'Clique em enviar para encaminhar...' : 'Digite sua mensagem...'}
            className="bg-secondary border-border flex-1"
            disabled={!!pendingFile || isRecording}
          />
          <Button
            type="submit"
            size="icon"
            className="bg-primary text-primary-foreground h-10 w-10 shrink-0"
            disabled={uploading}
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}   
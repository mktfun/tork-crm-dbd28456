import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  isSimulated?: boolean;
  metadata?: any;
}

export function SDRSimulator({ 
  open, 
  onClose, 
  workflowName,
  workflowData 
}: { 
  open: boolean; 
  onClose: () => void; 
  workflowName: string;
  workflowData: { nodes: any[], edges: any[] }
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        { id: 'welcome', role: 'assistant', text: `Simulador de Fluxo "${workflowName}" ativado. Envie um "Olá" para testar o gatilho.`, isSimulated: true }
      ]);
    }
  }, [open, messages.length, workflowName]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Formatar histórico para a Edge Function
      const history = messages.map(m => ({
        role: m.role,
        content: m.text,
        metadata: m.metadata
      }));
      history.push({ role: 'user', content: userMsg.text, metadata: {} });

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          userId: user.id,
          messages: history,
          is_simulation: true,
          workflow_data: workflowData
        }
      });

      if (error) throw error;

      let cleanMessage = data.message || "";
      let isFallback = false;

      // 1. Sanitizar <thinking> (camada extra de segurança no frontend)
      cleanMessage = cleanMessage.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();

      // 2. Detectar sinal de vazamento para o Assistente Genérico
      const fallbackSignals = ["Amorim AI", "Mentor Técnico", "Modo WhatsApp", "como posso ajudar hoje? Estou pronto"];
      if (fallbackSignals.some(s => cleanMessage.includes(s))) {
        isFallback = true;
      }

      const assistantMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        text: isFallback ? "⚠️ ALERTA: A simulação caiu no Assistente genérico. Verifique os logs e o roteamento da function." : cleanMessage,
        metadata: data.metadata,
        isSimulated: true
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error('Erro no simulador:', error);
      setMessages(prev => [...prev, { 
        id: 'err', 
        role: 'assistant', 
        text: `Erro na simulação: ${error.message}. Verifique a aba de logs no Supabase.` 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute right-4 bottom-4 w-80 sm:w-96 h-[600px] max-h-[calc(100vh-100px)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-primary/10 border-b border-primary/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Simulador SDR</h3>
                <p className="text-[10px] text-primary/80 truncate max-w-[200px]">{workflowName}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`
                  max-w-[85%] rounded-2xl px-4 py-2 text-sm
                  ${msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-sm' 
                    : 'bg-muted border border-border rounded-bl-sm'
                  }
                `}>
                  {msg.text}
                </div>
                {msg.isSimulated && (
                  <span className="text-[10px] text-muted-foreground mt-1 ml-1 flex items-center gap-1">
                    <Bot className="w-3 h-3" /> Simulação Automática
                  </span>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex items-start">
                <div className="bg-muted border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center h-9">
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-card">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2"
            >
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Simule uma mensagem..." 
                className="rounded-full h-10"
              />
              <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0" disabled={!input.trim() || isTyping}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

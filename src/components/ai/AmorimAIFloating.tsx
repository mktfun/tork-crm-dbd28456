import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, User, Lightbulb, ThumbsUp, ThumbsDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

const suggestedQuestions = [
  "Quais apólices vencem nos próximos 30 dias?",
  "Qual o total de comissões recebidas este mês?",
  "Liste os 5 clientes com maior valor de prêmio",
  "Mostre sinistros em aberto"
];

export function AmorimAIFloating() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<Set<string>>(new Set());
  const [feedbackNoteId, setFeedbackNoteId] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const persistMessage = async (role: 'user' | 'assistant', content: string): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .insert({ user_id: user.id, role, content })
        .select('id')
        .single();
      
      if (error) {
        console.error('Error persisting message:', error);
        return null;
      }
      return data?.id || null;
    } catch (error) {
      console.error('Error persisting message:', error);
      return null;
    }
  };

  const handleFeedback = async (messageId: string | undefined, feedbackType: 'positive' | 'negative') => {
    if (!messageId || !user || feedbackSent.has(messageId)) return;

    try {
      const { error } = await supabase
        .from('ai_message_feedback')
        .insert({
          message_id: messageId,
          user_id: user.id,
          feedback_type: feedbackType,
          feedback_note: null
        });

      if (error) throw error;

      setFeedbackSent(prev => new Set([...prev, messageId]));
      
      if (feedbackType === 'negative') {
        setFeedbackNoteId(messageId);
        toast.info('O que podemos melhorar?', { duration: 3000 });
      } else {
        toast.success('Obrigado pelo feedback!', { duration: 2000 });
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
      toast.error('Erro ao enviar feedback');
    }
  };

  const submitFeedbackNote = async () => {
    if (!feedbackNoteId || !feedbackNote.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('ai_message_feedback')
        .update({ feedback_note: feedbackNote.trim() })
        .eq('message_id', feedbackNoteId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Feedback enviado. Obrigado!');
      setFeedbackNoteId(null);
      setFeedbackNote('');
    } catch (error) {
      console.error('Error updating feedback note:', error);
      toast.error('Erro ao enviar nota');
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !user) return;

    // Persist user message
    const userMessageId = await persistMessage('user', content.trim());
    
    const userMessage: Message = { 
      id: userMessageId || undefined,
      role: 'user', 
      content: content.trim() 
    };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare messages for API (convert to OpenAI format)
      const apiMessages = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { 
          messages: apiMessages,
          userId: user.id
        }
      });

      if (error) throw error;

      const assistantContent = data?.message || 'Desculpe, não consegui processar sua solicitação.';
      
      // Persist assistant message
      const assistantMessageId = await persistMessage('assistant', assistantContent);

      const assistantMessage: Message = {
        id: assistantMessageId || undefined,
        role: 'assistant',
        content: assistantContent
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Erro ao conectar com o assistente. Tente novamente em alguns segundos.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestionClick = (question: string) => {
    sendMessage(question);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "fixed bottom-6 right-6 z-50",
              "w-14 h-14 rounded-full flex items-center justify-center",
              "bg-white/10 backdrop-blur-md",
              "border border-white/20 hover:bg-white/20",
              "shadow-2xl transition-all duration-300"
            )}
          >
            <img 
              src="/tork_symbol_favicon.png" 
              alt="Tork AI" 
              className="w-6 h-6 object-contain" 
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-6 right-6 z-50",
              "w-[400px] h-[600px] max-h-[80vh]",
              "rounded-2xl overflow-hidden",
              "bg-background/95 backdrop-blur-xl",
              "border border-white/10",
              "shadow-2xl",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="p-4 bg-white/5 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/10 border border-white/10">
                  <img 
                    src="/tork_symbol_favicon.png" 
                    alt="Tork AI" 
                    className="w-5 h-5 object-contain" 
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Assistente Tork</h3>
                  <p className="text-xs text-muted-foreground/80">Inteligência Operacional</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="space-y-4">
                  {/* Welcome Message */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-6"
                  >
                    <h4 className="text-lg font-medium text-foreground mb-2">
                      Olá! Como posso ajudar?
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Pergunte sobre clientes, apólices, renovações ou finanças.
                    </p>
                  </motion.div>

                  {/* Suggested Questions */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                      <Lightbulb className="h-3 w-3" />
                      <span>Sugestões</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestedQuestions.map((question, idx) => (
                        <motion.button
                          key={idx}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => handleSuggestionClick(question)}
                          className="px-4 py-2 rounded-full text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-foreground transition-all duration-200 text-left"
                        >
                          {question}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className={cn(
                        "group",
                        message.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'
                      )}
                    >
                      <div className={cn(
                        "flex gap-3",
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      )}>
                        {message.role === 'assistant' && (
                          <div className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-white/10 border border-white/10">
                            <img src="/tork_symbol_favicon.png" alt="Tork" className="w-4 h-4 object-contain" />
                          </div>
                        )}
                        
                        <div className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-3",
                          message.role === 'user' 
                            ? "bg-primary text-primary-foreground rounded-br-sm" 
                            : "bg-white/10 text-foreground rounded-bl-sm"
                        )}>
                          {message.role === 'assistant' ? (
                            <div className="prose prose-sm prose-invert max-w-none">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>

                        {message.role === 'user' && (
                          <div className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-white/5 border border-white/10">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Feedback buttons for assistant messages */}
                      {message.role === 'assistant' && message.id && !feedbackSent.has(message.id) && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex gap-1 mt-2 ml-11 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <button 
                            onClick={() => handleFeedback(message.id, 'positive')}
                            className="p-1.5 hover:bg-green-500/20 rounded-lg border border-transparent hover:border-green-500/30 transition-all"
                            title="Resposta útil"
                          >
                            <ThumbsUp className="h-3.5 w-3.5 text-muted-foreground hover:text-green-400" />
                          </button>
                          <button 
                            onClick={() => handleFeedback(message.id, 'negative')}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg border border-transparent hover:border-red-500/30 transition-all"
                            title="Resposta pode melhorar"
                          >
                            <ThumbsDown className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400" />
                          </button>
                        </motion.div>
                      )}

                      {/* Feedback sent indicator */}
                      {message.role === 'assistant' && message.id && feedbackSent.has(message.id) && (
                        <span className="text-xs text-muted-foreground/60 ml-11 mt-1">
                          ✓ Feedback enviado
                        </span>
                      )}

                      {/* Feedback note input for negative feedback */}
                      {feedbackNoteId === message.id && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="ml-11 mt-2 w-full max-w-[280px]"
                        >
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={feedbackNote}
                              onChange={(e) => setFeedbackNote(e.target.value)}
                              placeholder="O que poderia melhorar?"
                              className="flex-1 px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') submitFeedbackNote();
                                if (e.key === 'Escape') {
                                  setFeedbackNoteId(null);
                                  setFeedbackNote('');
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={submitFeedbackNote}
                              disabled={!feedbackNote.trim()}
                              className="h-7 px-2 text-xs"
                            >
                              Enviar
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3"
                    >
                      <div className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-white/10 border border-white/10">
                        <img src="/tork_symbol_favicon.png" alt="Tork" className="w-4 h-4 object-contain" />
                      </div>
                      <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Pensando...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-white/5">
              <div className={cn(
                "flex items-end gap-2 rounded-xl",
                "bg-white/5 border border-white/10",
                "focus-within:border-primary/50 transition-colors"
              )}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua pergunta..."
                  disabled={isLoading || !user}
                  rows={1}
                  className={cn(
                    "flex-1 bg-transparent px-4 py-3 text-sm text-foreground",
                    "placeholder:text-muted-foreground resize-none",
                    "focus:outline-none disabled:opacity-50",
                    "max-h-32"
                  )}
                  style={{ minHeight: '44px' }}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading || !user}
                  className={cn(
                    "h-10 w-10 m-1 rounded-lg",
                    "bg-primary hover:bg-primary/90",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {!user && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Faça login para usar o assistente
                </p>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

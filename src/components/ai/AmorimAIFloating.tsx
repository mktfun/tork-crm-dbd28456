import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2, User, Bot, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Message {
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

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !user) return;

    const userMessage: Message = { role: 'user', content: content.trim() };
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

      const assistantMessage: Message = {
        role: 'assistant',
        content: data?.message || 'Desculpe, não consegui processar sua solicitação.'
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
              "bg-zinc-900/90 backdrop-blur-xl",
              "border border-white/10",
              "shadow-2xl shadow-black/50",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className={cn(
              "flex items-center justify-between px-4 py-3",
              "bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-indigo-600/20",
              "border-b border-white/10"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center",
                  "bg-gradient-to-br from-violet-500 to-indigo-600"
                )}>
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Amorim IA</h3>
                  <p className="text-xs text-zinc-400">Assistente inteligente</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white hover:bg-white/10"
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
                    <div className={cn(
                      "mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4",
                      "bg-gradient-to-br from-violet-500/20 to-indigo-600/20",
                      "border border-violet-500/30"
                    )}>
                      <Bot className="h-8 w-8 text-violet-400" />
                    </div>
                    <h4 className="text-lg font-medium text-white mb-2">
                      Olá! Como posso ajudar?
                    </h4>
                    <p className="text-sm text-zinc-400">
                      Pergunte sobre clientes, apólices, renovações ou finanças.
                    </p>
                  </motion.div>

                  {/* Suggested Questions */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 px-1">
                      <Lightbulb className="h-3 w-3" />
                      <span>Sugestões</span>
                    </div>
                    {suggestedQuestions.map((question, idx) => (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => handleSuggestionClick(question)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl",
                          "bg-white/5 hover:bg-white/10",
                          "border border-white/5 hover:border-violet-500/30",
                          "text-sm text-zinc-300 hover:text-white",
                          "transition-all duration-200"
                        )}
                      >
                        {question}
                      </motion.button>
                    ))}
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
                        "flex gap-3",
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center",
                          "bg-gradient-to-br from-violet-500 to-indigo-600"
                        )}>
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}
                      
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3",
                        message.role === 'user' 
                          ? "bg-violet-600 text-white rounded-br-sm" 
                          : "bg-white/10 text-zinc-100 rounded-bl-sm"
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
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center",
                          "bg-zinc-700"
                        )}>
                          <User className="h-4 w-4 text-zinc-300" />
                        </div>
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
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center",
                        "bg-gradient-to-br from-violet-500 to-indigo-600"
                      )}>
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                          <span className="text-sm text-zinc-400">Pensando...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
              <div className={cn(
                "flex items-end gap-2 rounded-xl",
                "bg-white/5 border border-white/10",
                "focus-within:border-violet-500/50 transition-colors"
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
                    "flex-1 bg-transparent px-4 py-3 text-sm text-white",
                    "placeholder:text-zinc-500 resize-none",
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
                    "bg-violet-600 hover:bg-violet-500",
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
                <p className="text-xs text-zinc-500 mt-2 text-center">
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

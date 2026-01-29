import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, User, Lightbulb, ThumbsUp, ThumbsDown, Plus, History, StopCircle } from 'lucide-react';
import { AIResponseRenderer } from './responses/AIResponseRenderer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAIConversations, ToolCallEvent } from '@/hooks/useAIConversations';
import { ChatHistorySidebar } from './ChatHistorySidebar';
import { 
  ToolExecutionStatus, 
  ToolExecution, 
  createToolExecution, 
  advanceToolStep, 
  completeToolExecution 
} from './ToolExecutionStatus';

const suggestedQuestions = [
  "Quais apólices vencem nos próximos 30 dias?",
  "Qual o total de comissões recebidas este mês?",
  "Liste os 5 clientes com maior valor de prêmio",
  "Mostre sinistros em aberto"
];

export function AmorimAIFloating() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<Set<string>>(new Set());
  const [feedbackNoteId, setFeedbackNoteId] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);
  const toolProgressTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  const {
    conversations,
    currentConversationId,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isStreaming,
    fetchConversations,
    loadConversation,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    persistMessage,
    startNewConversation,
    addMessage,
    setMessages,
    setCurrentConversationId,
    sendMessageWithStream,
    cancelStream
  } = useAIConversations();

  // Auto-scroll with smooth behavior on content change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages, messages[messages.length - 1]?.content]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Fetch conversations when history is opened
  useEffect(() => {
    if (showHistory && user) {
      fetchConversations();
    }
  }, [showHistory, user, fetchConversations]);

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

  // Handler para eventos de tool call
  const handleToolCall = useCallback((event: ToolCallEvent) => {
    if (event.status === 'started') {
      const newExecution = createToolExecution(event.toolName);
      setToolExecutions(prev => [...prev, newExecution]);
      
      // Simular progresso dos steps
      const stepCount = newExecution.steps.length;
      const interval = 600; // ms entre cada step
      
      for (let i = 1; i < stepCount; i++) {
        const timer = setTimeout(() => {
          setToolExecutions(prev => 
            prev.map(exec => 
              exec.toolName === event.toolName ? advanceToolStep(exec) : exec
            )
          );
        }, interval * i);
        
        toolProgressTimersRef.current.set(`${event.toolName}-${i}`, timer);
      }
    } else if (event.status === 'completed') {
      // Limpar timers pendentes
      toolProgressTimersRef.current.forEach((timer, key) => {
        if (key.startsWith(event.toolName)) {
          clearTimeout(timer);
          toolProgressTimersRef.current.delete(key);
        }
      });
      
      // Completar a execução e remover após delay
      setToolExecutions(prev => 
        prev.map(exec => 
          exec.toolName === event.toolName ? completeToolExecution(exec) : exec
        )
      );
      
      setTimeout(() => {
        setToolExecutions(prev => 
          prev.filter(exec => exec.toolName !== event.toolName)
        );
      }, 800);
    }
  }, []);

  // Limpar tool executions quando streaming termina
  useEffect(() => {
    if (!isStreaming && !isLoading) {
      // Pequeno delay para mostrar conclusão
      const timer = setTimeout(() => {
        setToolExecutions([]);
        // Limpar todos os timers
        toolProgressTimersRef.current.forEach(clearTimeout);
        toolProgressTimersRef.current.clear();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, isLoading]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || isStreaming || !user) return;

    let conversationId = currentConversationId;
    
    // Create a new conversation if none exists
    if (!conversationId) {
      conversationId = await createConversation();
      if (!conversationId) {
        toast.error('Erro ao criar conversa');
        return;
      }
    }

    // Persist user message
    const userMessageId = await persistMessage('user', content.trim(), conversationId);
    
    const userMessage = { 
      id: userMessageId || undefined,
      role: 'user' as const, 
      content: content.trim(),
      conversation_id: conversationId
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setToolExecutions([]); // Reset tool executions

    try {
      // Use streaming with tool call handler
      await sendMessageWithStream(
        content.trim(),
        conversationId,
        async (fullContent) => {
          // Persist assistant message after streaming is complete
          await persistMessage('assistant', fullContent, conversationId!);
          
          // Auto-name the conversation after the first exchange
          if (messages.length === 0) {
            const title = content.trim().slice(0, 50) + (content.length > 50 ? '...' : '');
            updateConversationTitle(conversationId!, title);
          }
        },
        handleToolCall // Pass tool call handler
      );
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Remove empty assistant message if exists and add error
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === 'assistant' && lastMsg.content === '') {
          return [...prev.slice(0, -1), {
            role: 'assistant' as const,
            content: `⚠️ ${errorMessage}`
          }];
        }
        return [...prev, {
          role: 'assistant' as const,
          content: `⚠️ ${errorMessage}`
        }];
      });
      
      toast.error(errorMessage);
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

  const handleNewConversation = () => {
    startNewConversation();
    setShowHistory(false);
  };

  const handleSelectConversation = (id: string) => {
    loadConversation(id);
    setShowHistory(false);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    toast.success('Conversa excluída');
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
            {/* History Sidebar */}
            <ChatHistorySidebar
              isOpen={showHistory}
              onClose={() => setShowHistory(false)}
              conversations={conversations}
              currentConversationId={currentConversationId}
              isLoading={isLoadingConversations}
              onSelectConversation={handleSelectConversation}
              onDeleteConversation={handleDeleteConversation}
            />

            {/* Header */}
            <div className="p-4 bg-white/5 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNewConversation}
                  className="h-9 w-9 hover:bg-white/10"
                  title="Nova conversa"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHistory(true)}
                  className="h-9 w-9 hover:bg-white/10"
                  title="Histórico"
                >
                  <History className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/10 border border-white/10">
                  <img 
                    src="/tork_symbol_favicon.png" 
                    alt="Tork AI" 
                    className="w-4 h-4 object-contain" 
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Assistente Tork</h3>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
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
                            message.isLoading ? (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Pensando...</span>
                              </div>
                            ) : (
                              <AIResponseRenderer content={message.content} />
                            )
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

                  {/* Tool Execution Status */}
                  {toolExecutions.length > 0 && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-white/10 border border-white/10">
                        <img src="/tork_symbol_favicon.png" alt="Tork" className="w-4 h-4 object-contain" />
                      </div>
                      <div className="flex-1">
                        <ToolExecutionStatus executions={toolExecutions} />
                      </div>
                    </div>
                  )}

                  {/* Loading indicator */}
                  {isLoading && toolExecutions.length === 0 && (
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
                  disabled={isLoading || isStreaming || !user}
                  rows={1}
                  className={cn(
                    "flex-1 bg-transparent px-4 py-3 text-sm text-foreground",
                    "placeholder:text-muted-foreground resize-none",
                    "focus:outline-none disabled:opacity-50",
                    "max-h-32"
                  )}
                  style={{ minHeight: '44px' }}
                />
                {isStreaming ? (
                  <Button
                    type="button"
                    size="icon"
                    onClick={cancelStream}
                    className={cn(
                      "h-10 w-10 m-1 rounded-lg",
                      "bg-destructive hover:bg-destructive/90"
                    )}
                    title="Cancelar"
                  >
                    <StopCircle className="h-4 w-4" />
                  </Button>
                ) : (
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
                )}
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

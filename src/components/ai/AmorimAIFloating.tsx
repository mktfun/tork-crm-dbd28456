import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Lightbulb, Plus, History, StopCircle, Maximize2, Minimize2, Paperclip, UploadCloud } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAIConversations, ToolCallEvent, AIMessage } from '@/hooks/useAIConversations';
import { ChatHistorySidebar } from './ChatHistorySidebar';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { FileAttachment } from './FileAttachment'; // Import novo
import {
  ToolExecutionStatus,
  ToolExecution,
  createToolExecution,
  advanceToolStep,
  completeToolExecution
} from './ToolExecutionStatus';

interface WindowDimensions {
  width: number;
  height: number;
  isMaximized: boolean;
}

const suggestedQuestions = [
  "Como estão minhas vendas este mês?",
  "Quais apólices vencem na próxima semana?",
  "Resumo das comissões pendentes",
  "Analisar desempenho do mês"
];

// ... (previous interfaces)

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 600;
const MIN_WIDTH = 350;
const MIN_HEIGHT = 450;
const MAX_WIDTH = 1000;
const MAX_HEIGHT_RATIO = 0.9;
const MAX_INPUT_CHARS = 1000;

export function AmorimAIFloating() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<Set<string>>(new Set());
  // ... (existing state)

  // === FEEDBACK STATE ===
  const [feedbackNoteId, setFeedbackNoteId] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');

  // === FILE UPLOAD STATE (FASE P4) ===
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === TOOL EXECUTION STATE ===
  const [activeToolExecutions, setActiveToolExecutions] = useState<ToolExecution[]>([]);
  const [messageToolExecutions, setMessageToolExecutions] = useState<Map<number, ToolExecution[]>>(new Map());
  const toolProgressTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const currentMessageIndexRef = useRef<number>(0);

  // === UI STATE ===
  const [showHistory, setShowHistory] = useState(false);

  // ... (rest of the state props)
  const [savedDimensions, setSavedDimensions] = useLocalStorage<WindowDimensions>(
    'tork-assistant-window-dimensions',
    { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, isMaximized: false }
  );
  const [windowSize, setWindowSize] = useState<WindowDimensions>(savedDimensions);
  const [isMaximized, setIsMaximized] = useState(savedDimensions.isMaximized || false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<'left' | 'top' | 'corner' | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

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

  // OTIMIZAÇÃO: Throttled auto-scroll (máximo 1x por segundo)
  const lastScrollTimeRef = useRef<number>(0);
  const scrollThrottleMs = 1000; // 1 segundo entre scrolls

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastScroll = now - lastScrollTimeRef.current;

    // Só executa scroll se passou tempo suficiente
    if (timeSinceLastScroll < scrollThrottleMs) {
      return;
    }

    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        lastScrollTimeRef.current = now;
        // Usar requestAnimationFrame para suavizar
        requestAnimationFrame(() => {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          });
        });
      }
    }
  }, [messages.length, messages[messages.length - 1]?.content?.length]);

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

  // Handler para eventos de tool call - now attaches to current message
  const handleToolCall = useCallback((event: ToolCallEvent) => {
    const messageIndex = currentMessageIndexRef.current;

    if (event.status === 'started') {
      const newExecution = createToolExecution(event.toolName);

      // Update active executions (for real-time display)
      setActiveToolExecutions(prev => [...prev, newExecution]);

      // Also track per-message for persistence
      setMessageToolExecutions(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(messageIndex) || [];
        newMap.set(messageIndex, [...existing, newExecution]);
        return newMap;
      });

      // Simular progresso dos steps
      const stepCount = newExecution.steps.length;
      const interval = 600; // ms entre cada step

      for (let i = 1; i < stepCount; i++) {
        const timer = setTimeout(() => {
          const updateExecution = (exec: ToolExecution) =>
            exec.toolName === event.toolName ? advanceToolStep(exec) : exec;

          setActiveToolExecutions(prev => prev.map(updateExecution));
          setMessageToolExecutions(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(messageIndex) || [];
            newMap.set(messageIndex, existing.map(updateExecution));
            return newMap;
          });
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

      const completeExecution = (exec: ToolExecution) =>
        exec.toolName === event.toolName ? completeToolExecution(exec) : exec;

      // Complete in both states
      setActiveToolExecutions(prev => prev.map(completeExecution));
      setMessageToolExecutions(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(messageIndex) || [];
        newMap.set(messageIndex, existing.map(completeExecution));
        return newMap;
      });

      // Remove from active after delay (but keep in message history)
      setTimeout(() => {
        setActiveToolExecutions(prev =>
          prev.filter(exec => exec.toolName !== event.toolName)
        );
      }, 800);
    }
  }, []);

  // Limpar active tool executions quando streaming termina (but keep message history)
  useEffect(() => {
    if (!isStreaming && !isLoading) {
      // Pequeno delay para mostrar conclusão
      const timer = setTimeout(() => {
        setActiveToolExecutions([]);
        // Limpar todos os timers
        toolProgressTimersRef.current.forEach(clearTimeout);
        toolProgressTimersRef.current.clear();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, isLoading]);

  const sendMessage = async (content: string) => {
    // Permitir envio se houver arquivo, mesmo sem texto
    if ((!content.trim() && !attachedFile) || isLoading || isStreaming || !user) return;

    let finalContent = content;

    // === FILE UPLOAD LOGIC ===
    if (attachedFile) {
      setIsUploading(true);
      try {
        const fileExt = attachedFile.name.split('.').pop();
        const sanitizedName = attachedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${user.id}/${Date.now()}_${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-uploads')
          .upload(fileName, attachedFile);

        if (uploadError) {
          console.error('Supabase storage error:', uploadError);
          throw uploadError;
        }

        // Instrução para o Agente ("The Wolf")
        const systemInstruction = `\n\n[SYSTEM: O usuário enviou um arquivo. Caminho no storage: "${fileName}". Nome original: "${attachedFile.name}". USE a tool 'inspect_document' para ler e analisar este documento.]`;

        // Se o usuário não digitou nada, coloca um texto padrão
        finalContent = (finalContent.trim() ? finalContent : "Analise este arquivo em anexo.") + systemInstruction;

      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error("Erro ao enviar arquivo. Tente novamente.");
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
        setAttachedFile(null);
      }
    }

    // FASE P5: Compressão de espaços em branco para economia de tokens
    const compressedContent = finalContent.trim().replace(/\s+/g, ' ');

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
    const userMessageId = await persistMessage('user', compressedContent, conversationId);

    const userMessage = {
      id: userMessageId || undefined,
      role: 'user' as const,
      content: compressedContent,
      conversation_id: conversationId
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setActiveToolExecutions([]); // Reset active tool executions

    // Track the index of the upcoming assistant message
    currentMessageIndexRef.current = messages.length + 1; // +1 for user message, assistant will be next

    try {
      // Use streaming with tool call handler
      await sendMessageWithStream(
        compressedContent,
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
    // Trava de concorrência: ignora cliques duplos
    if (isLoading || isStreaming) return;
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter envia, Shift+Enter quebra linha
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
    // Shift+Enter: comportamento padrão de nova linha (não precisa fazer nada)
  };

  // Auto-resize do textarea com limite de caracteres (FASE P5)
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    // FASE P5: Limite de caracteres
    if (newValue.length > MAX_INPUT_CHARS) {
      toast.warning(`Limite de ${MAX_INPUT_CHARS} caracteres atingido`);
      return;
    }

    setInput(newValue);

    // Auto-resize: reseta altura e calcula nova altura baseada no conteúdo
    const textarea = e.target;
    textarea.style.height = 'auto';
    const maxHeight = 120; // 5 linhas aproximadamente
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
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

  // === FILE UPLOAD HANDLERS ===
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validar tamanho e tipo se necessário
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast.error("Arquivo muito grande (Max 10MB)");
        return;
      }
      setAttachedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAttachedFile(e.dataTransfer.files[0]);
    }
  };

  // === RESIZE HANDLERS (FASE P4) ===
  const handleResizeStart = useCallback((
    e: React.MouseEvent,
    edge: 'left' | 'top' | 'corner'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeEdge(edge);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: windowSize.width,
      height: windowSize.height
    };
  }, [windowSize]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeStartRef.current) return;

    const { x: startX, y: startY, width: startWidth, height: startHeight } = resizeStartRef.current;
    const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;

    let newWidth = startWidth;
    let newHeight = startHeight;

    if (resizeEdge === 'left' || resizeEdge === 'corner') {
      // Dragging left edge means we're expanding to the left (inverting delta)
      const deltaX = startX - e.clientX;
      newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + deltaX));
    }

    if (resizeEdge === 'top' || resizeEdge === 'corner') {
      // Dragging top edge means we're expanding upward (inverting delta)
      const deltaY = startY - e.clientY;
      newHeight = Math.max(MIN_HEIGHT, Math.min(maxHeight, startHeight + deltaY));
    }

    setWindowSize({ width: newWidth, height: newHeight, isMaximized: false });
  }, [isResizing, resizeEdge]);

  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setResizeEdge(null);
      resizeStartRef.current = null;
      // Persist to localStorage with maximized state
      setSavedDimensions({ ...windowSize, isMaximized });
    }
  }, [isResizing, windowSize, isMaximized, setSavedDimensions]);

  // FASE P5: Toggle modo tela cheia
  const toggleMaximized = useCallback(() => {
    const newMaximized = !isMaximized;
    setIsMaximized(newMaximized);

    if (newMaximized) {
      // Expandir para 90% da tela
      const maxWidth = Math.min(window.innerWidth * 0.9, 1400);
      const maxHeight = window.innerHeight * 0.9;
      setWindowSize({ width: maxWidth, height: maxHeight, isMaximized: true });
      setSavedDimensions({ width: maxWidth, height: maxHeight, isMaximized: true });
    } else {
      // Restaurar tamanho padrão
      setWindowSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, isMaximized: false });
      setSavedDimensions({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, isMaximized: false });
    }
  }, [isMaximized, setSavedDimensions]);

  // Global mouse event listeners for resize
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      // Prevent text selection during resize
      document.body.style.userSelect = 'none';
      document.body.style.cursor = resizeEdge === 'corner' ? 'nwse-resize' :
        resizeEdge === 'left' ? 'ew-resize' : 'ns-resize';
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, handleResizeMove, handleResizeEnd, resizeEdge]);

  // Sync with localStorage on open (including maximized state)
  useEffect(() => {
    if (isOpen) {
      setWindowSize(savedDimensions);
      setIsMaximized(savedDimensions.isMaximized || false);
    }
  }, [isOpen, savedDimensions]);

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
            style={{
              width: windowSize.width,
              height: windowSize.height,
            }}
            className={cn(
              "fixed bottom-6 right-6 z-50",
              "rounded-2xl overflow-visible",
              "bg-background/95 backdrop-blur-xl",
              "border border-white/10",
              "shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]",
              "flex flex-col",
              isResizing && "border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.15)]"
            )}
            onDragOver={handleDragOver}
          >
            {/* === DRAG & DROP OVERLAY === */}
            <AnimatePresence>
              {isDragOver && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[60] bg-background/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-primary m-2"
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <UploadCloud className="w-16 h-16 text-primary mb-4 animate-bounce" />
                  <p className="text-lg font-medium text-foreground">Solte o arquivo aqui</p>
                  <p className="text-sm text-muted-foreground">PDFs ou Imagens para análise</p>
                </motion.div>
              )}
            </AnimatePresence>
            {/* === RESIZE HANDLES (FASE P4) === */}
            {/* Left Edge Handle */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'left')}
              className={cn(
                "absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10",
                "hover:bg-primary/20 transition-colors",
                isResizing && resizeEdge === 'left' && "bg-primary/30"
              )}
              style={{ transform: 'translateX(-50%)' }}
            />

            {/* Top Edge Handle */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'top')}
              className={cn(
                "absolute left-0 right-0 top-0 h-2 cursor-ns-resize z-10",
                "hover:bg-primary/20 transition-colors",
                isResizing && resizeEdge === 'top' && "bg-primary/30"
              )}
              style={{ transform: 'translateY(-50%)' }}
            />

            {/* Corner Handle (Top-Left) */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'corner')}
              className={cn(
                "absolute left-0 top-0 w-4 h-4 cursor-nwse-resize z-20",
                "hover:bg-primary/30 transition-colors rounded-br-lg",
                isResizing && resizeEdge === 'corner' && "bg-primary/40"
              )}
              style={{ transform: 'translate(-25%, -25%)' }}
            />

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

              {/* FASE P5: Botões de controle (Maximizar + Fechar) */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMaximized}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-white/10"
                  title={isMaximized ? "Restaurar tamanho" : "Modo Foco / Tela Cheia"}
                >
                  {isMaximized ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages Area - FASE P5: overscroll-behavior-contain */}
            <ScrollArea className="flex-1 p-4 overscroll-contain" ref={scrollRef}>
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
                <div className="flex flex-col space-y-4">
                  {messages.map((message, idx) => {
                    const isCurrentMessage = idx === messages.length - 1 && (isLoading || isStreaming);
                    const msgToolExecutions = isCurrentMessage
                      ? activeToolExecutions
                      : (messageToolExecutions.get(idx) || []);

                    return (
                      <ChatMessage
                        key={message.id || idx}
                        message={message}
                        index={idx}
                        isCurrentMessage={isCurrentMessage}
                        isLoading={isLoading}
                        isStreaming={isStreaming}
                        toolExecutions={msgToolExecutions}
                        feedbackSent={feedbackSent}
                        feedbackNoteId={feedbackNoteId}
                        feedbackNote={feedbackNote}
                        onFeedback={handleFeedback}
                        onFeedbackNoteChange={setFeedbackNote}
                        onFeedbackNoteSubmit={submitFeedbackNote}
                        onFeedbackNoteCancel={() => {
                          setFeedbackNoteId(null);
                          setFeedbackNote('');
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-white/5 relative">
              {/* File Attachment Preview */}
              <AnimatePresence>
                {attachedFile && (
                  <div className="absolute bottom-full left-0 p-4 w-full">
                    <FileAttachment
                      file={attachedFile}
                      onRemove={() => setAttachedFile(null)}
                      isUploading={isUploading}
                    />
                  </div>
                )}
              </AnimatePresence>

              <div className={cn(
                "flex items-end gap-2 rounded-xl",
                "bg-white/5 border border-white/10",
                "focus-within:border-primary/50 transition-colors"
              )}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua pergunta... (Enter envia, Shift+Enter nova linha)"
                  disabled={isLoading || isStreaming || !user}
                  rows={1}
                  className={cn(
                    "flex-1 bg-transparent px-4 py-3 text-sm text-foreground",
                    "placeholder:text-muted-foreground resize-none",
                    "focus:outline-none disabled:opacity-50",
                    "overflow-y-auto scrollbar-thin scrollbar-thumb-white/20"
                  )}
                  style={{
                    minHeight: '44px',
                    maxHeight: '120px' // 5 linhas max
                  }}
                />

                {/* File Upload Button */}
                <input
                  type="file"
                  id="chat-file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="application/pdf,image/*,.txt"
                  ref={fileInputRef}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 m-1 rounded-lg text-muted-foreground",
                    "hover:text-foreground hover:bg-white/10",
                    attachedFile && "text-primary bg-primary/10"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isStreaming || isUploading}
                  title="Anexar arquivo (PDF, Imagem)"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
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

              {/* FASE P5: Contador de caracteres */}
              {input.length > 0 && (
                <div className={cn(
                  "flex justify-end mt-1 text-xs",
                  input.length > MAX_INPUT_CHARS * 0.9 ? "text-destructive" : "text-muted-foreground"
                )}>
                  <span>{input.length}/{MAX_INPUT_CHARS}</span>
                </div>
              )}

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

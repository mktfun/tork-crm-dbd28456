import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { User, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { AIResponseRenderer } from './responses/AIResponseRenderer';
import { ToolExecutionStatus, ToolExecution } from './ToolExecutionStatus';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AIMessage } from '@/hooks/useAIConversations';

interface ChatMessageProps {
  message: AIMessage;
  index: number;
  isCurrentMessage: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  toolExecutions: ToolExecution[];
  feedbackSent: Set<string>;
  feedbackNoteId: string | null;
  feedbackNote: string;
  onFeedback: (messageId: string | undefined, type: 'positive' | 'negative') => void;
  onFeedbackNoteChange: (note: string) => void;
  onFeedbackNoteSubmit: () => void;
  onFeedbackNoteCancel: () => void;
}

/**
 * ChatMessage: Componente memoizado para evitar re-renders desnecessários
 * Mensagens antigas NUNCA re-renderizam, melhorando performance significativamente
 */
export const ChatMessage = memo<ChatMessageProps>(({
  message,
  index,
  isCurrentMessage,
  isLoading,
  isStreaming,
  toolExecutions,
  feedbackSent,
  feedbackNoteId,
  feedbackNote,
  onFeedback,
  onFeedbackNoteChange,
  onFeedbackNoteSubmit,
  onFeedbackNoteCancel,
}) => {
  const isAssistant = message.role === 'assistant';
  const showLoader = toolExecutions.length === 0 && message.isLoading && message.content === '';
  const showContent = Boolean(message.content);
  const hasFeedback = message.id ? feedbackSent.has(message.id) : false;
  const showFeedbackInput = feedbackNoteId === message.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className={cn(
        "group",
        isAssistant ? 'flex flex-col items-start' : 'flex flex-col items-end'
      )}
    >
      <div className={cn(
        "flex gap-3",
        isAssistant ? 'flex-row' : 'flex-row-reverse'
      )}>
        {isAssistant && (
          <div className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-white/10 border border-white/10">
            <img src="/tork_symbol_favicon.png" alt="Tork" className="w-4 h-4 object-contain" />
          </div>
        )}
        
        <div className={cn(
          "rounded-2xl px-4 py-3 min-w-0",
          isAssistant 
            ? "w-full max-w-[95%] bg-white/10 text-foreground rounded-bl-sm" 
            : "max-w-[85%] bg-primary text-primary-foreground rounded-br-sm"
        )}>
          {isAssistant ? (
            <div className="space-y-3 w-full max-w-full break-words">
              {/* Tool executions */}
              {toolExecutions.length > 0 && (
                <ToolExecutionStatus executions={toolExecutions} />
              )}
              
              {/* Loader quando não há tools e não há conteúdo */}
              {showLoader && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Pensando...</span>
                </div>
              )}
              
              {/* Conteúdo com flag de streaming para renderização otimizada */}
              {showContent && (
                <AIResponseRenderer 
                  content={message.content} 
                  isStreaming={isCurrentMessage && isStreaming}
                />
              )}
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {!isAssistant && (
          <div className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-white/5 border border-white/10">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Feedback buttons for assistant messages */}
      {isAssistant && message.id && !hasFeedback && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-1 mt-2 ml-11 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <button 
            onClick={() => onFeedback(message.id, 'positive')}
            className="p-1.5 hover:bg-green-500/20 rounded-lg border border-transparent hover:border-green-500/30 transition-all"
            title="Resposta útil"
          >
            <ThumbsUp className="h-3.5 w-3.5 text-muted-foreground hover:text-green-400" />
          </button>
          <button 
            onClick={() => onFeedback(message.id, 'negative')}
            className="p-1.5 hover:bg-red-500/20 rounded-lg border border-transparent hover:border-red-500/30 transition-all"
            title="Resposta pode melhorar"
          >
            <ThumbsDown className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400" />
          </button>
        </motion.div>
      )}

      {/* Feedback sent indicator */}
      {isAssistant && message.id && hasFeedback && (
        <span className="text-xs text-muted-foreground/60 ml-11 mt-1">
          ✓ Feedback enviado
        </span>
      )}

      {/* Feedback note input for negative feedback */}
      {showFeedbackInput && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="ml-11 mt-2 w-full max-w-[280px]"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={feedbackNote}
              onChange={(e) => onFeedbackNoteChange(e.target.value)}
              placeholder="O que poderia melhorar?"
              className="flex-1 px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onFeedbackNoteSubmit();
                if (e.key === 'Escape') onFeedbackNoteCancel();
              }}
            />
            <Button
              size="sm"
              onClick={onFeedbackNoteSubmit}
              disabled={!feedbackNote.trim()}
              className="h-7 px-2 text-xs"
            >
              Enviar
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: mensagens antigas nunca re-renderizam
  // Só re-renderiza se algo crítico mudou
  
  // Se não é a mensagem atual, só re-renderiza se feedback mudou
  if (!nextProps.isCurrentMessage && !prevProps.isCurrentMessage) {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.feedbackSent === nextProps.feedbackSent &&
      prevProps.feedbackNoteId === nextProps.feedbackNoteId
    );
  }
  
  // Mensagem atual: comparação completa
  return (
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.isLoading === nextProps.message.isLoading &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.toolExecutions === nextProps.toolExecutions &&
    prevProps.feedbackSent === nextProps.feedbackSent &&
    prevProps.feedbackNoteId === nextProps.feedbackNoteId &&
    prevProps.feedbackNote === nextProps.feedbackNote
  );
});

ChatMessage.displayName = 'ChatMessage';

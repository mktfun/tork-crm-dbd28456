import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AIConversation } from '@/hooks/useAIConversations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: AIConversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function ChatHistorySidebar({
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  isLoading,
  onSelectConversation,
  onDeleteConversation
}: ChatHistorySidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "absolute left-0 top-0 bottom-0 z-50",
              "w-[280px] flex flex-col",
              "bg-background/95 backdrop-blur-xl",
              "border-r border-white/10"
            )}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Histórico</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma conversa ainda
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {conversations.map((conversation) => (
                    <motion.div
                      key={conversation.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group relative"
                    >
                      <button
                        onClick={() => onSelectConversation(conversation.id)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-lg transition-all",
                          "hover:bg-white/10",
                          currentConversationId === conversation.id 
                            ? "bg-primary/20 border border-primary/30" 
                            : "border border-transparent"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {conversation.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(conversation.updated_at), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </p>
                          </div>
                        </div>
                      </button>
                      
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conversation.id);
                        }}
                        className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2",
                          "p-1.5 rounded-md",
                          "opacity-0 group-hover:opacity-100",
                          "hover:bg-red-500/20 hover:text-red-400",
                          "transition-all"
                        )}
                        title="Excluir conversa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

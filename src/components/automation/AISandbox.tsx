import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Bot, User, Loader2, FlaskConical, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAISandbox } from '@/hooks/useAISandbox';
import { FormattingAlert } from './FormattingAlert';
import { IntegrationFlowViz } from './IntegrationFlowViz';

interface Stage {
  id: string;
  name: string;
  color: string;
  chatwoot_label?: string | null;
}

interface Pipeline {
  id: string;
  name: string;
}

interface AiSetting {
  ai_name?: string | null;
  ai_persona?: string | null;
  ai_objective?: string | null;
  is_active?: boolean | null;
}

interface AISandboxProps {
  selectedStage: Stage | null;
  selectedPipeline: Pipeline | null;
  aiSetting: AiSetting | null;
  pipelineDefault: {
    ai_name?: string | null;
    ai_persona?: string | null;
    ai_objective?: string | null;
    is_active?: boolean | null;
  } | null;
}

export function AISandbox({
  selectedStage,
  selectedPipeline,
  aiSetting,
  pipelineDefault,
}: AISandboxProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Build config for sandbox
  const sandboxConfig = selectedStage && selectedPipeline ? {
    stageId: selectedStage.id,
    pipelineId: selectedPipeline.id,
    pipelineName: selectedPipeline.name,
    stageName: selectedStage.name,
    aiName: aiSetting?.ai_name ?? pipelineDefault?.ai_name ?? undefined,
    aiPersona: aiSetting?.ai_persona ?? pipelineDefault?.ai_persona ?? undefined,
    aiObjective: aiSetting?.ai_objective ?? pipelineDefault?.ai_objective ?? undefined,
    dealTitle: selectedPipeline.name, // Use pipeline name as context
  } : null;
  
  const { messages, isLoading, lastViolations, sendMessage, clearChat } = useAISandbox(sandboxConfig);
  
  const isAiActive = aiSetting?.is_active ?? pipelineDefault?.is_active ?? false;
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/30 rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20">
            <FlaskConical className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Laboratório do Robô</h2>
            <p className="text-[10px] text-muted-foreground">
              Teste o comportamento da IA
            </p>
          </div>
        </div>
        
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-xs"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </div>
      
      {/* Integration Flow Viz */}
      {selectedStage && (
        <div className="px-4 py-3 border-b border-border/50 bg-secondary/20">
          <IntegrationFlowViz
            chatwootLabel={selectedStage.chatwoot_label}
            aiName={aiSetting?.ai_name ?? pipelineDefault?.ai_name ?? 'Agente IA'}
            objective={aiSetting?.ai_objective ?? pipelineDefault?.ai_objective ?? undefined}
            isAiActive={isAiActive}
          />
        </div>
      )}
      
      {/* Formatting Alert */}
      {lastViolations.length > 0 && (
        <div className="px-4 pt-3">
          <FormattingAlert violations={lastViolations} />
        </div>
      )}
      
      {/* Messages area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                Sandbox Pronto
              </h3>
              <p className="text-xs text-muted-foreground max-w-[200px] mb-4">
                {selectedStage 
                  ? `Teste como a IA vai responder na etapa "${selectedStage.name}"`
                  : 'Selecione uma etapa para testar o comportamento da IA'
                }
              </p>
              
              {selectedStage && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {['Oi, tudo bem?', 'Quero um orçamento', 'Quanto custa?'].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => sendMessage(suggestion)}
                      disabled={isLoading}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-lg shrink-0',
                    message.violations?.length ? 'bg-destructive/20' : 'bg-primary/20'
                  )}>
                    <Bot className={cn(
                      'h-4 w-4',
                      message.violations?.length ? 'text-destructive' : 'text-primary'
                    )} />
                  </div>
                )}
                
                <div
                  className={cn(
                    'max-w-[80%] rounded-xl px-3 py-2',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.violations?.length
                      ? 'bg-destructive/10 border border-destructive/30 text-foreground'
                      : 'bg-secondary text-foreground'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {message.role === 'user' && (
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-secondary shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20 shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-secondary rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Digitando...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Input area */}
      <div className="p-4 border-t border-border/50">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedStage ? 'Digite uma mensagem de teste...' : 'Selecione uma etapa primeiro'}
            disabled={!selectedStage || isLoading}
            className="flex-1 bg-secondary/50 border-border/50"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !selectedStage || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Ctrl+Enter para enviar • Esc para limpar
        </p>
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectFormattingViolations } from '@/components/automation/FormattingAlert';
import { AI_PERSONA_PRESETS, GLOBAL_SYNTAX_RULES } from '@/components/automation/aiPresets';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  violations?: string[];
}

interface SandboxConfig {
  stageId: string;
  pipelineId: string;
  pipelineName: string;
  stageName: string;
  nextStageName?: string;
  aiName?: string;
  aiPersona?: string;
  aiObjective?: string;
  dealTitle?: string;
}

interface UseAISandboxReturn {
  messages: Message[];
  isLoading: boolean;
  lastViolations: string[];
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  configUsed: SandboxConfig | null;
}

export function useAISandbox(config: SandboxConfig | null): UseAISandboxReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastViolations, setLastViolations] = useState<string[]>([]);
  const [configUsed, setConfigUsed] = useState<SandboxConfig | null>(null);

  const buildSystemPrompt = useCallback((cfg: SandboxConfig): string => {
    const parts: string[] = [];

    // Substitui as variáveis dinâmicas {{...}} no texto do persona
    const substituteVars = (text: string) =>
      text
        .replace(/\{\{ai_name\}\}/g, cfg.aiName ?? 'Agente')
        .replace(/\{\{company_name\}\}/g, 'Corretora')
        .replace(/\{\{deal_title\}\}/g, cfg.dealTitle ?? 'nosso produto')
        .replace(/\{\{pipeline_name\}\}/g, cfg.pipelineName)
        .replace(/\{\{next_stage_name\}\}/g, cfg.nextStageName ?? 'próxima etapa');
    
    // Base persona (com variáveis substituídas)
    if (cfg.aiPersona) {
      parts.push(substituteVars(cfg.aiPersona));
    } else {
      const defaultPreset = AI_PERSONA_PRESETS.find(p => p.id === 'proactive');
      if (defaultPreset) {
        parts.push(substituteVars(defaultPreset.xmlPrompt));
      }
    }
    
    // Objective injection
    if (cfg.aiObjective) {
      parts.push(`
<mission>
Seu objetivo principal nesta etapa é: ${cfg.aiObjective}
</mission>`);
    }
    
    // Context injection
    parts.push(`
<context>
Funil: "${cfg.pipelineName}" | Etapa atual: "${cfg.stageName}"${cfg.nextStageName ? ` | Próxima etapa: "${cfg.nextStageName}"` : ''}
${cfg.dealTitle ? `Produto/Foco: ${cfg.dealTitle}` : ''}
${cfg.aiName ? `Você se chama ${cfg.aiName}.` : ''}
Quando concluir a coleta de dados, use a tag: [MOVER_PARA: ${cfg.nextStageName ?? 'próxima etapa'}]
</context>`);
    
    // Global syntax rules
    parts.push(GLOBAL_SYNTAX_RULES);
    
    return parts.join('\n\n');
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!config) {
      toast.error('Configure uma etapa primeiro');
      return;
    }

    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setLastViolations([]);
    setConfigUsed(config);

    try {
      const systemPrompt = buildSystemPrompt(config);
      
      // Build messages for the API
      const apiMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content },
      ];

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      // Call the sandbox edge function
      const { data, error } = await supabase.functions.invoke('ai-sandbox', {
        body: {
          messages: apiMessages,
          systemPrompt,
          userId,
          mode: 'sandbox',
          config: {
            stageId: config.stageId,
            pipelineId: config.pipelineId,
            pipelineName: config.pipelineName,
            stageName: config.stageName,
          },
        },
      });

      if (error) throw error;

      const assistantContent = data?.message || data?.response || 'Sem resposta';
      const violations = detectFormattingViolations(assistantContent);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        violations,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setLastViolations(violations);

    } catch (error) {
      console.error('Sandbox error:', error);
      toast.error('Erro ao testar IA. Verifique as configurações.');
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        violations: [],
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [config, messages, buildSystemPrompt]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setLastViolations([]);
    setConfigUsed(null);
  }, []);

  return {
    messages,
    isLoading,
    lastViolations,
    sendMessage,
    clearChat,
    configUsed,
  };
}

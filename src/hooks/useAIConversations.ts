import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

// Lista de ferramentas de escrita que devem invalidar o cache
const WRITE_TOOLS = [
  'move_deal_to_stage',
  'create_deal',
  'update_deal',
  'delete_deal',
  'create_client',
  'update_client',
  'create_policy',
  'update_policy',
  'delete_client',
  'delete_policy',
  'create_appointment'
];

// Mapeamento de ferramentas para as chaves de cache que devem ser invalidadas
const TOOL_CACHE_KEYS: Record<string, string[]> = {
  'move_deal_to_stage': ['crm_deals', 'crm_stages', 'crm_pipelines'],
  'create_deal': ['crm_deals', 'crm_stages', 'crm_pipelines'],
  'update_deal': ['crm_deals', 'crm_stages'],
  'delete_deal': ['crm_deals', 'crm_stages', 'crm_pipelines'],
  'create_client': ['clientes', 'clients'],
  'update_client': ['clientes', 'clients'],
  'delete_client': ['clientes', 'clients'],
  'create_policy': ['apolices', 'policies'],
  'update_policy': ['apolices', 'policies'],
  'delete_policy': ['apolices', 'policies'],
  'create_appointment': ['appointments']
};

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  conversation_id?: string;
  isLoading?: boolean; // Flag de controle visual granular
}

export interface ToolCallEvent {
  toolName: string;
  status: 'started' | 'completed';
}

// Constantes de configuração (derivadas do client.ts)
const SUPABASE_URL = "https://jaouwhckqqnaxqyfvgyq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphb3V3aGNrcXFuYXhxeWZ2Z3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzQyNTksImV4cCI6MjA2Nzc1MDI1OX0.lQ72wQeKL9F9L9T-1kjJif5SEY_cHYFI7rM-uXN5ARc";
const AI_ASSISTANT_URL = `${SUPABASE_URL}/functions/v1/ai-assistant`;

export function useAIConversations() {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const completedWriteToolsRef = useRef<Set<string>>(new Set());
  const { user } = useAuth();
  const queryClient = useQueryClient();

// Função para invalidar e refetch agressivo quando ferramentas de escrita são completadas
  const invalidateCacheForTool = useCallback(async (toolName: string) => {
    const cacheKeys = TOOL_CACHE_KEYS[toolName];
    if (cacheKeys) {
      console.log(`[CACHE-INVALIDATE] Invalidando e refetch agressivo para: ${cacheKeys.join(', ')}`);
      
      // Invalidação + Refetch duplo para garantir sincronização imediata
      await Promise.all(cacheKeys.map(async (key) => {
        await queryClient.invalidateQueries({ queryKey: [key] });
        await queryClient.refetchQueries({ queryKey: [key], type: 'active' });
      }));
      
      // Chaves críticas adicionais para garantir Kanban e listagens sempre atualizadas
      const criticalKeys = ['crm_deals', 'kanban', 'clientes', 'apolices'];
      await Promise.all(criticalKeys.map(async (key) => {
        await queryClient.invalidateQueries({ queryKey: [key] });
        await queryClient.refetchQueries({ queryKey: [key], type: 'active' });
      }));
    }
  }, [queryClient]);

  // Fetch all conversations for the user
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingConversations(true);
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user]);

  // Load messages for a specific conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!user) return;
    
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setMessages(data?.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        conversation_id: msg.conversation_id || undefined
      })) || []);
      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [user]);

  // Create a new conversation
  const createConversation = useCallback(async (title?: string): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title: title || 'Nova Conversa'
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      const newId = data?.id || null;
      if (newId) {
        setCurrentConversationId(newId);
        await fetchConversations();
      }
      return newId;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [user, fetchConversations]);

  // Update conversation title
  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      await fetchConversations();
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  }, [user, fetchConversations]);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
      await fetchConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }, [user, currentConversationId, fetchConversations]);

  // Persist a message to the database
  const persistMessage = useCallback(async (
    role: 'user' | 'assistant', 
    content: string,
    conversationId: string
  ): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .insert({ 
          user_id: user.id, 
          role, 
          content,
          conversation_id: conversationId
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('Error persisting message:', error);
        return null;
      }
      
      // Update conversation's updated_at timestamp
      await supabase
        .from('ai_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      
      return data?.id || null;
    } catch (error) {
      console.error('Error persisting message:', error);
      return null;
    }
  }, [user]);

  // Start a new conversation (clear state)
  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  // Add message to local state
  const addMessage = useCallback((message: AIMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Update last message (for streaming)
  const updateLastMessage = useCallback((content: string) => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], content };
      return updated;
    });
  }, []);

  // Append to last message (for streaming delta)
  const appendToLastMessage = useCallback((delta: string) => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      updated[updated.length - 1] = { ...lastMsg, content: lastMsg.content + delta };
      return updated;
    });
  }, []);

  // Cancel ongoing stream
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Send message with streaming support
  const sendMessageWithStream = useCallback(async (
    content: string,
    conversationId: string,
    onComplete?: (fullContent: string) => void,
    onToolCall?: (event: ToolCallEvent) => void
  ): Promise<void> => {
    if (!user) return;

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();
    completedWriteToolsRef.current.clear(); // Reset completed tools for new message

    // === FASE P3.5: Resiliência de Streaming ===
    // Timeout global de 90 segundos para consultorias técnicas longas
    const GLOBAL_TIMEOUT_MS = 90000;
    // Watchdog de inatividade: 15 segundos sem chunks = conexão morta
    const WATCHDOG_INACTIVITY_MS = 15000;
    
    let lastActivityTime = Date.now();
    let watchdogIntervalId: ReturnType<typeof setInterval> | null = null;
    let accumulatedContent = ''; // Track content for partial preservation
    let wasAbortedByWatchdog = false;
    let wasAbortedByTimeout = false;

    const globalTimeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        console.warn('[SSE-FRONT] Timeout global de 90s atingido, abortando requisição');
        wasAbortedByTimeout = true;
        abortControllerRef.current.abort();
      }
    }, GLOBAL_TIMEOUT_MS);

    // Cleanup function to clear all timers
    const cleanupTimers = () => {
      clearTimeout(globalTimeoutId);
      if (watchdogIntervalId) {
        clearInterval(watchdogIntervalId);
        watchdogIntervalId = null;
      }
    };
    
    // Prepare messages for API (exclude loading messages)
    const apiMessages = messages
      .filter(msg => !msg.isLoading)
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    apiMessages.push({ role: 'user', content });

    // Inject loading message immediately for instant feedback
    // We only show "Pensando..." if no tool is executing yet
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '', 
      conversation_id: conversationId,
      isLoading: true 
    }]);

    // Helper to update the last assistant message
    const updateLastAssistantMessage = (newContent: string, isFinished: boolean) => {
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (updated[lastIndex]?.role === 'assistant') {
          updated[lastIndex] = { 
            ...updated[lastIndex], 
            content: newContent, 
            isLoading: !isFinished 
          };
        }
        return updated;
      });
    };

    try {
      // Obter session para autenticação
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || SUPABASE_ANON_KEY;
      
      console.log('[SSE-FRONT] Iniciando fetch para IA (timeout: 90s, watchdog: 15s)...');
      console.log('[DEBUG-NETWORK] Endpoint IA:', AI_ASSISTANT_URL);
      console.log('[DEBUG-NETWORK] Auth type:', session?.access_token ? 'User JWT' : 'Anon Key');
      
      const response = await fetch(AI_ASSISTANT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${authToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ 
          messages: apiMessages,
          userId: user.id,
          conversationId,
          stream: true
        }),
        signal: abortControllerRef.current.signal,
      });

      console.log('[SSE-FRONT] Status:', response.status, '| Content-Type:', response.headers.get('Content-Type'));

      // Handle rate limit and credit errors
      if (response.status === 429) {
        throw new Error('Limite de requisições excedido. Aguarde alguns segundos.');
      }
      if (response.status === 402) {
        throw new Error('Créditos de IA esgotados. Entre em contato com o suporte.');
      }
      if (!response.ok) {
        const errorMsg = await response.text();
        console.error('[SSE-FRONT] Erro fatal no handshake:', errorMsg);
        throw new Error(errorMsg || 'Falha ao conectar com o assistente.');
      }
      if (!response.body) {
        console.error('[SSE-FRONT] Response body is null');
        throw new Error('Falha ao conectar com o assistente - stream vazio.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullContent = '';
      let streamDone = false;

      // === WATCHDOG: Monitor de atividade por chunk ===
      watchdogIntervalId = setInterval(() => {
        const inactivityDuration = Date.now() - lastActivityTime;
        if (inactivityDuration > WATCHDOG_INACTIVITY_MS) {
          console.warn(`[SSE-WATCHDOG] Inatividade de ${Math.round(inactivityDuration / 1000)}s detectada, abortando...`);
          wasAbortedByWatchdog = true;
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
        }
      }, 2000); // Check every 2 seconds

      console.log('[SSE-FRONT] Iniciando loop de leitura do stream...');

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[SSE-FRONT] Stream reader done');
          break;
        }
        
        // === WATCHDOG: Atualizar timestamp de atividade ===
        lastActivityTime = Date.now();
        
        const rawChunk = decoder.decode(value, { stream: true });
        console.log('[SSE-FRONT] Bruto recebido:', rawChunk.slice(0, 200));
        textBuffer += rawChunk;

        // Process line-by-line
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            
            // Detect tool calls from the stream
            const toolCalls = parsed.choices?.[0]?.delta?.tool_calls;
            if (toolCalls && toolCalls.length > 0) {
              for (const tc of toolCalls) {
                const toolName = tc.function?.name;
                if (toolName && onToolCall) {
                  console.log('[SSE-FRONT] Tool call detected:', toolName);
                  onToolCall({ toolName, status: 'started' });
                }
              }
            }
            
            // Detect tool execution results (custom event from backend)
            if (parsed.tool_result && onToolCall) {
              const toolResultName = parsed.tool_result.name;
              console.log('[SSE-FRONT] Tool result:', toolResultName);
              onToolCall({ toolName: toolResultName, status: 'completed' });
              
              // Invalidar cache se for uma ferramenta de escrita
              if (WRITE_TOOLS.includes(toolResultName) && !completedWriteToolsRef.current.has(toolResultName)) {
                completedWriteToolsRef.current.add(toolResultName);
                invalidateCacheForTool(toolResultName);
              }
            }
            
            const deltaContent = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (deltaContent) {
              // Saneamento de caracteres para tabelas Markdown (FASE P3.7)
              // Remove espaços acidentais no início de linhas que começam com '|'
              const sanitizedContent = deltaContent.replace(/^\s+\|/gm, '|');
              
              fullContent += sanitizedContent;
              accumulatedContent = fullContent; // Track for partial preservation
              // Update the last message with accumulated content and clear loading state
              updateLastAssistantMessage(fullContent, false);
            }
          } catch {
            // Incomplete JSON, put back and wait for more data
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (deltaContent) {
              fullContent += deltaContent;
              accumulatedContent = fullContent;
              updateLastAssistantMessage(fullContent, false);
            }
          } catch { /* ignore partial leftovers */ }
        }
      }

      // Mark as finished (success)
      cleanupTimers();
      updateLastAssistantMessage(fullContent, true);
      onComplete?.(fullContent);
    } catch (error) {
      cleanupTimers(); // Limpar todos os timers em caso de erro
      
      if ((error as Error).name === 'AbortError') {
        console.log('[SSE-FRONT] Stream abortado');
        
        // === FASE P3.5: Preservação de Conteúdo Parcial ===
        // NUNCA resetar conteúdo - preservar o que já foi recebido
        if (accumulatedContent.length > 0) {
          // Adicionar sufixo visual discreto ao conteúdo preservado
          let suffix = '';
          if (wasAbortedByWatchdog) {
            suffix = '\n\n*[⚠️ Conexão perdida após 15s de inatividade. Conteúdo parcial preservado.]*';
          } else if (wasAbortedByTimeout) {
            suffix = '\n\n*[⏱️ Tempo limite de 90s atingido. Conteúdo parcial preservado.]*';
          } else {
            suffix = '\n\n*[🛑 Resposta interrompida. Conteúdo parcial preservado.]*';
          }
          updateLastAssistantMessage(accumulatedContent + suffix, true);
          console.log('[SSE-FRONT] Conteúdo parcial preservado:', accumulatedContent.length, 'caracteres');
        } else {
          // Sem conteúdo recebido, mostrar mensagem de erro apropriada
          let errorMessage = 'Ops, algo deu errado. Pode tentar de novo?';
          if (wasAbortedByWatchdog) {
            errorMessage = '⚠️ A conexão ficou inativa por muito tempo. Verifique sua internet e tente novamente.';
          } else if (wasAbortedByTimeout) {
            errorMessage = '⏱️ O servidor demorou muito para responder. Tente uma pergunta mais específica.';
          }
          updateLastAssistantMessage(errorMessage, true);
        }
      } else {
        throw error;
      }
    } finally {
      // === Saneamento de Memória: Garantir limpeza rigorosa ===
      cleanupTimers();
      setIsStreaming(false);
      abortControllerRef.current = null;
      console.log('[SSE-FRONT] Cleanup completo - timers limpos, controller nullificado');
    }
  }, [user, messages, invalidateCacheForTool]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelStream();
    };
  }, [cancelStream]);

  return {
    // State
    conversations,
    currentConversationId,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isStreaming,
    
    // Actions
    fetchConversations,
    loadConversation,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    persistMessage,
    startNewConversation,
    addMessage,
    updateLastMessage,
    appendToLastMessage,
    sendMessageWithStream,
    cancelStream,
    setMessages,
    setCurrentConversationId
  };
}

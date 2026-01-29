import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
}

// URL base para chamadas de streaming
const getStreamUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/ai-assistant`;
};

export function useAIConversations() {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { user } = useAuth();

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
    onComplete?: (fullContent: string) => void
  ): Promise<void> => {
    if (!user) return;

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();
    
    // Prepare messages for API
    const apiMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    apiMessages.push({ role: 'user', content });

    try {
      const response = await fetch(getStreamUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: apiMessages,
          userId: user.id,
          conversationId,
          stream: true
        }),
        signal: abortControllerRef.current.signal,
      });

      // Handle rate limit and credit errors
      if (response.status === 429) {
        throw new Error('Limite de requisições excedido. Aguarde alguns segundos.');
      }
      if (response.status === 402) {
        throw new Error('Créditos de IA esgotados. Entre em contato com o suporte.');
      }
      if (!response.ok || !response.body) {
        throw new Error('Falha ao conectar com o assistente.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullContent = '';
      let streamDone = false;

      // Add empty assistant message to start receiving content
      setMessages(prev => [...prev, { role: 'assistant', content: '', conversation_id: conversationId }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

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
            const deltaContent = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (deltaContent) {
              fullContent += deltaContent;
              // Update the last message with accumulated content
              setMessages(prev => {
                if (prev.length === 0) return prev;
                const updated = [...prev];
                updated[updated.length - 1] = { 
                  ...updated[updated.length - 1], 
                  content: fullContent 
                };
                return updated;
              });
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
              setMessages(prev => {
                if (prev.length === 0) return prev;
                const updated = [...prev];
                updated[updated.length - 1] = { 
                  ...updated[updated.length - 1], 
                  content: fullContent 
                };
                return updated;
              });
            }
          } catch { /* ignore partial leftovers */ }
        }
      }

      onComplete?.(fullContent);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        throw error;
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [user, messages]);

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

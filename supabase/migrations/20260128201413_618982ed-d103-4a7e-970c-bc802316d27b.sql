-- Criar tabela de conversas para agrupar mensagens
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT DEFAULT 'Nova Conversa',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Atualizar ai_messages para vincular a uma conversa
ALTER TABLE ai_messages 
ADD COLUMN conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE;

-- RLS para ai_conversations
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations" ON ai_conversations 
FOR ALL USING (auth.uid() = user_id);

-- Índice para performance de busca por histórico
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_conversations_user_updated ON ai_conversations(user_id, updated_at DESC);
-- Tabela de histórico de mensagens
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback nas respostas
CREATE TABLE ai_message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES ai_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative', 'neutral')),
  feedback_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Padrões de comportamento aprendidos
CREATE TABLE ai_learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  pattern_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score FLOAT DEFAULT 0.5,
  last_reinforced TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pattern_type)
);

-- Histórico de melhorias/evolução
CREATE TABLE ai_improvement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  improvement_type TEXT NOT NULL,
  before_value JSONB,
  after_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_message_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_improvement_log ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users manage own messages" ON ai_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own feedback" ON ai_message_feedback FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own patterns" ON ai_learned_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage patterns" ON ai_learned_patterns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users view own improvements" ON ai_improvement_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can log improvements" ON ai_improvement_log FOR INSERT WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_ai_messages_user_id ON ai_messages(user_id);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at DESC);
CREATE INDEX idx_ai_message_feedback_message_id ON ai_message_feedback(message_id);
CREATE INDEX idx_ai_learned_patterns_user_confidence ON ai_learned_patterns(user_id, confidence_score DESC);
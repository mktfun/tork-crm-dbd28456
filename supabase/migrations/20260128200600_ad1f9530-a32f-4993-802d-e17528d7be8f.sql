-- Corrigir políticas permissivas demais nas novas tabelas

-- Remover políticas inseguras
DROP POLICY IF EXISTS "System can manage patterns" ON ai_learned_patterns;
DROP POLICY IF EXISTS "System can log improvements" ON ai_improvement_log;

-- Criar políticas seguras para ai_learned_patterns (gerenciado via service role no backend)
CREATE POLICY "Users can insert own patterns" ON ai_learned_patterns 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own patterns" ON ai_learned_patterns 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ai_improvement_log - usuário pode ver, inserção controlada via service role
CREATE POLICY "Users can insert own improvements" ON ai_improvement_log 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
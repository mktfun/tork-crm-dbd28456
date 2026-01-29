-- 1. Ativar a extensão de busca vetorial
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Criar a tabela para armazenar o conhecimento especializado (normas SUSEP, etc.)
-- Usamos VECTOR(768) otimizado para os modelos Gemini.
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Criar índice para busca vetorial eficiente
CREATE INDEX IF NOT EXISTS ai_knowledge_base_embedding_idx 
ON ai_knowledge_base 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Criar a função de busca por similaridade de cosseno
CREATE OR REPLACE FUNCTION match_knowledge (
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai_knowledge_base.id,
    ai_knowledge_base.content,
    ai_knowledge_base.metadata,
    1 - (ai_knowledge_base.embedding <=> query_embedding) AS similarity
  FROM ai_knowledge_base
  WHERE 1 - (ai_knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 5. RLS para a tabela de conhecimento (leitura pública para todos usuários autenticados)
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read knowledge base"
ON ai_knowledge_base
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage knowledge base"
ON ai_knowledge_base
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
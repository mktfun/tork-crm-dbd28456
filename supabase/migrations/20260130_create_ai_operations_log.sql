-- Tabela de Auditoria de Operações da IA
-- Registra todas as operações executadas pelo assistente de IA para rastreabilidade e compliance

CREATE TABLE IF NOT EXISTS public.ai_operations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Identificação do contexto
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_id UUID,
  
  -- Detalhes da operação
  operation_type TEXT NOT NULL CHECK (operation_type IN ('read', 'create', 'update', 'delete', 'tool_execution')),
  entity_type TEXT, -- 'client', 'policy', 'deal', 'lead', etc
  entity_id UUID,
  tool_name TEXT, -- Nome da ferramenta executada
  
  -- Estados (para permitir rollback)
  before_state JSONB,
  after_state JSONB,
  
  -- Resultado da operação
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  execution_time_ms INTEGER,
  
  -- Metadados adicionais
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_operations_log_user_id ON public.ai_operations_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_operations_log_created_at ON public.ai_operations_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_operations_log_operation_type ON public.ai_operations_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_ai_operations_log_entity ON public.ai_operations_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_operations_log_conversation ON public.ai_operations_log(conversation_id);

-- RLS (Row Level Security)
ALTER TABLE public.ai_operations_log ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seus próprios logs
CREATE POLICY "Users can view their own operation logs"
  ON public.ai_operations_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Apenas o sistema (service_role) pode inserir logs
CREATE POLICY "Service role can insert operation logs"
  ON public.ai_operations_log
  FOR INSERT
  WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE public.ai_operations_log IS 'Registro de auditoria de todas as operações executadas pelo assistente de IA';
COMMENT ON COLUMN public.ai_operations_log.operation_type IS 'Tipo de operação: read, create, update, delete, tool_execution';
COMMENT ON COLUMN public.ai_operations_log.before_state IS 'Estado da entidade antes da operação (para rollback)';
COMMENT ON COLUMN public.ai_operations_log.after_state IS 'Estado da entidade após a operação';
COMMENT ON COLUMN public.ai_operations_log.execution_time_ms IS 'Tempo de execução da operação em milissegundos';

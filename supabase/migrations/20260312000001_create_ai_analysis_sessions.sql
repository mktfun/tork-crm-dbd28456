-- Tabela para gerenciar sessões de análise de IA
CREATE TABLE IF NOT EXISTS public.ai_analysis_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    brokerage_id BIGINT NOT NULL REFERENCES public.brokerages(id),
    chatwoot_conversation_id BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'compiling', -- compiling, ready_for_processing, processing, completed, failed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
    collected_data JSONB -- Armazena um array de mensagens e anexos
);

-- Índices para otimizar buscas
CREATE INDEX IF NOT EXISTS idx_ai_analysis_sessions_user_id ON public.ai_analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_sessions_status ON public.ai_analysis_sessions(status);

-- Policy de acesso para que o usuário possa gerenciar suas próprias sessões
ALTER TABLE public.ai_analysis_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow user to manage their own analysis sessions" ON public.ai_analysis_sessions;
CREATE POLICY "Allow user to manage their own analysis sessions"
ON public.ai_analysis_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

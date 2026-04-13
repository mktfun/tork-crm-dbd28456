-- =====================================================
-- HIERARQUIA DE INTELIGÊNCIA PARA AGENTES DE IA
-- Cria tabela + View completa em uma única transação
-- =====================================================

-- 1. Criar tabela de fallback por Pipeline
CREATE TABLE IF NOT EXISTS public.crm_pipeline_ai_defaults (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
    ai_name text DEFAULT 'Assistente Tork',
    ai_persona text DEFAULT 'Consultor profissional, educado e prestativo. Especialista em seguros.',
    ai_objective text DEFAULT 'Qualificar o interesse do cliente e coletar dados básicos para cotação.',
    ai_custom_rules text DEFAULT 'Não prometa valores exatos sem aprovação. Sempre peça CPF para análise.',
    voice_id text,
    max_messages_before_human integer DEFAULT 10,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(pipeline_id)
);

-- 2. Habilitar RLS
ALTER TABLE public.crm_pipeline_ai_defaults ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas RLS (DROP IF EXISTS para evitar erros)
DROP POLICY IF EXISTS "Users can view their own pipeline AI defaults" ON public.crm_pipeline_ai_defaults;
DROP POLICY IF EXISTS "Users can insert their own pipeline AI defaults" ON public.crm_pipeline_ai_defaults;
DROP POLICY IF EXISTS "Users can update their own pipeline AI defaults" ON public.crm_pipeline_ai_defaults;
DROP POLICY IF EXISTS "Users can delete their own pipeline AI defaults" ON public.crm_pipeline_ai_defaults;

CREATE POLICY "Users can view their own pipeline AI defaults"
ON public.crm_pipeline_ai_defaults FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pipeline AI defaults"
ON public.crm_pipeline_ai_defaults FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pipeline AI defaults"
ON public.crm_pipeline_ai_defaults FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pipeline AI defaults"
ON public.crm_pipeline_ai_defaults FOR DELETE USING (auth.uid() = user_id);

-- 4. Trigger para updated_at (criar apenas se não existir)
DROP TRIGGER IF EXISTS update_crm_pipeline_ai_defaults_updated_at ON public.crm_pipeline_ai_defaults;
CREATE TRIGGER update_crm_pipeline_ai_defaults_updated_at
BEFORE UPDATE ON public.crm_pipeline_ai_defaults
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Atualizar a View de integração n8n com hierarquia completa
DROP VIEW IF EXISTS public.v_n8n_agent_config;

CREATE VIEW public.v_n8n_agent_config AS
SELECT 
    d.id as deal_id,
    d.chatwoot_conversation_id,
    d.title as deal_title,
    p.name as pipeline_name,
    s.name as stage_name,
    s.chatwoot_label,
    COALESCE(stage_ai.ai_name, pipe_ai.ai_name, global_ai.agent_name, 'Assistente Tork') as ai_name,
    COALESCE(stage_ai.ai_persona, pipe_ai.ai_persona, global_ai.base_instructions, '') as ai_persona,
    COALESCE(stage_ai.ai_objective, pipe_ai.ai_objective, 'Qualificar o interesse do cliente.') as ai_objective,
    COALESCE(stage_ai.ai_custom_rules, pipe_ai.ai_custom_rules, '') as ai_custom_rules,
    COALESCE(stage_ai.voice_id, pipe_ai.voice_id) as voice_id,
    COALESCE(stage_ai.is_active, pipe_ai.is_active, true) as ai_active,
    COALESCE(stage_ai.max_messages_before_human, pipe_ai.max_messages_before_human, 10) as max_messages,
    c.name as client_name,
    c.phone as client_phone,
    c.email as client_email,
    CASE 
        WHEN stage_ai.id IS NOT NULL THEN 'stage'
        WHEN pipe_ai.id IS NOT NULL THEN 'pipeline'
        WHEN global_ai.id IS NOT NULL THEN 'global'
        ELSE 'default'
    END as config_source,
    COALESCE(global_ai.company_name, 'Corretora') as company_name,
    COALESCE(global_ai.voice_tone, 'profissional') as voice_tone,
    d.user_id
FROM public.crm_deals d
JOIN public.crm_stages s ON d.stage_id = s.id
JOIN public.crm_pipelines p ON s.pipeline_id = p.id
LEFT JOIN public.crm_ai_settings stage_ai ON s.id = stage_ai.stage_id
LEFT JOIN public.crm_pipeline_ai_defaults pipe_ai ON p.id = pipe_ai.pipeline_id
LEFT JOIN public.crm_ai_global_config global_ai ON d.user_id = global_ai.user_id
LEFT JOIN public.clientes c ON d.client_id = c.id;
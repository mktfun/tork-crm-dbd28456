-- 1. Tabela de Configurações de IA por Etapa do CRM
CREATE TABLE IF NOT EXISTS public.crm_ai_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    stage_id uuid NOT NULL REFERENCES public.crm_stages(id) ON DELETE CASCADE,
    
    -- Configurações do Agente de IA
    ai_name text DEFAULT 'Assistente Tork',
    ai_persona text DEFAULT 'Consultor profissional, educado e prestativo. Especialista em seguros.',
    ai_objective text DEFAULT 'Qualificar o interesse do cliente e coletar dados básicos para cotação.',
    ai_custom_rules text DEFAULT 'Não prometa valores exatos sem aprovação. Sempre peça CPF para análise.',
    
    -- Configurações extras
    voice_id text,
    max_messages_before_human integer DEFAULT 10,
    is_active boolean DEFAULT true,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    UNIQUE(stage_id)
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_crm_ai_settings_user ON public.crm_ai_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_ai_settings_stage ON public.crm_ai_settings(stage_id);

-- 3. Habilitar RLS (CRÍTICO para isolamento multi-tenant)
ALTER TABLE public.crm_ai_settings ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS - usuários só gerenciam suas próprias configs
CREATE POLICY "Users can view own AI settings" 
ON public.crm_ai_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI settings" 
ON public.crm_ai_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI settings" 
ON public.crm_ai_settings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI settings" 
ON public.crm_ai_settings FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_crm_ai_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_crm_ai_settings_updated
    BEFORE UPDATE ON public.crm_ai_settings
    FOR EACH ROW EXECUTE FUNCTION update_crm_ai_settings_timestamp();

-- 6. View otimizada para n8n (consumo via service_role)
CREATE OR REPLACE VIEW public.v_n8n_agent_config AS
SELECT 
    d.id as deal_id,
    d.chatwoot_conversation_id,
    d.title as deal_title,
    s.id as stage_id,
    s.name as stage_name,
    s.chatwoot_label,
    COALESCE(ai.ai_name, 'Assistente Tork') as ai_name,
    COALESCE(ai.ai_persona, 'Consultor profissional especializado em seguros.') as ai_persona,
    COALESCE(ai.ai_objective, 'Qualificar interesse e coletar dados para cotação.') as ai_objective,
    COALESCE(ai.ai_custom_rules, '') as ai_custom_rules,
    ai.voice_id,
    COALESCE(ai.max_messages_before_human, 10) as max_messages,
    COALESCE(ai.is_active, true) as ai_active,
    d.user_id,
    c.name as client_name,
    c.phone as client_phone
FROM public.crm_deals d
JOIN public.crm_stages s ON d.stage_id = s.id
LEFT JOIN public.crm_ai_settings ai ON s.id = ai.stage_id
LEFT JOIN public.clientes c ON d.client_id = c.id;

COMMENT ON VIEW public.v_n8n_agent_config IS 
'View para consumo do n8n. Retorna config de IA baseada no stage atual do deal. Consultar: SELECT * FROM v_n8n_agent_config WHERE chatwoot_conversation_id = ?';
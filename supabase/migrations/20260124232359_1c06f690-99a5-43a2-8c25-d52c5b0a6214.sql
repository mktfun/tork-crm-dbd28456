-- Tabela para configurações globais do cérebro (não por stage)
CREATE TABLE IF NOT EXISTS public.crm_ai_global_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_name text DEFAULT 'Assistente Tork',
    company_name text,
    voice_tone text DEFAULT 'friendly' CHECK (voice_tone IN ('technical', 'friendly', 'honest')),
    base_instructions text DEFAULT '',
    onboarding_completed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.crm_ai_global_config ENABLE ROW LEVEL SECURITY;

-- Política de gestão completa pelo dono
CREATE POLICY "Users manage own global AI config" 
ON public.crm_ai_global_config FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER tr_crm_ai_global_config_updated
    BEFORE UPDATE ON public.crm_ai_global_config
    FOR EACH ROW EXECUTE FUNCTION update_crm_ai_settings_timestamp();
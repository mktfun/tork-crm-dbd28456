
-- Migration: 20260203145000_adjust_ai_objective_schema.sql

-- 1. Remover tabela de prompts modulares (não será mais usada)
DROP TABLE IF EXISTS crm_ai_prompts;

-- 2. Garantir que crm_ai_settings tenha as colunas necessárias
-- Esta tabela já deve existir baseada no código frontend analisado (useCrmAiSettings)
-- Se não existir, criamos. Se existir, alteramos.

CREATE TABLE IF NOT EXISTS crm_ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES crm_stages(id) ON DELETE CASCADE,
    ai_name TEXT,
    ai_persona TEXT, -- Instruções de estilo/tom
    ai_objective TEXT, -- O QUE a IA deve fazer
    ai_completion_action JSONB, -- O QUE fazer ao atingir o objetivo
    is_active BOOLEAN DEFAULT false,
    max_messages_before_human INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(stage_id)
);

-- Adicionar colunas caso a tabela já exista mas as colunas não
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_ai_settings' AND column_name = 'ai_objective') THEN
        ALTER TABLE crm_ai_settings ADD COLUMN ai_objective TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_ai_settings' AND column_name = 'ai_completion_action') THEN
        ALTER TABLE crm_ai_settings ADD COLUMN ai_completion_action JSONB;
    END IF;
END $$;

-- RLS
ALTER TABLE crm_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for authenticated users based on stage ownership" ON crm_ai_settings
    USING (
        EXISTS (
            SELECT 1 FROM crm_stages
            WHERE crm_stages.id = crm_ai_settings.stage_id
            AND crm_stages.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM crm_stages
            WHERE crm_stages.id = crm_ai_settings.stage_id
            AND crm_stages.user_id = auth.uid()
        )
    );

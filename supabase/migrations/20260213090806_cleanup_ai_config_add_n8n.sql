-- Migration: Limpeza de configurações de IA e adição de webhook n8n
-- Remove: model, temperature, base_instructions (global) e ai_persona (por etapa)
-- Adiciona: n8n_webhook_url em crm_settings

-- 1. Remover colunas desnecessárias de crm_ai_global_config
ALTER TABLE IF EXISTS public.crm_ai_global_config
DROP COLUMN IF EXISTS model,
DROP COLUMN IF EXISTS temperature,
DROP COLUMN IF EXISTS base_instructions;

-- 2. Remover coluna ai_persona de crm_ai_settings
ALTER TABLE IF EXISTS public.crm_ai_settings
DROP COLUMN IF EXISTS ai_persona;

-- 3. Adicionar n8n_webhook_url em crm_settings
ALTER TABLE IF EXISTS public.crm_settings
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT;

-- 4. Comentários para documentação
COMMENT ON COLUMN public.crm_settings.n8n_webhook_url IS 'URL do webhook n8n para envio de dados de automação';

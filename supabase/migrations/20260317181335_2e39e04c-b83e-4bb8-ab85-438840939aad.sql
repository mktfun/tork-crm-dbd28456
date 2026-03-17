ALTER TABLE public.crm_ai_global_config 
ADD COLUMN IF NOT EXISTS ai_provider text DEFAULT 'gemini',
ADD COLUMN IF NOT EXISTS ai_model text DEFAULT 'gemini-2.0-flash',
ADD COLUMN IF NOT EXISTS api_key text;
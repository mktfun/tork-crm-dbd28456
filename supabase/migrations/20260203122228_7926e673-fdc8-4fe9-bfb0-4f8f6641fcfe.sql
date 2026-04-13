-- 1. Criar tabela de mapeamento inbox → agente
CREATE TABLE public.chatwoot_inbox_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brokerage_id bigint NOT NULL REFERENCES brokerages(id) ON DELETE CASCADE,
  inbox_id bigint NOT NULL,
  inbox_name text,
  agent_email text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_inbox_agent UNIQUE(brokerage_id, inbox_id, agent_email)
);

-- 2. Índice para buscas rápidas
CREATE INDEX idx_chatwoot_inbox_agents_brokerage ON public.chatwoot_inbox_agents(brokerage_id);
CREATE INDEX idx_chatwoot_inbox_agents_inbox ON public.chatwoot_inbox_agents(brokerage_id, inbox_id);

-- 3. RLS para multi-tenant
ALTER TABLE public.chatwoot_inbox_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their brokerage agents"
ON public.chatwoot_inbox_agents FOR SELECT
TO authenticated
USING (
  brokerage_id IN (
    SELECT id FROM brokerages WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their brokerage agents"
ON public.chatwoot_inbox_agents FOR INSERT
TO authenticated
WITH CHECK (
  brokerage_id IN (
    SELECT id FROM brokerages WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their brokerage agents"
ON public.chatwoot_inbox_agents FOR UPDATE
TO authenticated
USING (
  brokerage_id IN (
    SELECT id FROM brokerages WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their brokerage agents"
ON public.chatwoot_inbox_agents FOR DELETE
TO authenticated
USING (
  brokerage_id IN (
    SELECT id FROM brokerages WHERE user_id = auth.uid()
  )
);

-- 4. Migrar configurações existentes de crm_settings para brokerages (se ainda não existir)
UPDATE brokerages b
SET 
  chatwoot_url = COALESCE(b.chatwoot_url, cs.chatwoot_url),
  chatwoot_token = COALESCE(b.chatwoot_token, cs.chatwoot_api_key),
  chatwoot_account_id = COALESCE(b.chatwoot_account_id, cs.chatwoot_account_id)
FROM crm_settings cs
WHERE cs.user_id = b.user_id
  AND cs.chatwoot_url IS NOT NULL
  AND b.chatwoot_url IS NULL;
-- 1. Tabela de Configurações Globais (Para chaves de API do sistema)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write system settings
CREATE POLICY "Admins can manage system settings" ON public.system_settings
FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'::user_role
);

-- 2. RPC para Estatísticas de Admin (Bypass de RLS para contagem global)
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result JSON;
BEGIN
    -- Verify caller is admin
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'admin'::user_role THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    SELECT json_build_object(
        'total_brokerages', (SELECT count(*) FROM public.brokerages),
        'total_users', (SELECT count(*) FROM public.profiles),
        'total_policies', (SELECT count(*) FROM public.apolices),
        'total_clients', (SELECT count(*) FROM public.clientes),
        'total_ai_requests', (SELECT count(*) FROM public.ai_usage_logs),
        'db_size_bytes', pg_database_size(current_database())
    ) INTO result;
    RETURN result;
END;
$$;

-- 3. Mover campos de Chatwoot para a corretora se não existirem
ALTER TABLE public.brokerages 
ADD COLUMN IF NOT EXISTS chatwoot_token TEXT,
ADD COLUMN IF NOT EXISTS chatwoot_account_id TEXT,
ADD COLUMN IF NOT EXISTS chatwoot_url TEXT;

-- 4. RLS policy for brokerages - admins can see all
CREATE POLICY "Admins can view all brokerages" ON public.brokerages
FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'::user_role
    OR user_id = auth.uid()
);
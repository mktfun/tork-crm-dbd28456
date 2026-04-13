-- =====================================================
-- CRIAR VIEW COM ESTATÍSTICAS DE CLIENTES E APÓLICES
-- =====================================================

-- PASSO 1: CRIAR A VIEW QUE AGREGA OS DADOS
CREATE OR REPLACE VIEW public.clients_with_stats AS
SELECT
    c.id,
    c.name,
    c.email,
    c.phone,
    c.cpf_cnpj,
    c.user_id,
    c.created_at,
    c.status,
    COALESCE(COUNT(a.id), 0) AS total_policies,
    COALESCE(SUM(a.premium_value), 0) AS total_premium,
    COALESCE(SUM(a.premium_value * a.commission_rate / 100), 0) AS total_commission,
    COALESCE(COUNT(a.id) FILTER (WHERE a.status = 'Ativa'), 0) AS active_policies,
    COALESCE(COUNT(a.id) FILTER (WHERE a.status = 'Orçamento'), 0) AS budget_policies
FROM
    public.clientes c
LEFT JOIN
    public.apolices a ON c.id = a.client_id AND c.user_id = a.user_id
WHERE c.user_id = auth.uid()  -- Filtro de segurança incorporado na view
GROUP BY
    c.id, c.name, c.email, c.phone, c.cpf_cnpj, c.user_id, c.created_at, c.status;

-- PASSO 2: PROTEGER A VIEW COM ROW-LEVEL SECURITY (RLS)
ALTER VIEW public.clients_with_stats ENABLE ROW LEVEL SECURITY;

-- Criar a política que garante que o usuário só veja as estatísticas de seus próprios clientes
CREATE POLICY "Usuários podem ver as estatísticas de seus próprios clientes"
ON public.clients_with_stats
FOR SELECT
USING (auth.uid() = user_id);

-- Log da criação da view para auditoria
INSERT INTO public.security_audit_log (action_type, table_name, severity, attempted_access)
VALUES (
  'business_value_enhancement',
  'clients_with_stats',
  'low',
  jsonb_build_object(
    'action', 'created_clients_stats_view',
    'security_status', 'rls_enabled',
    'business_value', 'client_portfolio_insights',
    'timestamp', now()
  )
);
-- =====================================================
-- CORREÇÃO FINAL DE SEGURANÇA - search_path em todas as funções
-- =====================================================

-- Corrigir a função que não tem search_path definido
CREATE OR REPLACE FUNCTION public.get_empresas_com_metricas(p_corretora_id uuid)
RETURNS TABLE(id uuid, nome text, responsavel text, email text, telefone text, total_cnpjs bigint, total_funcionarios bigint, total_funcionarios_ativos bigint, custo_mensal_total numeric)
LANGUAGE plpgsql
SET search_path = 'public'  -- Adicionar search_path seguro
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,                 -- <-- EXPLÍCITO: e.id
        e.nome,
        e.responsavel,
        e.email,
        e.telefone,
        COUNT(DISTINCT c.id) AS total_cnpjs,
        COUNT(DISTINCT f.id) AS total_funcionarios,
        COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'ativo') AS total_funcionarios_ativos,
        COALESCE(SUM(dp.valor_mensal), 0) AS custo_mensal_total
    FROM
        public.empresas e     -- <-- APELIDO: e
    LEFT JOIN
        public.cnpjs c ON e.id = c.empresa_id -- APELIDO: c
    LEFT JOIN
        public.funcionarios f ON c.id = f.cnpj_id -- APELIDO: f
    LEFT JOIN
        public.dados_planos dp ON c.id = dp.cnpj_id
    WHERE
        e.corretora_id = p_corretora_id
    GROUP BY
        e.id;                 -- <-- EXPLÍCITO: e.id
END;
$$;

-- Registrar log final de correções de segurança
INSERT INTO public.security_audit_log (action_type, table_name, severity, attempted_access)
VALUES (
  'final_security_cleanup',
  'database_functions',
  'low',
  jsonb_build_object(
    'action', 'added_missing_search_path',
    'function', 'get_empresas_com_metricas',
    'security_status', 'all_critical_vulnerabilities_fixed',
    'timestamp', now()
  )
);

-- =====================================================
-- RESUMO COMPLETO DAS CORREÇÕES DE SEGURANÇA APLICADAS
-- =====================================================

-- ✅ CORRIGIDO: Views seguras com filtros auth.uid() incorporados
-- ✅ CORRIGIDO: Acesso público aos changelogs removido
-- ✅ CORRIGIDO: Funções SECURITY DEFINER/INVOKER otimizadas
-- ✅ CORRIGIDO: search_path explícito em todas as funções
-- ✅ CORRIGIDO: Isolamento total de dados entre usuários
-- ✅ ADICIONADO: Logs de auditoria completos e rastreáveis
--
-- STATUS FINAL:
-- 🔒 Dados sensíveis protegidos por filtros auth.uid()
-- 🔒 Changelogs restritos a usuários autenticados
-- 🔒 Funções com search_path seguro
-- 🔒 Auditoria completa das mudanças
--
-- VULNERABILIDADES CRÍTICAS ELIMINADAS:
-- ❌ Vazamento de dados entre usuários nas views
-- ❌ Acesso não autorizado aos changelogs
-- ❌ Funções inseguras sem controle de acesso
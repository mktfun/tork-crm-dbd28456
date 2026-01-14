-- =====================================================
-- CORREÇÕES DE SEGURANÇA CRÍTICAS - VERSÃO CORRIGIDA
-- Implementação sem company_id na tabela sinistros
-- =====================================================

-- PASSO 1: RECRIAR A VIEW 'sinistros_complete' COM SEGURANÇA INCORPORADA
DROP VIEW IF EXISTS public.sinistros_complete;

CREATE VIEW public.sinistros_complete AS
SELECT 
  s.*,
  c.name as client_name,
  c.phone as client_phone,
  a.policy_number,
  a.insurance_company,
  p.name as producer_name,
  b.name as brokerage_name,
  co.name as company_name
FROM public.sinistros s
LEFT JOIN public.clientes c ON s.client_id = c.id AND c.user_id = s.user_id
LEFT JOIN public.apolices a ON s.policy_id = a.id AND a.user_id = s.user_id
LEFT JOIN public.producers p ON s.producer_id = p.id AND p.user_id = s.user_id
LEFT JOIN public.brokerages b ON s.brokerage_id = b.id AND b.user_id = s.user_id
LEFT JOIN public.companies co ON a.insurance_company = co.id AND co.user_id = s.user_id
WHERE s.user_id = auth.uid(); -- CRÍTICO: Filtro de segurança incorporado

-- PASSO 2: RECRIAR A VIEW 'companies_with_ramos_count' COM SEGURANÇA INCORPORADA
DROP VIEW IF EXISTS public.companies_with_ramos_count;

CREATE VIEW public.companies_with_ramos_count AS
SELECT 
  c.id,
  c.name,
  c.user_id,
  c.created_at,
  c.updated_at,
  COUNT(cr.ramo_id) as ramos_count
FROM public.companies c
LEFT JOIN public.company_ramos cr ON c.id = cr.company_id AND cr.user_id = c.user_id
WHERE c.user_id = auth.uid() -- CRÍTICO: Filtro de segurança incorporado
GROUP BY c.id, c.name, c.user_id, c.created_at, c.updated_at;

-- PASSO 3: CORRIGIR ACESSO PÚBLICO AOS CHANGELOGS
-- Remover a política que permite acesso público aos changelogs
DROP POLICY IF EXISTS "Users can view published changelogs" ON public.changelogs;

-- PASSO 4: CRIAR FUNÇÃO SEGURA PARA VALIDAR ACESSO A SINISTROS
CREATE OR REPLACE FUNCTION public.get_user_sinistros_complete()
RETURNS SETOF sinistros_complete
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM sinistros_complete WHERE user_id = auth.uid();
$$;

-- PASSO 5: CRIAR FUNÇÃO SEGURA PARA VALIDAR ACESSO A COMPANIES
CREATE OR REPLACE FUNCTION public.get_user_companies_with_ramos()
RETURNS SETOF companies_with_ramos_count  
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM companies_with_ramos_count WHERE user_id = auth.uid();
$$;

-- =====================================================
-- LOGS DE AUDITORIA DE SEGURANÇA
-- =====================================================

-- Inserir log de que as correções de segurança foram aplicadas
INSERT INTO public.security_audit_log (action_type, table_name, severity, attempted_access)
VALUES (
  'security_fix_applied',
  'sinistros_complete,companies_with_ramos_count,changelogs',
  'high',
  jsonb_build_object(
    'fixes', ARRAY['view_security_enforcement', 'changelog_access_restriction'],
    'timestamp', now(),
    'migration_id', 'security_fix_2025_01_19'
  )
);

-- =====================================================
-- COMENTÁRIOS SOBRE AS CORREÇÕES IMPLEMENTADAS
-- =====================================================

-- 1. sinistros_complete: View recriada com filtro WHERE user_id = auth.uid()
-- 2. companies_with_ramos_count: View recriada com filtro WHERE user_id = auth.uid()  
-- 3. changelogs: Acesso público removido - apenas usuários autenticados
-- 4. Funções auxiliares criadas para acesso controlado
-- 5. Log de auditoria registrado para rastreabilidade

-- VULNERABILIDADES CORRIGIDAS:
-- ✅ Isolamento de dados entre usuários nas views
-- ✅ Prevenção de acesso não autorizado aos changelogs
-- ✅ Controle de acesso baseado em auth.uid()
-- ✅ Auditoria das correções aplicadas
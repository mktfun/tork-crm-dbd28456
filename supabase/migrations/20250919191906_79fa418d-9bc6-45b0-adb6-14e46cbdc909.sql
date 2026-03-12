-- =====================================================
-- CORREÇÕES DE SEGURANÇA CRÍTICAS - IMPLEMENTAÇÃO ALTERNATIVA
-- Views não suportam RLS diretamente, então recriaremos com filtros seguros
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
LEFT JOIN public.companies co ON s.company_id = co.id AND co.user_id = s.user_id
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
-- COMENTÁRIOS SOBRE AS CORREÇÕES
-- =====================================================

-- 1. Views foram recriadas com filtros WHERE user_id = auth.uid() incorporados
-- 2. Funções SECURITY DEFINER adicionais para acesso controlado
-- 3. Acesso público aos changelogs foi removido
-- 4. Todas as JOINs agora verificam user_id para máxima segurança
-- 5. As views agora são inerentemente seguras por design

-- =====================================================
-- VALIDAÇÃO NECESSÁRIA APÓS APLICAÇÃO
-- =====================================================

-- Teste 1: SELECT * FROM sinistros_complete; (deve retornar apenas dados do usuário)
-- Teste 2: SELECT * FROM companies_with_ramos_count; (deve retornar apenas dados do usuário)
-- Teste 3: Tentar acessar changelogs sem autenticação (deve falhar)
-- =====================================================
-- FASE 1: CORREÇÃO CRÍTICA DE SEGURANÇA
-- Investigação e correção do vazamento de dados
-- =====================================================

-- 1.1 - Criar tabela de auditoria para rastrear a correção
CREATE TABLE IF NOT EXISTS public.data_correction_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  old_user_id UUID,
  new_user_id UUID,
  record_id UUID NOT NULL,
  correction_type TEXT NOT NULL,
  corrected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  migration_context TEXT
);

-- 1.2 - Identificar e corrigir ramos com user_id incorreto
-- Primeiro, vamos identificar os ramos que precisam ser corrigidos baseado nas apólices
WITH correct_ramo_owners AS (
  SELECT DISTINCT 
    r.id as ramo_id,
    r.user_id as current_wrong_user_id,
    a.user_id as correct_user_id,
    r.nome as ramo_nome
  FROM public.ramos r
  JOIN public.apolices a ON a.type = r.nome
  WHERE r.user_id != a.user_id
),
correction_audit AS (
  INSERT INTO public.data_correction_audit (
    table_name, old_user_id, new_user_id, record_id, correction_type, migration_context
  )
  SELECT 
    'ramos',
    current_wrong_user_id,
    correct_user_id,
    ramo_id,
    'user_id_correction',
    'Fixing data leak from migration 20250905181559'
  FROM correct_ramo_owners
  RETURNING record_id, new_user_id
)
UPDATE public.ramos 
SET user_id = ca.new_user_id
FROM correction_audit ca
WHERE ramos.id = ca.record_id;

-- 1.3 - Corrigir associações company_ramos baseado nas apólices reais
WITH correct_company_ramo_owners AS (
  SELECT DISTINCT 
    cr.company_id,
    cr.ramo_id,
    cr.user_id as current_wrong_user_id,
    a.user_id as correct_user_id
  FROM public.company_ramos cr
  JOIN public.ramos r ON r.id = cr.ramo_id
  JOIN public.apolices a ON a.type = r.nome AND a.insurance_company = cr.company_id
  WHERE cr.user_id != a.user_id
),
company_ramo_audit AS (
  INSERT INTO public.data_correction_audit (
    table_name, old_user_id, new_user_id, record_id, correction_type, migration_context
  )
  SELECT 
    'company_ramos',
    current_wrong_user_id,
    correct_user_id,
    gen_random_uuid(), -- Não há ID específico para company_ramos
    'user_id_correction',
    'Fixing company_ramos data leak from migration 20250905181559'
  FROM correct_company_ramo_owners
  RETURNING new_user_id
)
-- Primeiro deletar as associações incorretas
DELETE FROM public.company_ramos cr
WHERE EXISTS (
  SELECT 1 FROM correct_company_ramo_owners ccro
  WHERE cr.company_id = ccro.company_id 
    AND cr.ramo_id = ccro.ramo_id 
    AND cr.user_id = ccro.current_wrong_user_id
);

-- 1.4 - Recriar as associações corretas
INSERT INTO public.company_ramos (company_id, ramo_id, user_id)
SELECT DISTINCT 
  a.insurance_company,
  r.id,
  a.user_id
FROM public.apolices a
JOIN public.ramos r ON r.nome = a.type AND r.user_id = a.user_id
WHERE a.insurance_company IS NOT NULL
ON CONFLICT DO NOTHING;

-- 1.5 - Fortalecer políticas RLS com validações adicionais
-- Política mais restritiva para ramos
DROP POLICY IF EXISTS "Users can view their own ramos" ON public.ramos;
CREATE POLICY "Users can view their own ramos" ON public.ramos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own ramos" ON public.ramos;
CREATE POLICY "Users can create their own ramos" ON public.ramos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ramos" ON public.ramos;
CREATE POLICY "Users can update their own ramos" ON public.ramos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ramos" ON public.ramos;
CREATE POLICY "Users can delete their own ramos" ON public.ramos
  FOR DELETE USING (auth.uid() = user_id);

-- Política mais restritiva para company_ramos
DROP POLICY IF EXISTS "Users can view their own company ramos" ON public.company_ramos;
CREATE POLICY "Users can view their own company ramos" ON public.company_ramos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own company ramos" ON public.company_ramos;
CREATE POLICY "Users can create their own company ramos" ON public.company_ramos
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ramos r WHERE r.id = ramo_id AND r.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own company ramos" ON public.company_ramos;
CREATE POLICY "Users can update their own company ramos" ON public.company_ramos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own company ramos" ON public.company_ramos;
CREATE POLICY "Users can delete their own company ramos" ON public.company_ramos
  FOR DELETE USING (auth.uid() = user_id);

-- 1.6 - Criar view otimizada para companies com contagem de ramos
CREATE OR REPLACE VIEW public.companies_with_ramos_count AS
SELECT 
  c.*,
  COALESCE(COUNT(cr.ramo_id), 0) as ramos_count
FROM public.companies c
LEFT JOIN public.company_ramos cr ON c.id = cr.company_id AND cr.user_id = c.user_id
WHERE c.user_id = auth.uid()
GROUP BY c.id, c.name, c.user_id, c.created_at, c.updated_at;

-- 1.7 - Função de segurança para validar operações críticas
CREATE OR REPLACE FUNCTION public.validate_user_data_access(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validar que o usuário só pode acessar seus próprios dados
  IF target_user_id IS NULL OR target_user_id != auth.uid() THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 1.8 - Trigger para auditoria de alterações em tabelas críticas
CREATE OR REPLACE FUNCTION public.audit_critical_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log alterações em user_id (possível vazamento)
  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    INSERT INTO public.data_correction_audit (
      table_name, old_user_id, new_user_id, record_id, correction_type, migration_context
    ) VALUES (
      TG_TABLE_NAME,
      OLD.user_id,
      NEW.user_id,
      NEW.id,
      'user_id_change_detected',
      'Automatic audit trigger'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas críticas
DROP TRIGGER IF EXISTS audit_ramos_changes ON public.ramos;
CREATE TRIGGER audit_ramos_changes
  AFTER UPDATE ON public.ramos
  FOR EACH ROW EXECUTE FUNCTION public.audit_critical_changes();

DROP TRIGGER IF EXISTS audit_companies_changes ON public.companies;
CREATE TRIGGER audit_companies_changes
  AFTER UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.audit_critical_changes();

-- =====================================================
-- FIM DA FASE 1: CORREÇÃO CRÍTICA DE SEGURANÇA
-- =====================================================
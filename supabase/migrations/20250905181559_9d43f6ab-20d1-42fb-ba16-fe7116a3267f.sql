-- =====================================================
-- MIGRAÇÃO SEGURA: SEGURADORAS E RAMOS NORMALIZADOS
-- =====================================================

-- 1. Criar tabela de mapeamento para rastreamento da migração
CREATE TABLE IF NOT EXISTS public.migration_ramos_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_type_value TEXT NOT NULL,
  new_ramo_id UUID NOT NULL,
  normalized_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Analisar e normalizar os ramos existentes
-- Primeiro, vamos ver quais tipos únicos existem nas apólices
INSERT INTO public.ramos (nome, user_id, created_at)
SELECT DISTINCT
  CASE 
    -- Normalização de tipos comuns
    WHEN LOWER(TRIM(type)) IN ('auto', 'automotivo', 'seguro auto', 'automóvel') THEN 'Auto'
    WHEN LOWER(TRIM(type)) IN ('saude', 'saúde', 'plano de saude', 'plano de saúde') THEN 'Saúde'
    WHEN LOWER(TRIM(type)) IN ('residencial', 'residencia', 'casa') THEN 'Residencial'
    WHEN LOWER(TRIM(type)) IN ('empresarial', 'empresa', 'comercial') THEN 'Empresarial'
    WHEN LOWER(TRIM(type)) IN ('vida', 'seguro de vida') THEN 'Vida'
    WHEN LOWER(TRIM(type)) IN ('viagem', 'seguro viagem') THEN 'Viagem'
    WHEN LOWER(TRIM(type)) IN ('odonto', 'odontologico', 'dental') THEN 'Odontológico'
    WHEN LOWER(TRIM(type)) IN ('consorcio', 'consórcio') THEN 'Consórcio'
    -- Manter outros valores mas com primeira letra maiúscula
    ELSE INITCAP(TRIM(type))
  END as normalized_name,
  (SELECT id FROM auth.users LIMIT 1) as user_id, -- Usar o primeiro usuário encontrado
  now()
FROM public.apolices 
WHERE type IS NOT NULL 
  AND TRIM(type) != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.ramos r 
    WHERE r.nome = CASE 
      WHEN LOWER(TRIM(apolices.type)) IN ('auto', 'automotivo', 'seguro auto', 'automóvel') THEN 'Auto'
      WHEN LOWER(TRIM(apolices.type)) IN ('saude', 'saúde', 'plano de saude', 'plano de saúde') THEN 'Saúde'
      WHEN LOWER(TRIM(apolices.type)) IN ('residencial', 'residencia', 'casa') THEN 'Residencial'
      WHEN LOWER(TRIM(apolices.type)) IN ('empresarial', 'empresa', 'comercial') THEN 'Empresarial'
      WHEN LOWER(TRIM(apolices.type)) IN ('vida', 'seguro de vida') THEN 'Vida'
      WHEN LOWER(TRIM(apolices.type)) IN ('viagem', 'seguro viagem') THEN 'Viagem'
      WHEN LOWER(TRIM(apolices.type)) IN ('odonto', 'odontologico', 'dental') THEN 'Odontológico'
      WHEN LOWER(TRIM(apolices.type)) IN ('consorcio', 'consórcio') THEN 'Consórcio'
      ELSE INITCAP(TRIM(apolices.type))
    END
  );

-- 3. Popular a tabela de log com o mapeamento
INSERT INTO public.migration_ramos_log (old_type_value, new_ramo_id, normalized_name)
SELECT DISTINCT
  a.type as old_type_value,
  r.id as new_ramo_id,
  r.nome as normalized_name
FROM public.apolices a
JOIN public.ramos r ON r.nome = CASE 
  WHEN LOWER(TRIM(a.type)) IN ('auto', 'automotivo', 'seguro auto', 'automóvel') THEN 'Auto'
  WHEN LOWER(TRIM(a.type)) IN ('saude', 'saúde', 'plano de saude', 'plano de saúde') THEN 'Saúde'
  WHEN LOWER(TRIM(a.type)) IN ('residencial', 'residencia', 'casa') THEN 'Residencial'
  WHEN LOWER(TRIM(a.type)) IN ('empresarial', 'empresa', 'comercial') THEN 'Empresarial'
  WHEN LOWER(TRIM(a.type)) IN ('vida', 'seguro de vida') THEN 'Vida'
  WHEN LOWER(TRIM(a.type)) IN ('viagem', 'seguro viagem') THEN 'Viagem'
  WHEN LOWER(TRIM(a.type)) IN ('odonto', 'odontologico', 'dental') THEN 'Odontológico'
  WHEN LOWER(TRIM(a.type)) IN ('consorcio', 'consórcio') THEN 'Consórcio'
  ELSE INITCAP(TRIM(a.type))
END
WHERE a.type IS NOT NULL AND TRIM(a.type) != '';

-- 4. Descobrir relações seguradoras-ramos baseado nos dados reais
INSERT INTO public.company_ramos (company_id, ramo_id, user_id)
SELECT DISTINCT
  a.insurance_company as company_id,
  r.id as ramo_id,
  a.user_id
FROM public.apolices a
JOIN public.ramos r ON r.nome = CASE 
  WHEN LOWER(TRIM(a.type)) IN ('auto', 'automotivo', 'seguro auto', 'automóvel') THEN 'Auto'
  WHEN LOWER(TRIM(a.type)) IN ('saude', 'saúde', 'plano de saude', 'plano de saúde') THEN 'Saúde'
  WHEN LOWER(TRIM(a.type)) IN ('residencial', 'residencia', 'casa') THEN 'Residencial'
  WHEN LOWER(TRIM(a.type)) IN ('empresarial', 'empresa', 'comercial') THEN 'Empresarial'
  WHEN LOWER(TRIM(a.type)) IN ('vida', 'seguro de vida') THEN 'Vida'
  WHEN LOWER(TRIM(a.type)) IN ('viagem', 'seguro viagem') THEN 'Viagem'
  WHEN LOWER(TRIM(a.type)) IN ('odonto', 'odontologico', 'dental') THEN 'Odontológico'
  WHEN LOWER(TRIM(a.type)) IN ('consorcio', 'consórcio') THEN 'Consórcio'
  ELSE INITCAP(TRIM(a.type))
END
WHERE a.insurance_company IS NOT NULL 
  AND a.type IS NOT NULL 
  AND TRIM(a.type) != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.company_ramos cr 
    WHERE cr.company_id = a.insurance_company 
    AND cr.ramo_id = r.id
  );

-- 5. Adicionar coluna ramo_id na tabela apolices (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'apolices' 
                   AND column_name = 'ramo_id') THEN
        ALTER TABLE public.apolices ADD COLUMN ramo_id UUID REFERENCES public.ramos(id);
    END IF;
END $$;

-- 6. Popular a nova coluna ramo_id baseado no mapeamento
UPDATE public.apolices 
SET ramo_id = (
  SELECT r.id 
  FROM public.ramos r 
  WHERE r.nome = CASE 
    WHEN LOWER(TRIM(apolices.type)) IN ('auto', 'automotivo', 'seguro auto', 'automóvel') THEN 'Auto'
    WHEN LOWER(TRIM(apolices.type)) IN ('saude', 'saúde', 'plano de saude', 'plano de saúde') THEN 'Saúde'
    WHEN LOWER(TRIM(apolices.type)) IN ('residencial', 'residencia', 'casa') THEN 'Residencial'
    WHEN LOWER(TRIM(apolices.type)) IN ('empresarial', 'empresa', 'comercial') THEN 'Empresarial'
    WHEN LOWER(TRIM(apolices.type)) IN ('vida', 'seguro de vida') THEN 'Vida'
    WHEN LOWER(TRIM(apolices.type)) IN ('viagem', 'seguro viagem') THEN 'Viagem'
    WHEN LOWER(TRIM(apolices.type)) IN ('odonto', 'odontologico', 'dental') THEN 'Odontológico'
    WHEN LOWER(TRIM(apolices.type)) IN ('consorcio', 'consórcio') THEN 'Consórcio'
    ELSE INITCAP(TRIM(apolices.type))
  END
  LIMIT 1
)
WHERE type IS NOT NULL 
  AND TRIM(type) != '' 
  AND ramo_id IS NULL;

-- 7. Criar função para buscar ramos de uma seguradora
CREATE OR REPLACE FUNCTION public.get_ramos_by_company(company_id_param UUID)
RETURNS TABLE(id UUID, nome TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.nome
  FROM public.ramos r
  JOIN public.company_ramos cr ON r.id = cr.ramo_id
  WHERE cr.company_id = company_id_param
  ORDER BY r.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Criar função para validar se seguradora oferece ramo
CREATE OR REPLACE FUNCTION public.validate_company_ramo(company_id_param UUID, ramo_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.company_ramos 
    WHERE company_id = company_id_param 
    AND ramo_id = ramo_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Criar view para facilitar consultas
CREATE OR REPLACE VIEW public.apolices_with_ramo_info AS
SELECT 
  a.*,
  r.nome as ramo_nome,
  c.name as company_name
FROM public.apolices a
LEFT JOIN public.ramos r ON a.ramo_id = r.id
LEFT JOIN public.companies c ON a.insurance_company = c.id;

-- 10. Comentários para documentação
COMMENT ON TABLE public.migration_ramos_log IS 'Log da migração de ramos de texto livre para estrutura normalizada';
COMMENT ON COLUMN public.apolices.ramo_id IS 'Referência para o ramo normalizado (substitui type)';
COMMENT ON FUNCTION public.get_ramos_by_company IS 'Retorna todos os ramos oferecidos por uma seguradora';
COMMENT ON FUNCTION public.validate_company_ramo IS 'Valida se uma seguradora oferece determinado ramo';

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA COM SUCESSO
-- Os dados antigos foram preservados (coluna type)
-- Os novos dados estão em ramo_id
-- =====================================================
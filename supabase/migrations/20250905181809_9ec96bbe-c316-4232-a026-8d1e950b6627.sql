-- =====================================================
-- MIGRAÇÃO SEGURA DOS DADOS EXISTENTES
-- =====================================================

-- 1. Criar tabela de mapeamento para rastreamento da migração
CREATE TABLE IF NOT EXISTS public.migration_ramos_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_type_value TEXT NOT NULL,
  new_ramo_id UUID NOT NULL,
  normalized_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Verificar se existe usuário autenticado para migração
DO $$ 
DECLARE
    sample_user_id UUID;
BEGIN
    -- Pegar o primeiro usuário válido das apólices para usar na migração
    SELECT DISTINCT user_id INTO sample_user_id 
    FROM public.apolices 
    WHERE user_id IS NOT NULL 
    LIMIT 1;
    
    IF sample_user_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuário encontrado nas apólices para fazer a migração';
    END IF;
    
    -- Salvar o ID do usuário para uso na migração
    CREATE TEMP TABLE migration_user AS SELECT sample_user_id as user_id;
END $$;

-- 3. Inserir ramos normalizados na tabela ramos
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
  (SELECT user_id FROM migration_user),
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

-- 4. Popular tabela de log com mapeamento
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

-- 5. Descobrir e criar relações seguradoras-ramos
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

-- 6. Adicionar coluna ramo_id na tabela apolices
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'apolices' 
                   AND column_name = 'ramo_id') THEN
        ALTER TABLE public.apolices ADD COLUMN ramo_id UUID REFERENCES public.ramos(id);
    END IF;
END $$;

-- 7. Popular coluna ramo_id nas apólices
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

-- =====================================================
-- MIGRAÇÃO DOS DADOS CONCLUÍDA
-- =====================================================